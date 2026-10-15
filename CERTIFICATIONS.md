# Certifications — COA Platform

How Aura Pharma handles lab reports (Certificates of Analysis): archiving the originals, publishing the current batch's report on the storefront, and, once it's built, generating an Aura Pharma certificate from the lab's values.

Each section is marked **Live** (set up and in use) or **Planned** (agreed, not built yet).

> This repo is public and Vercel serves its files. Never put supplier names, batch numbers, lab task numbers or verification keys in this file or anywhere else in the repo.

## The core principle: two copies, always

Every tested batch has two kinds of record, kept apart on purpose:

1. **Original lab report (private).** The untouched PDF exactly as the lab issued it, plus the batch number, lab task number and verification key. Never modified. This is the permanent record and the source of truth.
2. **Public report (on the site).** What customers see: headline results on the product page and a PDF download for the batch currently on sale.

Past batches are not published and there is no public lookup. Batch and task numbers are given to a customer only on request.

## Architecture

```
incoming lab PDF
      │
      ├─► R2  aura-archive   (private bucket)  ─ untouched original + private record
      │
      ├─► values typed into data.js REPORTS    ─ purity, identity, content, date, lab
      │
      ├─► R2  aura-reports   (public bucket)   ─ PDF for the batch on sale
      │
      └─► product page + Lab reports page show the results and link the PDF
```

### File storage — Cloudflare R2 (Live)
Account: jackborman9@gmail.com. R2 charges no egress fees, which is the main cost for a public download site, and it's S3-compatible.

R2 makes a whole bucket public or private (there are no per-folder permissions), so there are **two buckets**:

| bucket | access | holds |
|---|---|---|
| `aura-reports` | public, `https://pub-9777663d84154689864064a7d51bc5e5.r2.dev` (move to `reports.aurapharma.us` once the domain is on Cloudflare) | the PDF for each product's current batch |
| `aura-archive` | private, no public address | untouched originals of every batch, `lab-reports.json` (batch, task, key per report) |

Object keys: `<product-id>/<size>/<test-date>.pdf`, e.g. `glp1-r/10mg/2026-07-30.pdf`. The same key is used in both buckets. Public PDFs are uploaded with `Content-Disposition: attachment; filename="Aura-Pharma-<Product>-<size>-<date>.pdf"` so they download instead of opening in a tab.

PDFs never go in git. The local private record is `research/lab-reports.json` (git-ignored); keep it in step with the copy in `aura-archive`.

### Site data — `data.js` (Live)
There is no database yet. Each published report is one entry in `REPORTS` in `data.js`:

```js
{ productId: "glp1-r", size: "10 mg", date: "2026-07-30", lab: "…", purity: "99.009",
  identity: "…", content: "10.60 mg", verify: "…", pdf: `${REPORTS_URL}/glp1-r/10mg/2026-07-30.pdf` }
```

`REPORTS_URL` (top of the block) is the public bucket's address. A real report replaces that product's sample lot. Products without a real report still show sample data marked "Sample" and need real reports before launch.

### Database (Planned)
When the number of reports outgrows `data.js`, move the records to Cloudflare D1 (or Supabase). Suggested `certifications` table: report_id, product, size, batch, lab, analyte, content_mg, purity, test_date, original_key, public_key, created_at. Batch, report_id and verification key stay private (not exposed to the site).

### Aura Pharma certificate generator (Live; template is a stand-in)
`tools/coa/` fills an HTML template with one report's values and renders an Aura Pharma-branded PDF with Chrome (Puppeteer), the same way `tools/vials/` renders the vial images.

| file | what it is |
|---|---|
| `template.html` | the certificate layout. **Stand-in design**, to be replaced; keep the placeholders. |
| `generate.mjs` | reads a report file, checks it, fills the template, saves `out/<product>-<size>-<date>.pdf`, optionally uploads it, and prints the matching `data.js` entry |
| `example.json` | the report-file format, with fake values |

Report files hold lab report numbers and verification keys, so they live in `research/coa/<product>-<size>-<date>.json` (git-ignored), never in `tools/coa/`. Generated PDFs go to `tools/coa/out/` (git-ignored).

Placeholders: `{{name}}` is text (HTML-escaped), `{{{resultsRows}}}` is the results table rows, and `{{#name}}…{{/name}}` is a section kept only when `name` has a value. Available values: product, size, lab, labReportNo, testDate, receivedDate, issuedDate, method, verifyKey, verifyUrl, notes, resultsRows. A placeholder the generator doesn't know stops the run.

Checks before rendering (the run stops on any of them): required fields missing (productId, product, size, lab, labReportNo, testDate, results), a date not in YYYY-MM-DD, a result row without a test or result, or any supplier/manufacturer field.

Rules for the certificate:
- copy the values exactly from the original;
- credit the testing lab and its report number, and carry the lab's verification key where the lab offers one;
- use Aura Pharma's own layout and branding, never the lab's;
- don't list the supplier/manufacturer;
- only call it "verifiable" via the lab's own verification, not an Aura Pharma page.

## The process (Live): publishing a new batch's report

1. Upload the untouched original to `aura-archive`:
   `npx wrangler r2 object put aura-archive/<product>/<size>/<date>.pdf --file <pdf> --content-type application/pdf --remote`
2. Add the batch number, lab task number and verification key to `research/lab-reports.json` and upload it to `aura-archive/lab-reports.json`.
3. Write the report file `research/coa/<product>-<size>-<date>.json` (format: `tools/coa/example.json`), copying the values from the original.
4. Generate and upload the certificate: `cd tools/coa && node generate.mjs ../../research/coa/<file>.json --upload`. It renders the PDF, uploads it to `aura-reports/<product>/<size>/<date>.pdf` with the download filename set, and prints the `data.js` entry.
   To publish the lab's own PDF instead, upload it by hand:
   `npx wrangler r2 object put aura-reports/<product>/<size>/<date>.pdf --file <pdf> --content-type application/pdf --content-disposition 'attachment; filename="Aura-Pharma-<Product>-<size>-<date>.pdf"' --remote`
5. Delete the previous batch's PDF from `aura-reports` (its original is already in `aura-archive`).
6. Paste the printed entry over that product's entry in `REPORTS` in `data.js`. Check the product page and `coa.html` locally, then push to `main`.
7. Print the certificate for the order inserts.

For an unfamiliar lab format, confirm the values with a person before publishing so a wrong number never goes live.

## Sending a past batch's report on request

Look up the batch in `lab-reports.json`, then send the customer a presigned link to the original in `aura-archive` that expires after a few days. Presigned links need an R2 API token (Access Key ID + Secret, from **R2 → Manage API tokens**, Object Read on `aura-archive`); the wrangler browser login can't create them. **Token not created yet.**

## Access

- **Wrangler login** (OAuth) on Jack's Windows machine: full account access. Revoke with `npx wrangler logout`.
- **Planned:** a scoped R2 token (Object Read & Write on the two buckets only) for automation and presigned links, stored outside the repo.

## Setup / TODO
- [x] R2 buckets `aura-reports` (public) and `aura-archive` (private)
- [x] Current reports (GLP1-R, Tesamorelin) uploaded and linked from `data.js`
- [ ] Scoped R2 API token (for automation and presigned links)
- [ ] Attach aurapharma.us to Cloudflare; serve `aura-reports` at `reports.aurapharma.us`, update `REPORTS_URL`
- [ ] Real reports for the other products (they show sample data)
- [x] `tools/coa/` generator
- [ ] Final certificate design in `tools/coa/template.html`
- [ ] Database, when `data.js` gets unwieldy
