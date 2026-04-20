#!/usr/bin/env bash
# Scapex full DB rebuild.
#
#   1. Snapshots a pg_dump backup into /var/backups/scapex/.
#   2. Drops the public schema and recreates it (everything wiped).
#   3. Pushes the Drizzle schema with `npm run db:push -- --force`.
#   4. Runs the idempotent seed script.
#
# DESTRUCTIVE — only run on dev. Refuses to run unless SCAPEX_REBUILD_CONFIRM=yes.
set -euo pipefail

if [[ "${SCAPEX_REBUILD_CONFIRM:-}" != "yes" ]]; then
  echo "✋ Refusing to run: set SCAPEX_REBUILD_CONFIRM=yes to confirm full DB wipe."
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌ DATABASE_URL is not set."
  exit 1
fi

# Production safety: refuse to run when NODE_ENV=production OR when the DB
# host looks like a known production host. Operator must set
# SCAPEX_ALLOW_PROD_REBUILD=yes to override (separate from the confirm gate
# on purpose — two distinct env vars to wipe a prod DB).
if [[ "${NODE_ENV:-}" == "production" ]]; then
  if [[ "${SCAPEX_ALLOW_PROD_REBUILD:-}" != "yes" ]]; then
    echo "🛑 Refusing to run: NODE_ENV=production. Set SCAPEX_ALLOW_PROD_REBUILD=yes to override."
    exit 1
  fi
  echo "⚠️  WARNING: running destructive rebuild against a PRODUCTION environment."
fi
case "${DATABASE_URL}" in
  *prod*|*production*|*live*)
    if [[ "${SCAPEX_ALLOW_PROD_REBUILD:-}" != "yes" ]]; then
      echo "🛑 Refusing to run: DATABASE_URL looks like a production target."
      echo "   Set SCAPEX_ALLOW_PROD_REBUILD=yes to override."
      exit 1
    fi
    echo "⚠️  WARNING: DATABASE_URL host matched a production keyword."
    ;;
esac

BACKUP_DIR="/var/backups/scapex"
mkdir -p "$BACKUP_DIR"
TS=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/scapeerp_${TS}.dump"

echo "🗃  1/4  Backup → $BACKUP_FILE"
pg_dump --format=custom --file="$BACKUP_FILE" "$DATABASE_URL"

echo "🧨 2/4  Dropping & recreating public schema"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

echo "📐 3/4  Pushing Drizzle schema (force)"
npm run db:push -- --force

echo "🌱 4/4  Seeding defaults"
npx tsx scripts/seed.ts

echo "✅ Rebuild complete. Backup retained at $BACKUP_FILE"
