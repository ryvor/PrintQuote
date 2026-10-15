# Changelog

## PrintQuote v2.3.1 — Natural Save Menu

- Replace the separate action and chevron buttons with one unified dropdown button.
- Show the default action in the button label: Save quote when Quotes is enabled, otherwise Save calculation.
- Mark the default action inside the menu.
- Close on outside click or tap, Escape, or action selection.
- Restore keyboard focus to the trigger after Escape.
- Preserve History as a separate button.

## PrintQuote v2.3.0 — Multi-material costing and printing

- Split Save button: Save Quote is default when Quotes are enabled; otherwise Save Calculation. History remains separate.
- Cost Calculator supports multiple filament types/colours with per-material grams.
- Product and variant editor supports multi-filament requirements.
- Record completed prints separately from sales, deducting the correct quantities from selected matching spools. All spool balances are checked before any deduction.
- Printer profiles have independent nickname, brand, series, and model fields.
- Printer catalogue API uses a bundled starter list, optionally refreshed every six hours from a trusted HTTPS JSON URL configured by PRINTER_CATALOG_URL. The bundled list is not guaranteed comprehensive or current.

### Remote catalogue format

Configure PRINTER_CATALOG_URL in your Docker `.env` to point to a trusted JSON feed. The endpoint must return an array of objects such as `{ "brand": "Bambu Lab", "series": "P1 Series", "model": "P1S", "technology": "FDM" }`. It is loaded server-side and cached for six hours. This is an optional source; without it, the bundled list is used. No public constantly-updated comprehensive catalogue is guaranteed.

### Inventory notes

Record Print is the operation that consumes spool stock; Record Sale does not. This prevents double deduction. Previous sale-linked deductions are retained as history and not retroactively changed. Stock is estimated from saved product/variant materials.

## PrintQuote v2.2.7 — Viewer Role & Design Consistency

- Administrators can create and edit Viewer accounts.
- Viewers can browse enabled pages, read records, and run temporary calculator estimates, but cannot save workspace changes.
- The API already enforces read-only access to workspace writes; the frontend now hides editing actions and prevents autosave for viewers.
- Existing User and Administrator roles are unchanged.
- Harmonised input, dropdown, slider, checkbox, focus, hover and button styling in light and dark modes.
- No database schema migration required.

## PrintQuote v2.2.6 — Ordered onboarding and administrator-only settings

- Tour now follows the actual sidebar order, respecting disabled modules and user role.
- Settings link and page are visible only to administrators.
- Backend rejects non-admin attempts to modify workspace settings.
- No database migration required.

## PrintQuote v2.2.5 — Calculation History

- Save calculator estimates independently of Quotes and Products.
- View searchable calculation history directly on the Cost Calculator page.
- Restore saved inputs and recalculate using current filament and printer rates.
- Keep original cost and selling-price snapshots for historical reference.
- Delete saved calculations (editable accounts only).
- Records are stored in the existing shared SQLite workspace state; no migration is required.