# Dev helpers

Local workflow:

1. `npm run dev` — API on port 8787
2. `npx serve .` — static site (default port 3000)

Edit `testing/config.js` for URLs, sample data, or `REUSE_EVENT_CODE`.

## Scripts

| Command | What it does |
|---------|----------------|
| `npm run seed:event` | POST sample event to API, print event code |
| `npm run dev:prefill-create` | Print console snippet for the create form |
| `npm run dev:prefill-respond` | Seed (or reuse event code), print respond URL + form snippet |

Browser app config lives in `js/app/config.js`.
