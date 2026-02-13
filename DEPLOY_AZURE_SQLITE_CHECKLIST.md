# Azure SQLite Deployment Checklist (Rosy Workroom)

Goal: Deploy code updates without overwriting production user data, while keeping SQLite migrations working as they do locally.

## What Is Already Implemented In This Repo
- GitHub Actions no longer deploys the full repo blindly.
- Deployment artifact excludes local DB snapshots and logs:
  - `*.db`
  - `*.db.backup`
  - `*.log`
  - local `uploads/`
- `rosy.db` and `rosy.db.backup` are removed from git tracking.

## Azure App Service Required Settings
Set these in `App Service > Configuration > Application settings`.

1. `NODE_ENV=production`
2. `DATA_DIR=/home/data`
3. `SQLITE_DB_PATH=/home/data/rosy.db`
4. Keep `ENABLE_ORYX_BUILD=true`
5. Keep `SCM_DO_BUILD_DURING_DEPLOYMENT=true`

Why: `/home` is persistent in App Service; code under deployed app path is replaced on each deploy.

## App Service Topology (SQLite-safe)
- Scale to **1 instance** only.
- Do not enable multi-instance scaling with SQLite.

## One-time Production DB Initialization
After first deploy:
1. Open app and create a new production admin/user account.
2. Confirm file is created in `/home/data/rosy.db` (via SSH/Kudu if needed).
3. Do not copy local `rosy.db` unless you explicitly want to migrate old local data.

## Validation After Every Deployment
Run this exact test:
1. Register a brand-new user in production (e.g., `deploy-check-<date>`).
2. Create sample data (note/project/task/transaction).
3. Push a tiny code-only change (e.g., text change) and let CI deploy.
4. Log in again with the new user.
5. Verify created data still exists.

Pass criteria:
- User can still authenticate.
- Previously created records are intact.
- New schema columns (if introduced) are available and app starts.

## Migration Safety Rules
- Use additive schema migrations only (add columns/tables, avoid destructive drops).
- Keep startup migration logic idempotent (`IF NOT EXISTS`, column existence checks).
- Never store production DB file in git.

## Backup Policy (Recommended)
- Schedule periodic copy of `/home/data/rosy.db` to Blob Storage.
- Keep at least daily backups and one weekly retained backup.
- Test restore at least once.

## Troubleshooting
If data appears "reset" after deploy, check:
1. `SQLITE_DB_PATH` is exactly `/home/data/rosy.db`.
2. App is single-instance.
3. No DB file is included in deployment artifact.
4. Startup logs show DB path under `/home/data`, not app root.

## Security Notes
- App now uses bearer token sessions (not trusted `X-User-ID`).
- Keep HTTPS only.
- Rotate publish profile secret if exposed.
