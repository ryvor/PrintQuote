# PrintQuote — 3D Printing Cost Calculator

A responsive, English-language Vue 3 application for estimating 3D print production costs and selling prices. Inspired by the workflow of 3D Print Calculator, but implemented independently.

## Features

- Filament library with name, brand, material, colour, price per kilogram and optional purchase URL. No stock tracking.
- Multiple printer profiles with average wattage, setup time per job, post-processing time per item and machine overhead per print hour.
- Electricity rate per kWh and labour rate per hour.
- Cost calculator with grams per item, print hours/minutes per item, quantity, extra cost per item and target profit margin.
- Itemised material, energy, labour, machine overhead and extra costs.
- Recommended selling price, total profit and unit selling price.
- Saved quotes with reload, JSON export/import, GBP/EUR/USD display.
- Responsive desktop/mobile interface; no server or database required.

## Run locally

Requires Node.js 20.19+ or 22.12+ (recommended for Vite 6).

```bash
npm install
npm run dev
```

Open the local address printed by Vite (typically http://localhost:5173).

## Production build

```bash
npm run build
npm run preview
```

The `dist/` folder can be hosted on any static web server.

## Docker / 1Panel

```bash
docker compose up -d --build
```

Then open `http://YOUR_SERVER_IP:8899`. To change the port, edit `8899:80` in `docker-compose.yml`. The compose file joins the existing external `1panel-network`, so it works with your 1Panel setup. If using Docker without 1Panel, remove the `networks` sections from `docker-compose.yml`.

## Calculation rules

- Material = (grams per item ÷ 1000) × filament price/kg × quantity.
- Energy = print hours per item × quantity × printer average watts ÷ 1000 × electricity price/kWh.
- Labour = (setup minutes per job + post-processing minutes per item × quantity) ÷ 60 × hourly labour rate.
- Machine overhead = print hours per item × quantity × overhead per hour.
- Extras = extra cost per item × quantity.
- Total production cost = sum of the above.
- Selling price = total cost ÷ (1 − target profit margin / 100).
- Profit = selling price − total cost.

The calculator assumes prints run sequentially, one item's print time per item, and one setup per quote. It doesn't account for failure rate, VAT, marketplace fees, packaging or shipping unless included in the extra-cost field. The machine wattage is an average estimate, not a live measurement. Margin is capped at 99.9% for numerical safety. Currency selection changes display units only and does not convert prices.

## Storage

Everything is saved in browser `localStorage` under `printquote-v1`. This is per-browser/per-device, not shared. Use **Settings → Export backup** to download your data and **Import backup** to restore it. There is no authentication or server-side persistence.

## Disclaimer

This is an independent project and is not affiliated with czajo/3dprintcalculator. The included printer and filament records are illustrative estimates; replace them with your actual prices and measured printer power usage.


## Blueprint Studio appearance (v1.1)

Settings → Appearance & branding lets you customise the site title, subtitle, logo, accent colour, canvas colour, grid visibility and spacing. The logo is saved in localStorage (max 1 MB), along with the rest of your data.

The Vite Vue plugin is configured in `vite.config.js`, and the icon dependency is now `@lucide/vue`.
