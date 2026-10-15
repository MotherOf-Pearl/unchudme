# Certifications — COA Platform

How Aura Pharma handles Certificates of Analysis (COAs): ingesting third-party lab reports, archiving the originals, generating branded certificates, tracking them in a database, and serving verifiable downloads on the storefront.

## The core principle: two copies, always

Every product lot has two documents, and they are kept separate on purpose:

1. **Original lab report (private archive).** The untouched PDF exactly as the testing lab issued it. Never modified. This is the permanent record and the source of truth for provenance. It is not public.
2. **Branded Aura Pharma COA (public).** A clean, Aura-Pharma-branded certificate generated from the values in the original. This is what customers see and download.

Both are linked to one database row, so any branded certificate can always be traced back to the exact lab report it came from.

## Architecture

```
incoming lab PDF
      │
      ├─► R2  originals/   (private)   ─ untouched archive
      │
      ├─► extract values   ─ report no, product, batch, analyte, mg, purity, dates
      │
      ├─► branded COA  ─ Aura Pharma template + logo  (see coa.html / tools)
      │
      ├─► R2  published/   (public)    ─ downloadable certificate
      │
      └─► database row     ─ metadata + links to both PDFs
                │
                └─► aurapharma.co/verify?batch=…   serves the public COA
```

### File storage — Cloudflare R2
Object storage for the PDFs. Chosen over AWS S3 because R2 charges **zero egress** (S3 charges ~$0.09/GB out, which is the real cost for a public download site), while staying S3-compatible so standard tooling works and there is no vendor lock-in. The PDFs themselves never go in the database or in git.

Bucket layout (single bucket, two prefixes):
- `originals/` — private. Raw lab reports.
- `published/` — public. Branded COAs.

### Database — metadata index
A real database holds the structured record for each report (the thing we query, track, and verify). Cloudflare D1 (serverless SQLite) keeps everything on one vendor; Postgres/Supabase is the alternative. Suggested `certifications` table:

| column | example |
|---|---|
| report_id | 204025 |
| product | Retatrutide |
| sample_id | RT10 |
| batch | ERP510002 |
| manufacturer | ERP |
| analyte / content_mg | Retatrutide / 10.60 |
| purity | 99.009 |
| test_date | 2026-07-30 |
| lab | independent 3rd-party |
| original_key | originals/204025.pdf |
| branded_url | published/aura-retatrutide-ERP510002.pdf |
| created_at | timestamp |

### Verification
A small serverless lookup (a Cloudflare Worker) answers `aurapharma.co/verify?batch=ERP510002`, returning the record and a link to the branded COA. Because the untouched original is retained, the branded numbers are always traceable to the real report. Product pages in `data.js` reference each product's batch so the current COA surfaces automatically.

### The branded template
The Aura Pharma COA is an HTML template rendered to PDF. It carries the logo in a dark header, a clinical results table, the test metadata, an "analysis performed by an independent third-party laboratory" attribution, and a "for research use only, not for human consumption" footer. See `coa.html` for the storefront COA page.

## The process (how a new COA gets published)

A new lab report is handed off with its product and batch. The pipeline then:

1. **Archives the original** to `R2 originals/` — untouched.
2. **Extracts the values** from the report (report no, product, batch, manufacturer, analyte, mg, purity, dates). For a consistent lab format this is parsed directly; for an unfamiliar format the values are confirmed before publishing so a wrong number never goes live.
3. **Generates the branded COA** from the Aura Pharma template, logo, and extracted values.
4. **Stores the branded PDF** in `R2 published/` (public).
5. **Writes the database row**, linking the metadata to both PDFs.
6. **Returns the public download link**, live on the site and verifiable at `aurapharma.co/verify`.

## Cost note
At expected volume (thousands of ~30 KB PDFs, modest traffic) storage and bandwidth sit within free tiers on R2. The cost that bites at scale on other providers is egress; R2 removes it.

## Setup / TODO
- [ ] Provision Cloudflare R2 bucket (`aura-coas`) + scoped API token (R2 read/write on that bucket only).
- [ ] Provision the database (Cloudflare D1 or Supabase) + `certifications` schema.
- [ ] `/verify` Worker/endpoint keyed by batch / report_id.
- [ ] COA generation + extraction script committed under `tools/`.
- [ ] Wire COA download + verify links into the product pages (`data.js` / `product.html`).
