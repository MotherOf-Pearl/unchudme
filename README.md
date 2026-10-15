# Aura Pharma (aurapharma.us) — storefront prototype

Static site (no build step). Open `index.html` in a browser.

- `data.js` — catalog: one listing per compound, sizes/blends as options. `REPORTS` (real lab reports) is generated from the certificate register by `tools/coa/site-data.mjs`; products without a report show sample data marked "Sample".
- `prices.js` — generated. Each option's price is the average single-vial price across 10 competitor sites (`research/competitor-prices.json`). Options no competitor sells show "Price on request".
- `stock.js` — vials on hand per option, edited by hand. Drives the In stock / Backordered / Ships in ~7 days badges. Unlisted options are ordered from the wholesaler on demand.
- `app.js` / `styles.css` — shared header, footer, researcher gate, cart and page renderers.
- `media/` — rendered vial photos and the home-page hero shot.

## Docs
- [CERTIFICATIONS.md](CERTIFICATIONS.md) — the certificate system: lab reports, batch IDs, Cloudflare storage, generator, publishing, lookups.
- [CHANGELOG.md](CHANGELOG.md) — what changed and why.

## Regenerate
- Prices: `node research/apply-pricing.mjs`
- Certificates and the site's report list: see CERTIFICATIONS.md → Publishing a new report.
- Vial photos: `cd tools/vials && npm i three puppeteer-core && node render.mjs all` (hero shot: `node render.mjs hero`)

Not yet live for sales: checkout is not connected. Real lab reports cover some products and sizes; the rest still show sample data.

## Deploy (Vercel)
Import the GitHub repo in Vercel → Framework preset **Other**, no build command, output directory = repo root. `vercel.json` turns on clean URLs (`/shop`, `/product?id=bpc-157`) and long-term caching for `media/`; `.vercelignore` keeps `tools/` and `research/` off the deployed site.
