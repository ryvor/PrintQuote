# PrintQuote v2.1.2 — Self-hosted Docker + SQLite

PrintQuote is a modular 3D-printing cost, product, inventory and sales analytics application. This edition is designed **only for self-hosting with Docker**. It does not require Cloudflare Pages, D1, Postgres, or any external database service.

## Install on Cerberus / 1Panel

From the extracted `printquote-vue` directory:

```bash
sudo mkdir -p /opt/PrintQuote/data
sudo chown -R 1000:1000 /opt/PrintQuote/data  # only if your host permissions require it

docker compose up -d --build
```

Open `http://YOUR-SERVER-IP:8899` (for example `http://192.168.1.20:8899`).

The application consists of two containers: Nginx serves the Vue interface and proxies `/api/` requests to the private Express API. The Express API persists SQLite data at **`/opt/PrintQuote/data/printquote.sqlite`** on the Docker host. The API port is **not** exposed to the host. Docker Compose creates its own internal network; no pre-existing `1panel-network` is required.

## First login

Initial username: `admin`  
Initial password: `admin`

**Change the default password immediately** from the user menu before allowing anyone else access. New user passwords require at least six characters, one number and one special character. An administrator can add users and assign Admin, Manager and Viewer roles. These credentials are for initial setup only and are unsafe on a publicly accessible deployment.

## Existing installations / upgrades

1. Stop your existing containers: `docker compose down` (do **not** add `-v`).
2. Back up the database while the API is stopped:
   `sudo cp /opt/PrintQuote/data/printquote.sqlite /opt/PrintQuote/data/printquote.sqlite.bak`
3. Replace the project files with this release, retaining `/opt/PrintQuote/data`.
4. Run `docker compose up -d --build`.

The API creates its tables automatically and retains the existing SQLite database, user accounts, product data, variants, inventory and sales. **Do not delete the data directory**. Existing data is held in an `app_state` JSON record inside the local SQLite file, while users, sessions and activity history have separate SQL tables. This release does not claim to migrate all workspace records into relational tables.

## Local development

```bash
npm install
npm run dev
```

Vite runs on port 5173, Express on port 3001, and the development database is `server/printquote-dev.sqlite`.

## Features

- Modular workspace: enable or disable Dashboard, Quotes, Products, Filaments, Printers, Sales Analytics, Inventory, Advanced Costing and Forecasting.
- Cost calculator, saved products and quotes, product variants and per-variant components, packaging and maintenance costs.
- Filament profiles, physical spool inventory, stock adjustments and optional deductions when recording sales.
- Sales records, dashboard profitability analytics and basic weighted demand forecasts (heuristics, **not** external market predictions).
- Login, Remember me, user menu with initials, role-based access (Admin / Manager / Viewer) and basic activity history.

## Operational and security notes

- The SQLite file must be writable by the API container. Back up while the API is stopped to ensure a consistent snapshot.
- User sessions are bearer tokens stored in browser storage. This is **not** yet a hardened internet-facing authentication system; use a private LAN, Tailscale or an appropriately protected HTTPS reverse proxy. Change `admin/admin` immediately.
- All users share one workspace. Simultaneous edits are last-write-wins; there is no per-record conflict resolution.
- No Cloudflare D1 or Cloudflare Pages configuration is included. Cloudflare Tunnel is optional if you later choose to expose the self-hosted service.

### v2.1.3 sign-in appearance fix
The login page automatically follows the browser/operating system light or dark preference. Its Sign in button uses an explicit high-contrast background and text colour in both modes. In-app appearance settings remain unchanged.

## Version management (v2.2)

Administration → Versions & updates lists **locally installed release packages**, displays each release's README, and allows admins to schedule upgrades or downgrades. Every administrator sees a dismissible update notice independently when a newer locally installed version is available.

**Operator setup:** Store each trusted, reviewed release's extracted `printquote-vue` folder in `/opt/PrintQuote/releases/vX.Y.Z/` (containing `README.md`, `docker-compose.yml`, source files). Install v2.2 itself there too. The API mounts this directory read-only. The UI cannot upload or execute arbitrary packages.

**Scheduled deployments require a host-side runner.** Copy `scripts/apply-scheduled.mjs` to `/opt/PrintQuote/updater/apply-scheduled.mjs`, install its `sql.js` dependency in that directory, and run it from host cron (e.g. every minute) with `PRINTQUOTE_ROOT=/opt/PrintQuote`. The runner executes `docker compose -p printquote ... up -d --build` on the selected trusted release. Do not mount `/var/run/docker.sock` into the public web or API containers. The runner requires permission to run Docker and access the database.

**Important:** Before switching versions, take a complete backup. Older releases may not understand newer database formats; a downgrade does not automatically reverse migrations. The runner copies the database to `printquote.before-vVERSION-TIMESTAMP.sqlite` before deploying. Rollback of the database, if needed, is a separate manual recovery operation. Never deploy an untrusted release folder: Compose files can execute host-level actions when run by an administrator.

This feature checks locally provisioned releases; it does not discover releases from the internet. A schedule records the requested change, but the host runner must be configured for it to execute. Existing `admin`, `manager`, and `viewer` roles remain; only admins can manage releases.


## v2.2.1: Account editing and email notifications

Administrators can edit usernames, names, email addresses and roles. All account edits require a working SMTP configuration; an email notification is sent to the user's updated email before changes are saved. Password resets generate a random temporary password on the API server and email it directly to the user; the API never returns it. Existing sessions are revoked after reset. Passwords are hashed in SQLite.

Copy `.env.example` to `.env`, configure SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD, SMTP_FROM and restart `docker compose up -d --build`. Never commit `.env` to Git. The default admin has no email; set it in Administration before using email password reset.

**Security note:** Emailing temporary passwords is less secure than sending a short-lived, single-use password setup link. The temporary password should be changed immediately. Mail delivery is required for changes; if SMTP fails the change is not saved. If mail succeeds but a subsequent database write fails, contact your administrator.


## v2.2.2 — Update preferences and automatic deployments

Administration → Versions & updates now supports Major (default), Minor and Patch update levels, plus an **Automatic updates** toggle (off by default). The selected level is exact: Major requires the first version number to increase; Minor requires the same major and a higher minor; Patch requires the same major/minor and a higher patch. Only higher versions in the trusted local releases directory are eligible. Manual scheduled downgrades remain possible.

With auto-update enabled, the **host-side** `scripts/apply-scheduled.mjs` runner chooses the newest eligible installed release when it runs. Set it up as a host cron job (e.g. every 10 minutes) with `PRINTQUOTE_ROOT=/opt/PrintQuote`; Node and `sql.js` must be available on the host. The runner requires permission to run Docker Compose. It creates a database backup before deploying and records completed deployments. For existing installations, set `PRINTQUOTE_CURRENT_VERSION=2.2.2` on the runner's first invocation if `/opt/PrintQuote/current-version` does not exist. After a successful deployment, it updates that file automatically.

Every signed-in user checks the running application version once a minute and receives a refresh prompt when it changes. This uses browser-local last-seen version tracking. Existing users already on a different version when first opening a browser will not receive a retroactive notification.

**Caution:** Automatic deployments are not a substitute for testing releases. Database schema downgrades are not guaranteed to work. This application uses a file-exporting `sql.js` SQLite implementation; simultaneous database writes from the API and the host updater can race. Schedule updates during quiet periods and ensure a tested backup and restore procedure.

## v2.2.3 — Login/startup hotfix

Fixed initial administrator creation when the `users` table has an `email` column. The SQL statement now names the seven required columns explicitly, leaving `email` nullable. Previously, starting with an empty database could fail with `table users has 8 columns but 7 values were supplied`, preventing the API from starting and causing login requests to fail. Existing user accounts and data are not reset.

For development, start with `npm run dev` and inspect the API terminal output. For Docker, rebuild using `docker compose up -d --build` and inspect `docker compose logs api` (service name may vary).
