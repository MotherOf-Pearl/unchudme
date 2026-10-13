# Based Chems — storefront prototype

Static site (no build step). Open `index.html` in a browser.

- `data.js` — catalog: one listing per compound, sizes/blends as options. Sample lot/COA data is placeholder.
- `prices.js` — generated. Each option's price is the average single-vial price across 10 competitor sites (`research/competitor-prices.json`). Options no competitor sells show "Price on request".
- `app.js` / `styles.css` — shared header, footer, researcher gate, cart and page renderers.
- `media/` — rendered vial photos and the home-page hero shot.

## Regenerate
- Prices: `node research/apply-pricing.mjs`
- Vial photos: `cd tools/vials && npm i three puppeteer-core && node render.mjs all` (hero shot: `node render.mjs hero`)

Prototype only: checkout is not connected, and all certificate data is sample data.

## Deploy (Vercel)
Import the GitHub repo in Vercel → Framework preset **Other**, no build command, output directory = repo root. `vercel.json` turns on clean URLs (`/shop`, `/product?id=bpc-157`) and long-term caching for `media/`; `.vercelignore` keeps `tools/` and `research/` off the deployed site.
