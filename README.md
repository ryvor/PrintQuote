# PrintQuote Blueprint v1.4 — Embedded SQLite

Responsive Vue 3 print cost calculator with blueprint styling, custom branding, Light/Dark/Auto themes, and **one shared SQLite database file**. No separate database service is needed.

## Cerberus / 1Panel deployment

1. Ensure the external Docker network `1panel-network` exists.
2. Create the persistent data directory: `sudo mkdir -p /opt/PrintQuote/data`.
3. From this directory run `docker compose up -d --build`.
4. Visit `http://192.168.1.20:8899` (substitute your host IP).

The Compose stack runs **two containers**: `printquote` (Vue served by Nginx) and `printquote-api` (Express + embedded SQLite). Data persists in `/opt/PrintQuote/data/printquote.sqlite` on the host. Back up this file with the app stopped, or export a JSON backup from Settings. Do not mount this file into multiple running API instances.

## Local development

Run `npm install && npm run dev` in the root. Run `npm install && SQLITE_PATH=./printquote.sqlite npm start` inside `server/` in another terminal. Vite proxies `/api` to port 3001.

## Migrating from PrintQuote v1.2/v1.3 PostgreSQL

**Do not delete your existing PostgreSQL data until migration is complete.** In your old PrintQuote, go to Settings → Your data → Export backup to download a JSON file. Stop the old stack (`docker compose down`, without `-v`), deploy this new stack, then Settings → Import backup and select the JSON file. Verify your filament library, printer profiles, quotes, and branding are present. Keep the old PostgreSQL volume until satisfied.

## Limitations and security

The application has a single shared workspace, with last-write-wins saves. Multiple browsers see the same data on reload, but simultaneous edits can overwrite one another. The API has **no login**; use on a trusted LAN or Tailscale network, not exposed publicly. The SQLite database uses `sql.js` (SQLite compiled to WebAssembly), saving its database image atomically after changes; suitable for a small personal workspace, not high-write multi-user deployments.
