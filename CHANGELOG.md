# Changelog

What changed on the Aura Pharma storefront and why. Newest first. The certificate system itself is documented in [CERTIFICATIONS.md](CERTIFICATIONS.md).

> Public repo: no supplier names, supplier batches, lab task numbers or verification keys here.

## 2026-10-15 — Lab reports for 17 products and sizes

- **15 new certificates published** (AP-0003 to AP-0017) from Janoshik reports: GLP1-R 20 and 30 mg; GLP1-T 15, 30 and 60 mg; BPC-157 10 mg; TB-500 10 mg; GHK-Cu 50 and 100 mg; MOTS-c 40 mg; BPC-157 + TB-500 (5 + 5 and 10 + 10); CJC-1295 + Ipamorelin (5 + 5); KLOW 80 mg; GLOW 70 mg. With GLP1-R 10 mg (AP-0001) and Tesamorelin 10 mg (AP-0002) that's 17 certified products and sizes.
- **AP-0001 and AP-0002 re-issued** on the final template (batch ID, signature, no lab name or header contacts). AP-0002 now carries the lab's accreditation caveat and is verifiable at tjqxgd.com/coa-verify by its report number (found via the report's QR code; it had been recorded as "no verification").
- **Product page follows the selected size.** Each size shows its own certificate; a size without one says its report is coming soon instead of showing another size's report.
- **Blends** (no purity on the reports) show each ingredient's measured amount.
- **Lab reports page** lists one row per product and size; **removed from the header nav** (still in the footer).
- **Home "Independent lab reports" tile** shows BPC-157's real report instead of sample data.
- **`tools/coa/site-data.mjs`**: `data.js` REPORTS is now generated from the certificate register.
- **Docs:** CERTIFICATIONS.md extended (Janoshik specifics, site behaviour, site-data step); this changelog added.

Open: confirm with the supplier that the 2025-dated tests match the batches on sale; confirm which TB-500 (889 Da fragment vs thymosin β4) is in the 5 + 5 blend; reports still missing for the other products and sizes.

## 2026-10-14 / 15 — Certificate system (see CERTIFICATIONS.md)

- **Cloudflare R2** for PDFs: public bucket `aura-reports` (site downloads), private bucket `aura-archive` (lab originals, print copies, records). Lab PDFs removed from the repo.
- **Aura Pharma certificate generator** (`tools/coa/`): fills the template from a report's values and renders a public copy (site) and a print copy (order insert, with the sample code and the lab's verification key).
- **Template** rebuilt from the platform repo's design: Batch ID, product, sample code, tests, results, comments, analysis date, QA signature. Removed: lab name, manufacturer, supplier batch, header contact lines.
- **Batch ID** (`AP-0001`, …) replaces the lab task number on certificates and on the site; assigned in order by the **D1 register `aura-coa`**, which links each batch ID to the lab task number, key, sample, supplier batch and every file's R2 key and ETag.
- **Everything filed under the batch ID**: `aura-archive/AP-xxxx/` holds the lab original (task number in its file name), the print copy and `record.json`.
- **`lookup.mjs`**: given a batch ID, prints everything withheld from the public certificate and downloads the original, checked against the register.
- **Code names**: GLP1-R, GLP1-T, GLP1-S everywhere (site, certificates, docs); the generator refuses full compound names.
- **Site**: product page and Lab reports page show and link certificates by batch ID; Quality page and FAQ say batch IDs can be quoted to request full testing details.
- **Vercel** no longer serves the `.md` docs. LATEST_UPDATE.md (a planning chat log with private details) moved to the private platform repo.

## 2026-10-14 — Storefront

- **Catalog trimmed to 22 products** (18 removed, with their prices and vial images).
- **Testing claims match the reports**: only purity (HPLC), identity (mass spec) and measured content are claimed; endotoxin, metals, solvents, TFA, water, ISO 17025 and retention-sample claims removed. Every order ships with a printed copy of the lab report.
- **Batch lookup removed**; certificates moved onto product pages; batch and lab task numbers kept off public pages.
- **Home**: starfield and planet hero, smaller vials (hidden on mobile); "Cold-packed" and "8 tests" tiles removed (no cold shipping).
- **Mobile header**: logo mark, account (placeholder), cart with count badge, hamburger menu; hero wordmark and spacing.
- **Prototype wording removed** from footer and cart; checkout button reads "Checkout" (disabled until payments are connected).
- Earlier the same day: rebrand to Aura Pharma (logo, palette, link-preview card), entry gate with research-use confirmation, GLP1-R/-T/-S renames, re-shot vial images.
