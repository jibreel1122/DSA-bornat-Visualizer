# Linux VPS deployment

The application works as a guest-only static learning tool without PostgreSQL. Set the variables below only when enabling optional accounts and synchronization.

## PostgreSQL

```bash
sudo -u postgres createuser --pwprompt dsa_bornat_app
sudo -u postgres createdb --owner=dsa_bornat_app dsa_bornat_visualizer
psql "$DATABASE_URL" -f db/migrations/001_accounts.sql
psql "$DATABASE_URL" -f db/migrations/002_sync_idempotency.sql
psql "$DATABASE_URL" -f db/migrations/003_user_roles.sql
```

Use a strong database password and a non-superuser account. The normalized database name mirrors the project name while remaining a valid unquoted PostgreSQL identifier. Apply every migration once, in filename order.

## Environment

Copy `.env.example` to `.env.local` and set `DATABASE_URL`, a random `AUTH_SECRET` of at least 32 bytes, `APP_URL`, `SUPPORT_EMAIL=1230872@student.birzeit.edu`, and SMTP settings. Password reset links are only sent when both `APP_URL` and `SMTP_URL` are configured. The endpoint intentionally returns a generic response when email is unavailable so it does not disclose whether an account exists.

## Build and run

```bash
npm ci
npm run check
npm run build
NODE_ENV=production npm run start
```

Run the server behind Nginx or Caddy with HTTPS. The session cookie is secure in production, so TLS termination must forward HTTPS correctly. For multiple app instances, replace the included process-local login limiter with a shared Redis or reverse-proxy rate limiter.

## Backups and privacy

Back up PostgreSQL regularly and protect backups as user data. Account deletion cascades through all stored progress, histories, saves, achievements, and sessions. Guests retain their data in browser local storage until they explicitly clear it or synchronize it after registering.
