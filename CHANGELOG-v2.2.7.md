# PrintQuote v2.2.7 — Viewer Role & Design Consistency

- Administrators can create and edit Viewer accounts.
- Viewers can browse enabled pages, read records, and run temporary calculator estimates, but cannot save workspace changes.
- The API already enforces read-only access to workspace writes; the frontend now hides editing actions and prevents autosave for viewers.
- Existing User and Administrator roles are unchanged.
- Harmonised input, dropdown, slider, checkbox, focus, hover and button styling in light and dark modes.
- No database schema migration required.
