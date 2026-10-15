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

## v1.11 authentication and Cloudflare Pages

The app now requires login. The **initial** account is `admin` / `admin`. **Change it immediately** under the user menu → My account. The initial credentials are insecure and must never be left unchanged on a public deployment. The admin can create users in Account menu → Administration. Passwords require 6+ characters, a digit and a special character. User records and hashed passwords live in the server database, never in the shared workspace JSON. Session tokens are stored hashed on the server; Remember me stores the token in browser localStorage (30-day server expiry), otherwise sessionStorage (1-day server expiry, cleared on tab/browser session end). Users share one workspace; there is no per-user data isolation. User accounts do not appear in JSON exports.

### Cloudflare Pages + D1

**Cloudflare Pages cannot run the existing Express server or use the on-disk SQLite database.** This release includes a Pages Function API and a Cloudflare D1 (SQLite-compatible) backend, using the same frontend API routes. D1 is a different database: **data is not migrated automatically** from your Cerberus SQLite file.

1. Install Wrangler: `npm install -D wrangler` (or use `npx wrangler`).
2. Create a D1 database: `npx wrangler d1 create printquote`.
3. Set `database_id` in `wrangler.toml` to the returned ID. Bind the D1 database as **DB** in your Cloudflare Pages project settings too, if configuring through the dashboard.
4. Initialise D1: `npx wrangler d1 execute printquote --remote --file=./schema.sql`.
5. Build: `npm install && npm run build`. Deploy the `dist` directory as a **Cloudflare Pages project**, including the repository's `functions/` folder (Git integration recommended). For local Pages testing: `npx wrangler pages dev dist --d1 DB=printquote` (refer to your Wrangler version's D1 local binding syntax).
6. On first login, change the default password before publishing. Use HTTPS. To transfer existing data, export a JSON backup from your local installation and import it into the Pages deployment.

The first request bootstraps `admin/admin` if the users table is empty. Cloudflare deployments should be access-restricted until this password is changed. The D1 binding and schema are required; static-only Pages deployment will not work.

Security notes: This is starter authentication, not a hardened internet-facing identity provider. Before wider public deployment, add login rate limiting / Cloudflare WAF, enforce strong initial admin password via secret provisioning, use HTTP-only secure cookies instead of browser-stored bearer tokens, add audit logging and concurrent-write protection, and consider account recovery / MFA. Existing workspace state uses last-write-wins, so simultaneous edits from multiple users can overwrite each other.

## v2.0 Workshop modules (initial release)

This release adds optional **physical spool inventory** (with manual stock movements), **product variants**, and **per-variant bill of materials**, packaging and maintenance allowances. Product sales record the selected variant and a snapshot of estimated costs. The dashboard includes a sales date filter and a simple per-product three-month weighted demand indicator (20%/30%/50%); it is not a market prediction.

To get started: enable Inventory, Advanced Costing and Forecasting in Settings; add filament/printer profiles, add physical spools in Spool Inventory, and edit a product to add variants and component costs. Spool movements are intentionally manual: a sale does not necessarily correspond to a completed print.

**Scope and limitations:** This is an incremental v2.0, not a completed migration to a relational multi-tenant system. Existing app data remains a JSON document inside SQLite or Cloudflare D1, and all users share one workspace. Existing login and role behaviour remains as in v1.11. The existing default admin/admin account is insecure for public use and must be changed. Advanced forecasting, multi-workspace isolation, audited permissions, secure cookie sessions, and automated stock consumption require further work. Back up your existing database before upgrading. No existing product data is deleted; products without variants continue to use their original costing fields.
