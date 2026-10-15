# Contributing to PrintQuote

Thanks for helping improve PrintQuote. Please open an issue before undertaking large changes.

## Local setup

Use Node.js 22 or later. Run `npm install` and `npm run dev`. The development API uses a local SQLite file; do not commit databases, `.env` files or passwords.

Before opening a pull request, run:

```sh
npm run check:release
npm test
npm run build
node --check server/index.js
```

Changes should preserve calculator-only mode, role permissions and existing data. Add tests for pricing, stock or authentication changes where possible. Describe migration and rollback impacts in your pull request.

## Release policy

Release version changes are made by maintainers. Update the root and server package versions, README, CHANGELOG and ROADMAP before tagging. See [RELEASING.md](RELEASING.md).

## Licensing

The repository needs an explicit LICENSE file chosen by the owner before external contributions can be accepted under clearly defined terms. Until then, do not assume the code is open-source licensed merely because it is publicly visible.
