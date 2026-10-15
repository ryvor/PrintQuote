# PrintQuote roadmap

This is a proposed development plan, not a commitment or a list of already implemented features. Features remain modular so calculator-only installations stay lightweight.

## Detailed milestones — v2.4.2 through v3.0

| Version | Milestone | Acceptance criteria |
| --- | --- | --- |
| **2.4.2** | Accuracy insights | Date-range and minimum-sample filters; per-printer accuracy trend; warnings for sparse/outlier-heavy data. |
| **2.4.3** | Print record corrections | Edit mistakes safely; reversible inventory movements; audit trail for stock changes. |
| **2.5.0** | Relational SQLite migration | Versioned migrations for products, variants, filaments, spools, sales and print runs; safe upgrade from JSON workspace. |
| **2.5.1** | Concurrency safety | Transactions and optimistic concurrency checks; no silent overwrites across simultaneous users. |
| **2.5.2** | Data recovery | In-app backup validation, restore preview and recovery documentation. |
| **2.6.0** | Costing precision | Per-variant bills of materials, scrap/support accounting, energy calibration and optional VAT rules. |
| **2.6.1** | Quote comparison | Compare saved calculations, historical snapshots and current costs side by side. |
| **2.7.0** | Spool reconciliation | Split spool usage, returns, weighed spool adjustments and low-stock planning. |
| **2.7.1** | Purchasing insights | Cost per usable gram, supplier history and restock suggestions. |
| **2.8.0** | Analytics refresh | Filters by product, variant, printer and period; profit/volume comparisons. |
| **2.8.1** | Forecast validation | Backtest demand estimates; show uncertainty and insufficient-data states. |
| **2.9.0** | Collaboration hardening | Role-scoped API access, immutable audit events and secure session cookies. |
| **2.9.1** | Release reliability | Staged updates, verified rollback compatibility and database migration checks. |
| **3.0.0** | Stable workshop release | Tested upgrade path, coherent UI/accessibility, documented API and end-to-end Docker tests. |

## Between v3.0 and v4.0 — minor milestones

- **3.1:** Saved costing templates and configurable pricing policies.
- **3.2:** Batch costing and CSV imports/exports.
- **3.3:** Advanced printer utilization and downtime insights.
- **3.4:** Multi-location inventory and purchasing.
- **3.5:** Optional per-workspace data separation and team collaboration.
- **3.6:** Extended forecasting and seasonal analysis with honest confidence reporting.
- **3.7:** API/webhook integration for external slicers and printers (opt-in).
- **3.8:** Reporting, scheduled exports and archival tools.
- **3.9:** Performance, security and migration stabilization.
- **4.0:** Mature, extensible workshop platform with stable plugin/API contracts.

## Future possibilities

- Optional integrations with OctoPrint, Moonraker and slicer project files.
- Barcode/QR identification of filament spools.
- Printer energy measurements from smart plugs.
- Private, on-device predictive costing where enough quality data exists.
- Multi-currency purchasing and accounting exports.
- Fully offline-capable personal edition, separate from shared Docker deployment.

Roadmap entries are proposals and can be reprioritized based on user feedback.
