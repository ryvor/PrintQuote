# PrintQuote v1.5 — Minimal UI + embedded SQLite

Vue 3 print cost calculator with light/dark/auto themes, custom branding, responsive sidebar, and shared SQLite data.

## Local development on Hydra

```bash
npm install
npm run dev
```

`npm install` installs both frontend and server dependencies. `npm run dev` now starts **both** the API on port 3001 and Vite on port 5173, fixing the previous `/api/state ECONNREFUSED` error. The local development database is stored at `server/printquote-dev.sqlite` and is separate from the Docker database.

## Docker / 1Panel on Cerberus

```bash
sudo mkdir -p /opt/PrintQuote/data
docker compose up -d --build
```

Open `http://192.168.1.20:8899`. Docker uses `1panel-network` and stores data at `/opt/PrintQuote/data/printquote.sqlite`. Keep the existing data directory when upgrading.

**Security:** There is no authentication. Keep the application on your private LAN or Tailscale network; do not expose it publicly. Export backups in Settings or back up the SQLite file while the API is stopped.
