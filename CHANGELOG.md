# Changelog

All notable changes to PrintQuote are collected here. Historical entries below are consolidated from prior release notes.

## 2.4.4 — Docker Frontend Build Hotfix

- Fix Docker frontend image build failing with `ENOENT /app/server/package.json`.
- Skip the root `postinstall` lifecycle script in the frontend-only image; the API image continues to install its own dependencies.
- Add a regression test for Dockerfile install behaviour.
- No application data or database schema changes.

## 2.4.3 — CI & Release Hotfix

- Accept both `## 2.4.3` and `## [2.4.3]` changelog headings in release validation and release-note generation.
- Avoid failing the publication workflow when a GitHub Release was already created manually; upload release assets instead.
- Add tests for both changelog formats and missing versions.
- Keep the existing Docker/SQLite deployment unchanged.

## 2.4.2 — 2026-10-15 — Release Infrastructure

- Add GitHub Actions CI for frontend compilation, Node tests, API syntax checks, Docker Compose validation and image builds.
- Add tag-triggered GitHub Releases with source ZIP/tar.gz archives and notes generated from the consolidated changelog.
- Publish separate versioned web and API Docker images to GitHub Container Registry.
- Add prebuilt-image Docker Compose configuration and release operator instructions.
- Add contributing and security guidance, issue templates, and initial release metadata tests.
- Remove unused Cloudflare Pages/D1 deployment artifacts; keep the application and SQLite data model unchanged.

**Operator action:** Configure GitHub Actions permissions and select an explicit software licence before promoting the project as open source.



## 2.4.1 — 2026-10-15 — Printer Accuracy Profiles

- Aggregate successful print runs by printer, comparing actual versus baseline estimated filament grams and print duration.
- Require at least five valid successful runs before showing learned recommendations; failed and incomplete runs are excluded.
- Show percentage differences on each printer profile.
- Optionally apply learned material and time correction factors to future calculator and product production costs, capped to 0.5×–1.5× to limit outliers.
- Keep previously saved estimates and print history unchanged.
- Add a consolidated changelog, refreshed README, and ROADMAP.md.

**Note:** This is a simple aggregate heuristic, not predictive machine learning. Learned factors may be misleading when printer settings or materials vary.


---

# PrintQuote v2.4.0 — Print History & Cost Accuracy

- Optional Print History module in workspace presets and sidebar.
- Record successful or failed print runs from saved products and variants.
- Capture actual per-filament grams, elapsed print time, quantity and notes.
- Compare actual production costs against frozen estimated snapshots.
- Optionally deduct **actual** filament usage from selected spools (including failed prints).
- Display historical variance and wasted filament totals.
- Restrict changes to Admin/User roles; Viewers can inspect records.
- All records persist in the existing self-hosted SQLite workspace document.

## Important
- Database backup recommended before upgrade.
- Historical stock deductions are not reversed when deleting a print record.
- Cost calculations are estimates based on configured rates; no measured power consumption is collected.

---

# PrintQuote v2.3.1 — Natural Save Menu

- Replace the separate action and chevron buttons with one unified dropdown button.
- Show the default action in the button label: Save quote when Quotes is enabled, otherwise Save calculation.
- Mark the default action inside the menu.
- Close on outside click or tap, Escape, or action selection.
- Restore keyboard focus to the trigger after Escape.
- Preserve History as a separate button.

---

# PrintQuote v2.3.0 — Multi-material costing and printing

- Split Save button: Save Quote is default when Quotes are enabled; otherwise Save Calculation. History remains separate.
- Cost Calculator supports multiple filament types/colours with per-material grams.
- Product and variant editor supports multi-filament requirements.
- Record completed prints separately from sales, deducting the correct quantities from selected matching spools. All spool balances are checked before any deduction.
- Printer profiles have independent nickname, brand, series, and model fields.
- Printer catalogue API uses a bundled starter list, optionally refreshed every six hours from a trusted HTTPS JSON URL configured by PRINTER_CATALOG_URL. The bundled list is not guaranteed comprehensive or current.

## Remote catalogue format

Configure PRINTER_CATALOG_URL in your Docker `.env` to point to a trusted JSON feed. The endpoint must return an array of objects such as `{ "brand": "Bambu Lab", "series": "P1 Series", "model": "P1S", "technology": "FDM" }`. It is loaded server-side and cached for six hours. This is an optional source; without it, the bundled list is used. No public constantly-updated comprehensive catalogue is guaranteed.

## Inventory notes

Record Print is the operation that consumes spool stock; Record Sale does not. This prevents double deduction. Previous sale-linked deductions are retained as history and not retroactively changed. Stock is estimated from saved product/variant materials.

---

# PrintQuote v2.2.7 — Viewer Role & Design Consistency

- Administrators can create and edit Viewer accounts.
- Viewers can browse enabled pages, read records, and run temporary calculator estimates, but cannot save workspace changes.
- The API already enforces read-only access to workspace writes; the frontend now hides editing actions and prevents autosave for viewers.
- Existing User and Administrator roles are unchanged.
- Harmonised input, dropdown, slider, checkbox, focus, hover and button styling in light and dark modes.
- No database schema migration required.

---

# PrintQuote v2.2.6 — Ordered onboarding and administrator-only settings

- Tour now follows the actual sidebar order, respecting disabled modules and user role.
- Settings link and page are visible only to administrators.
- Backend rejects non-admin attempts to modify workspace settings.
- No database migration required.

---

# PrintQuote v2.2.5 — Calculation History

- Save calculator estimates independently of Quotes and Products.
- View searchable calculation history directly on the Cost Calculator page.
- Restore saved inputs and recalculate using current filament and printer rates.
- Keep original cost and selling-price snapshots for historical reference.
- Delete saved calculations (editable accounts only).
- Records are stored in the existing shared SQLite workspace state; no migration is required.
