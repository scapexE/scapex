#!/bin/bash
# Scapex Production Deploy Script
# Usage: ./deploy.sh
# Always uploads index.html + all hashed assets + server bundle

set -e

SERVER="root@187.124.166.164"
PASS="Scape@ERP2025"
REMOTE="/var/www/scapex"

echo "📦 Building..."
npm run build

echo "🚀 Uploading to production..."

# Remove old hashed assets to avoid stale files
sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no $SERVER \
  "rm -f $REMOTE/dist/public/assets/index-*.js $REMOTE/dist/public/assets/index-*.css"

# Upload ALL three: index.html (MUST always upload!), JS, CSS, server
sshpass -p "$PASS" scp -o StrictHostKeyChecking=no \
  dist/public/index.html \
  $SERVER:$REMOTE/dist/public/index.html

sshpass -p "$PASS" scp -o StrictHostKeyChecking=no \
  dist/public/assets/index-*.js \
  dist/public/assets/index-*.css \
  $SERVER:$REMOTE/dist/public/assets/

sshpass -p "$PASS" scp -o StrictHostKeyChecking=no \
  dist/index.cjs \
  $SERVER:$REMOTE/dist/

echo "🔄 Restarting PM2..."
sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no $SERVER \
  "pm2 delete scapex && pm2 start $REMOTE/ecosystem.config.cjs && pm2 save"

echo ""
echo "✅ Deploy complete! Verifying..."
sleep 3

# Verify: check HTML hash matches actual files
HTML_HASH=$(sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no $SERVER \
  "grep -o 'assets/index-[^\"]*\.js' $REMOTE/dist/public/index.html")
ACTUAL_FILE=$(sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no $SERVER \
  "ls $REMOTE/dist/public/assets/index-*.js | xargs basename")

if [[ "$HTML_HASH" == "assets/$ACTUAL_FILE" ]]; then
  echo "✅ Hash match confirmed: $ACTUAL_FILE"
else
  echo "❌ MISMATCH! HTML: $HTML_HASH | Actual: $ACTUAL_FILE"
  exit 1
fi

sshpass -p "$PASS" ssh -o StrictHostKeyChecking=no $SERVER "pm2 list | grep scapex"
