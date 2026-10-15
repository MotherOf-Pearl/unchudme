# Certifications — COA Platform

How Aura Pharma turns a third-party lab report into an Aura Pharma certificate of analysis, publishes it on the storefront, and keeps every certificate traceable to the lab's untouched original.

> **This repo is public** and Vercel serves the site from it. Never put supplier names, supplier batch numbers, lab task numbers, verification keys or real report values files in this file or anywhere else in the repo. All examples below use made-up numbers.

## Contents
1. [How it fits together](#how-it-fits-together)
2. [Batch ID: the one number everything hangs off](#batch-id-the-one-number-everything-hangs-off)
3. [Where everything is stored](#where-everything-is-stored)
4. [The certificate](#the-certificate)
5. [Mapping a lab report onto the certificate](#mapping-a-lab-report-onto-the-certificate)
6. [Publishing a new report](#publishing-a-new-report)
7. [Finding the original: "send me the lab work for AP-0001"](#finding-the-original-send-me-the-lab-work-for-ap-0001)
8. [The generator in detail](#the-generator-in-detail)
9. [Rules](#rules)
10. [Access and accounts](#access-and-accounts)
11. [Decisions and history](#decisions-and-history)
12. [Open items](#open-items)

## How it fits together

```
lab report PDF (the original)
      │
      ▼
research/coa/<product>-<size>-<date>.json      values copied from the original (git-ignored)
      │
      ▼
tools/coa/generate.mjs --publish --original <lab report.pdf>
      │
      ├─► D1  aura-coa                 register row, keyed by the batch ID (AP-0001 …)
      ├─► R2  aura-archive/AP-0001/    the original, the print copy, record.json   (private)
      ├─► R2  aura-reports/AP-0001.pdf the public copy                             (public)
      └─► prints the data.js entry ──► product page + Lab reports page show "Batch AP-0001" and link the public copy
```

Three things are kept apart on purpose:

| | what | who sees it |
|---|---|---|
| **Original** | the lab's report exactly as issued, never modified | Aura Pharma only; sent to a customer on request |
| **Print copy** | the Aura Pharma certificate with the sample code and the lab's verification key | ships in the box with every order |
| **Public copy** | the Aura Pharma certificate without those | downloadable on the site |

Only the batch currently on sale has a public copy. Past batches are archived (their folder stays) and there is no public lookup.

## Batch ID: the one number everything hangs off

Every published certificate gets an Aura Pharma **batch ID**: `AP-0001`, `AP-0002`, … assigned in order by the register when it is published. It is the only reference number printed on the certificate and shown on the site, and it replaces the lab's task number. Customers quote it; everything else is looked up from it.

| | example (made up) | printed? | where it's kept |
|---|---|---|---|
| Batch ID | `AP-0007` | both copies + site | everywhere: register key, R2 folder and file names |
| Lab task / report number | `123456` or `ABC10-20260101S0001` | never | register, `record.json`, the original's file name |
| Lab verification key | `X1Y2Z3W4V5U6` | print copy only | register, `record.json` |
| Sample code (the lab's abbreviation of the compound + size) | `XX10` | print copy only | register, `record.json` |
| Supplier batch | `SUP000001` | never | register, `record.json` |
| Lab name | `Example Analytical` | never on the certificate | register, `record.json`, `data.js` |

**Why not derive the batch ID from the task number with a formula?** Considered and rejected: task numbers aren't always numeric (some labs use codes like `ABC10-20260101S0001`), two labs can issue the same number, and anyone who worked out the formula could reverse every certificate to the lab's number (and from there the supplier). The link is kept by storage instead (folder name, file name, `record.json`, register), which can't leak.

**Why not use Cloudflare's file ID?** R2 has none: a file is identified only by its path (key) and its ETag, an MD5 fingerprint of its contents. The ETag can't be printed on the certificate (printing it changes the file, which changes the ETag) and it changes on every re-issue. So the batch ID is the reference, and the register stores each file's ETag to prove which exact file belongs to it.

## Where everything is stored

All on Cloudflare (R2 for files, D1 for the register). R2 charges no egress fees, which is the main cost for a public download site.

### R2 buckets
R2 makes a whole bucket public or private (no per-folder permissions), hence two buckets:

| bucket | access | holds |
|---|---|---|
| `aura-reports` | public at `https://pub-9777663d84154689864064a7d51bc5e5.r2.dev` (move to `reports.aurapharma.us` once the domain is on Cloudflare) | the public copy of each product's current certificate |
| `aura-archive` | private, no public address | one folder per batch ID |

```
aura-reports/AP-0007.pdf                                public copy: the site's download (removed when archived)

aura-archive/AP-0007/lab-original-<task no>.pdf          the lab's untouched report; the task number is in the file name
aura-archive/AP-0007/print.pdf                           print copy: the order insert
aura-archive/AP-0007/record.json                         the register row: task number, key, sample, supplier batch,
                                                         lab, dates, results, every file's key + ETag
```

The folder name, the original's file name and `record.json` each tie the batch ID to the original on their own, without the database. Public copies are uploaded with `Content-Disposition: attachment; filename="Aura-Pharma-AP-0007-<Product>-<size>.pdf"` so they download rather than open in a tab.

### D1 register `aura-coa`
One row per certificate, keyed by batch ID (table `certificates`, schema in `tools/coa/schema.sql`):

- **identity:** `id` (AP-0007), `seq` (7), product id, product, size, `status` (`current` = on sale, `archived` = past batch)
- **lab (private):** lab, lab task number, sample code, supplier batch, verification key and URL
- **dates:** ordered, received, analysed, issued
- **results:** identity, purity, content, appearance (what the site shows)
- **files:** for the original, the public copy and the print copy, the R2 key and ETag

A lab report is registered once (unique on lab + task number), so publishing it again re-issues it under the same batch ID.

### Site
`data.js` → `REPORTS` holds one entry per current certificate. It is written by `tools/coa/site-data.mjs` straight from the register (never edited by hand), e.g.:

```js
{ productId: "bpc-157", certNo: "AP-0007", size: "10 mg", date: "2026-01-12", lab: "…", purity: "99.12",
  identity: "…", content: "10.41 mg", verify: "…", pdf: `${REPORTS_URL}/AP-0007.pdf` }
```

`REPORTS_URL` is the public bucket's address. Blends have no `purity`; their `content` lists each ingredient (e.g. "BPC-157 4.95 mg · TB-500 4.82 mg").

What the site shows:
- **Product page gallery:** thumbnails of the vial and, when the selected size has a certificate, the certificate picture. Choosing the certificate shows it in the main window with a "Download PDF" button; clicking it opens the picture full size.
- **Product page:** the lab report panel follows the **selected size**: "Batch AP-0007 · 10 mg · Tested …", the results, and a "Download certificate AP-0007 (PDF)" button. A size without its own report says its report is coming soon (it never shows another size's certificate). Products with no real report at all still show sample data marked "Sample".
- **Lab reports page (`coa.html`):** one row per real report (product and size), then the products still on sample data. Since 2026-10-15 this page is **not in the header nav**; it is still linked from the footer and the home page. A card-style redesign (search, purity, labelled vs measured, view certificate) is planned.
- **Home page:** the "Independent lab reports" tile shows BPC-157's real report.

### Local only (git-ignored)
- `research/coa/*.json`: the report values files (they hold task numbers and keys)
- `tools/coa/out/`: rendered PDFs and lookups
- `research/lab-reports.json`: the first private record, from before the register; the register is now the record
- `research/coa/janoshik-intake.json`: every Janoshik report received, as read from the images (task, sample, supplier batch, dates, results, key), with which product and size it maps to and any flags

## The certificate

`tools/coa/template.html`, rebuilt from `docs/AuraPharma_COA_template.pdf` in the platform repo. US Letter, one page.

| part | content |
|---|---|
| Header | Aura Pharma logo (`logo.png`), "CERTIFICATE OF ANALYSIS" |
| Top row | **Batch ID** · Testing ordered · Sample received (dates shown only when the lab gives them) |
| Product table | product name, CAS, molecular formula, molecular weight, sequence (from the catalog in `data.js`, rows hidden when unknown), quantity, form, storage; sample code on the print copy only |
| Sample description | optional, hidden when empty |
| Tests requested | what the lab ran |
| Results | test table: Test item · Specification · Method (only when the lab states methods) · Result. Specifications are Aura Pharma's: purity NLT 98.0%, content against the labelled amount, blend ingredients against their labelled amounts. Identity is added from the report when no result row states it. A conclusion line appears only when purity meets NLT 98.0%. Never lists tests the lab didn't run. |
| Comments | extra detail (e.g. mass-spec ions, specification), the lab's caveats, then: print copy → "Verify this result on the laboratory's own website … with key …"; public copy → "Testing details for this batch are printed on the copy that ships with your order, and available on request quoting the batch ID." |
| Bottom | Analysis conducted (date) · Signature (`signature.png`) over "Reviewed by Aura Pharma QA" |
| Footer | research-use-only line; "Analysis performed by an independent third-party laboratory. Aura Pharma issued this certificate from that laboratory's report, which is kept on file." |

The page is fixed at one US Letter page; the generator stops if a certificate would be taller (shorten the notes or tests requested). Each public copy is also saved as a picture, `aura-reports/AP-xxxx.webp` (1224 × 1584), used by the product page gallery.

Not on the certificate, by decision: the lab's name, the lab task number, the manufacturer/supplier, the supplier batch, the contact lines that were in the template's header, sample photos, QR codes, chromatograms.

## Mapping a lab report onto the certificate

Each lab lays its report out differently. The values file is the mapping: copy each value from the original into the field it belongs to. Formats seen so far:

| certificate / values-file field | Janoshik Analytical | tjqxgd.com (partner lab) |
|---|---|---|
| `labReportNo` (register only) | "Task #…" | report number at the top, e.g. `ABC10-…` |
| `verifyKey` / `verifyUrl` | "Verification key" at the bottom, janoshik.com/verify | the report number itself, tjqxgd.com/coa-verify (the report's QR code links to it; "Authentication Code" is blank) |
| `sampleId` | "Sample" | compound code before the slash in "Compound" (e.g. `XX10`) |
| `batch` (register only) | "Batch" | none |
| — (never mapped) | "Client" / "Manufacturer" | "Manufacturer" (N/A) |
| `orderedDate` | "Testing ordered" | none |
| `receivedDate` | "Sample received" | "Sample Received" |
| `testDate` | "Analysis conducted" | "Analysis date" |
| `testsRequested` | "Tests requested" (rename compounds to code names) | method from the HPLC-MS pages (wavelengths, ESI MS) |
| `results` | the results table: compound + mg, purity | Result table: peptide weight, purity, mass spectrum, appearance |
| `notes` | — | specifications, detected ions, and the report's Important Notice that neither it nor its partner lab holds CMA/CNAS accreditation |
| `lab` (register + site) | Janoshik Analytical | Independent partner lab (report issued by tjqxgd.com) |

A new lab format gets a column here the first time it's used. Values are copied by hand and checked by a person; automatic extraction (PDF text, or OCR for photographed reports like Janoshik's) is not built yet.

### Janoshik specifics
- **Links.** Janoshik test pages follow `janoshik.com/tests/<task>-<sample code>_<verification key>`, so a link alone gives the task, sample code and key (keep links private: they contain the key). Janoshik's firewall blocks automated access, so reports are downloaded by hand from those pages as `Test Report #<task>.png`.
- **Originals are images.** Each PNG is converted to a one-page PDF (same pixels) and filed as the original with `--original`.
- **Sample codes** are the compound abbreviation and size (RT = GLP1-R, TR / T = GLP1-T, BP = BPC-157, BB = BPC-157 + TB-500, CU / GHK = GHK-Cu, MOTS = MOTS-c, KLOW / GLOW = the blends). Older reports prefix the supplier's name (`ERP RT10`); that prefix is stripped before it goes on a certificate.
- **Two generations.** 2025 reports (tasks 81xxx–89xxx) list "Assessment of a peptide vial or vials" and share one supplier batch number per shipment; 2026 reports (204xxx) list the specific test and a batch per product.
- **Blends** report each ingredient's amount and no purity. Lab comments (e.g. KLOW's "KPV: 12.49", no unit given) are carried as "Laboratory comment: …".
- **Reports commissioned by another seller** whose results Aura Pharma has bought (client shown as that seller, with their watermark) are used like any other; the client is recorded in the register only.
- **Which report is current:** the newest test for each product and size. Older tests of the same product and size are kept in the intake file as history.

## Publishing a new report

From `tools/coa/` (first time: `npm install`):

1. **Values file.** Copy the values from the original into `research/coa/<product>-<size>-<date>.json`, using `tools/coa/example.json` as the pattern and the mapping table above.
2. **Preview.** `node generate.mjs ../../research/coa/<file>.json` → `out/draft-…pdf` and `out/draft-…-print.pdf` (batch ID shows as AP-DRAFT; an already-registered report previews under its own number). Check every value against the original.
3. **Publish.** `node generate.mjs ../../research/coa/<file>.json --publish --original "<path to the lab's PDF>"`. In one go it:
   - assigns the next batch ID (or reuses the existing one for a re-issue);
   - renders both copies;
   - uploads the original, the print copy and `record.json` to `aura-archive/AP-xxxx/`, and the public copy to `aura-reports/AP-xxxx.pdf`;
   - writes the register row with every file's ETag;
   - archives the product's previous certificate (same product and size) and removes its public copy.

   `--original` is required for a new certificate. It refuses to publish a report older than the one on sale.
4. **Site.** `node site-data.mjs` rewrites `REPORTS` in `data.js` from the register. Check the product page (each size) and `coa.html` locally, then push to `main`.
5. **Print.** Print `out/AP-xxxx-print.pdf` for the order inserts.

## Finding the original: "send me the lab work for AP-0001"

```
cd tools/coa
node lookup.mjs AP-0001          (also accepts ap1, AP-1)
```

Prints everything the public certificate withholds (lab, task number, verification key and where to verify, sample code, supplier batch, dates, results) and downloads the lab's original and the print copy into `out/lookup/AP-0001/`, checking each against the ETag recorded at publish ("matches the register").

Or, without the tool: Cloudflare dashboard → R2 → `aura-archive` → folder `AP-0001` (the original is `lab-original-<task no>.pdf`; `record.json` has the rest).

Before sending a customer the original, check what it shows: some labs print the client/manufacturer, which names the supplier. Often the task number and verification key are enough, since the customer can check the result on the lab's own site.

Sending a file as an expiring link (presigned URL) needs an R2 API token; see Access.

## The generator in detail

| file | |
|---|---|
| `generate.mjs` | checks a values file, fills the template, renders the public and print copies, and with `--publish` files and registers them |
| `lookup.mjs` | everything withheld for one batch ID, plus its files |
| `site-data.mjs` | rewrites `REPORTS` in `data.js` from the register's current certificates |
| `template.html` | the certificate layout |
| `logo.png`, `signature.png` | header logo (from the template PDF) and the QA signature |
| `schema.sql` | the register's table |
| `example.json` | values-file format, made-up values |
| `package.json` | puppeteer-core (rendering) and wrangler (R2 + D1), run locally so nothing depends on the shell |

**Template placeholders.** `{{name}}` is escaped text, `{{{resultsRows}}}` is the results rows, `{{#name}}…{{/name}}` is kept only when `name` has a value. Values: `certNo` (batch ID), `product`, `size`, `testDate`, `receivedDate`, `orderedDate`, `issuedDate` (dates as `30 JUL 2026`), `sampleDescription`, `testsRequested`, `notes`; print copy only: `sampleId`, `verifyKey`, `verifyUrl`; public copy only: `onRequest`. `lab` and `batch` exist but aren't used by the current design. An unknown placeholder stops the run.

**Values file.** Required: `productId`, `product`, `size`, `lab`, `labReportNo`, `testDate`, `results`. Optional: `sampleId`, `batch`, `orderedDate`, `receivedDate`, `issuedDate`, `sampleDescription`, `testsRequested`, `identity`, `notes`, `verifyKey`, `verifyUrl`, `contentSummary` (blends: the site's content line, used when no result has `kind: "content"`). Each result is `{ test, result, kind }`; `kind` (`identity`, `purity`, `content`, `appearance`) picks which row feeds which field of the `data.js` entry.

**Checks (the run stops on any).** A required field missing; a date not `YYYY-MM-DD`; a result without test or result; any supplier or manufacturer field; a full compound name where a code name is required (see Rules); the public copy containing the task number, sample code, supplier batch or key; the print copy containing the task number (unless the lab verifies by it, as tjqxgd does).

## Rules

- Copy values exactly from the original. Never alter the lab's PDF; it is archived untouched.
- The certificate says the analysis was performed by an independent third-party laboratory and that Aura Pharma issued it from that lab's report. The lab's name and report number are held in the register and given on request.
- Carry the lab's verification (on the print copy) wherever the lab offers it. Never call a result "verified" through an Aura Pharma page.
- Keep the lab's own caveats about its results (e.g. accreditation status) in Comments.
- No supplier or manufacturer on any certificate or page.
- Code names only: GLP1-R, GLP1-T, GLP1-S, on the site, the certificates and in docs. GLP1-S is the catalog's own compound, not semaglutide; where a lab report names semaglutide, keep that name.
- Aura Pharma's own layout and branding, never a lab's.

## Access and accounts

- **Cloudflare:** Jack's account. R2 buckets `aura-reports`, `aura-archive`; D1 database `aura-coa` (id `c67e9c9e-a163-47bc-9351-de5635fe8b12`).
- **Login used by the tools:** the wrangler browser login on Jack's Windows machine (`npx wrangler login`; revoke with `npx wrangler logout`). It covers the whole account.
- **Planned:** a scoped R2 API token (Object Read & Write on the two buckets only) for presigned links and automation elsewhere, stored outside the repo.

## Decisions and history

- **Storage:** Cloudflare R2 over S3 or Vercel Blob (no egress fees), D1 for the register to keep everything on one vendor.
- **Two buckets** because R2 permissions are per bucket; a single bucket with a private folder would have made the originals public.
- **Lab PDFs are never published raw.** The site first linked the lab PDFs from the repo, then from R2; both were replaced by the Aura Pharma certificate. The lab PDFs were removed from the repo (they remain in git history).
- **Two copies** (public and print) so verification keys and sample codes aren't public while the customer still gets them in the box, as the Quality page promises.
- **Batch ID replaces the lab task number** on certificates and site (first called "certificate number"); sequential `AP-0001` rather than a formula or Cloudflare ETag (see above).
- **Everything filed under the batch ID** (`aura-archive/AP-xxxx/`), with the task number in the original's file name and a `record.json` copy of the register row, so the original can be found from the batch ID with or without the database.
- **Template:** from the platform repo's PDF. Removed: lab name, manufacturer, supplier batch, header contact lines. Added: product, signature, lab caveats in Comments.
- **tjqxgd verification** was first recorded as "no verification key". The report's QR code links to tjqxgd.com/coa-verify, which confirms the report by its report number, so that number is now carried as the verification key on the print copy and the site says the result can be verified there.
- **Accreditation:** the tjqxgd report states neither it nor its partner lab holds CMA/CNAS accreditation; that line is carried in the certificate's Comments.

## Open items

- [ ] Scoped R2 API token, for presigned links to originals
- [ ] Attach aurapharma.us to Cloudflare; serve `aura-reports` at `reports.aurapharma.us` and update `REPORTS_URL`
- [ ] Footer domain: the certificate footer says aurapharma.co; the site uses aurapharma.us
- [ ] Real reports for the other products (they show sample data)
- [ ] Automatic value extraction from lab PDFs (text for tjqxgd, OCR for Janoshik), with human checking
