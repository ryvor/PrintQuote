# PrintQuote Blueprint v1.2

Vue 3 cost calculator with a shared PostgreSQL database, responsive blueprint styling and light/dark/auto themes.

## Deploy on Cerberus / 1Panel

1. Create `/opt/PrintQuote/postgres` (ensure Docker can write to it).
2. Ensure external Docker network `1panel-network` exists.
3. Copy `.env.example` to `.env`, replace `DB_PASSWORD` with a strong password (letters/numbers recommended for DATABASE_URL compatibility).
4. Run `docker compose up -d --build`.
5. Open `http://192.168.1.20:8899` (replace with your host IP).

Frontend nginx proxies `/api` to the API container; the API stores all settings, filaments, printers, quotes and uploaded logo data in PostgreSQL. The database directory is `/opt/PrintQuote/postgres`. Back it up regularly.

## Development

Start PostgreSQL/API using Docker Compose, or run API locally with `DATABASE_URL=... npm start` from `server/`. In the project root: `npm install && npm run dev`. Vite proxies `/api` to `localhost:3001`.

## Important

This is a **single shared workspace**, not a multi-user system. Concurrent edits from different browsers can overwrite one another (last write wins). The server has **no authentication**; keep it on a trusted LAN or VPN. Do not expose it directly to the public internet. The first load now reads the server database, not localStorage. To migrate old browser data, export JSON from the old version and import it into the new version. Theme preference is shared across devices; `Auto` uses each device's system theme.
