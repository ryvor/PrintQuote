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

### v1.8 — Slate-blue colour refresh
Layered blue, slate and accent-tinted backgrounds, softly graded cards, richer active navigation, and lighter dark mode. Existing workspace colours remain configurable; use Settings → Reset colours to apply the new defaults to existing installations.

### v1.8.2 colour audit
- Unified hover and focus colours across navigation, Settings, controls, forms and add cards.
- Active navigation stays accented on hover in light and dark mode.
- Destructive hover stays red.

## v1.9 — costing, products, and sales
- Dashboard with recorded revenue, estimated gross profit, six-month chart, best-selling products and recent sales.
- Calculator: Save quote primary button + dropdown to save a product; add saved products as quote line items.
- Products: live unit cost and gross margin from current filament, printer and business rates; load into calculator, add to quote, or record a sale.
- Saved quotes and recorded sales keep price/cost snapshots. Product costs are live, while their manually entered selling prices remain fixed.
- Sales forecast is a **simple heuristic** based on recorded monthly unit volume, not an external market forecast. Requires data in two previous months.
- Existing databases automatically acquire an empty `sales` array. Back up your SQLite file before upgrading.

## v1.10 Modular workspace
Settings → Workspace features provides three presets and seven independent switches. Cost Calculator and Settings are always present. Disabling a page hides its navigation and associated actions without deleting saved data. Filament stock is optional and manually maintained (sales do not automatically deduct material). Feature preferences are persisted in the same shared SQLite state as other settings.
