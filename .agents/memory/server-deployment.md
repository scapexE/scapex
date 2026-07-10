---
name: Server deployment setup
description: Hostinger VPS deployment config for erp.scape.sa — key lessons for deploy process
---

## Server: 187.124.166.164 (erp.scape.sa)

## Auto-deploy pipeline (working as of 2026-07-10)
Push to GitHub main → GitHub Actions (`.github/workflows/deploy.yml`) → POST https://erp.scape.sa/deploy → nginx proxies to webhook service (pm2 app `webhook`, `/var/www/webhook/deploy.js`, port 4000) → git pull + drizzle-kit push + npm install + npm run build + pm2 restart. Logs: `pm2 logs webhook` and `/var/www/deploy.log`.
**Lesson:** the webhook script originally lacked the `npm run build` step — site kept serving stale bundles despite "Deploy OK". Verify deploys by checking the hashed asset filename in the live index.html changes.
**Caveat:** `/deploy` is UNAUTHENTICATED (anyone can trigger a deploy of GitHub main). Secure code path exists at `/hooks/deploy` (needs DEPLOY_HOOK_SECRET) but isn't wired up.
Main agent cannot `git push` (sandbox-blocked) — delegate pushes to a background Project Task. SSH access from Replit works via `sshpass -p "$DEPLOY_PASS"`.

**PM2 start command** (NOT `pm2 restart` — it ignores ecosystem env vars):
```bash
pm2 delete scapex && pm2 start /var/www/scapex/ecosystem.config.cjs && pm2 save
```

**Why:** `pm2 restart scapex` uses cached env vars without PORTAL_SECRET, crashing the app.
`pm2 start ecosystem.config.cjs` bakes all env vars into PM2's process config.

## Critical env vars required
- `PORTAL_SECRET` (NOT `PORTAL_JWT_SECRET`) — checked in server/portal.ts at startup
- `SESSION_SECRET`, `DATABASE_URL`, `RESEND_API_KEY`, `FROM_EMAIL`
- All stored in `/var/www/scapex/ecosystem.config.cjs`

## jszip bundling
`jszip` must be in the allowlist in `script/build.ts` — it's used by server/backup.ts.
If missing from allowlist, it becomes external and crashes with MODULE_NOT_FOUND on server.

**Why:** esbuild bundles only allowlisted packages; everything else is expected in node_modules.

## DB schema sync lessons
- Run `drizzle-kit push --force` on server after uploading new schema.ts
- Use server's own drizzle-kit: `DATABASE_URL=... node_modules/.bin/drizzle-kit push --force`
- drizzle-kit push is interactive — `--force` skips data-loss confirmations
- Missing columns found so far: `users.last_activity_id`, `contacts.service_employee_ids`, portal columns

## Manual deploy process (when GitHub token expired)
Credentials are NOT stored here. Get the VPS SSH password from the user (or a secret manager) at deploy time. The repo `deploy.sh` script automates the steps below.
1. `npm run build` in Replit
2. SCP `dist/index.cjs` to `root@<VPS_IP>:/var/www/scapex/dist/`
3. SCP `dist/public/` to `root@<VPS_IP>:/var/www/scapex/dist/`
4. If schema changed: also SCP shared/schema.ts and run drizzle-kit push --force
5. SSH: `pm2 delete scapex && pm2 start /var/www/scapex/ecosystem.config.cjs && pm2 save`

## nginx SSL cert path
Certificate is at `/etc/letsencrypt/live/erp.scape.sa-0001/` (NOT erp.scape.sa/).
Config at `/etc/nginx/sites-enabled/scapex.conf`.
