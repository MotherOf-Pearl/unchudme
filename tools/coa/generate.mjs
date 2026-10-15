// Aura Pharma certificate generator: fills template.html with one report's values and renders the PDFs.
//
//   node generate.mjs <report.json>                        preview: out/<name>.pdf + out/<name>-print.pdf
//   node generate.mjs <report.json> --publish --original <lab report.pdf>
//       assigns the certificate number (AP-0001 …) in the D1 register aura-coa, renders, and files everything under it:
//         public copy -> R2 aura-reports/AP-0001.pdf                          (what the site links to)
//         original    -> R2 aura-archive/AP-0001/lab-original-<task no>.pdf   (the lab's untouched report, the source)
//         print copy  -> R2 aura-archive/AP-0001/print.pdf                    (order insert)
//         record      -> R2 aura-archive/AP-0001/record.json                  (the register row, incl. the ETags)
//       then records the row in the register. The previous certificate for the same product and size becomes
//       archived and its public copy is taken off aura-reports (its archive folder stays).
//       Publishing the same lab report again re-issues it under its existing number (--original optional then).
//       The register keeps each PDF's R2 ETag (MD5 of the file), tying the number to the exact files stored.
//
// Both copies carry our certificate number. The public copy leaves out the sample ID, batch and verification key
// (given on request); the print copy has them. The lab's task number is never printed: it's in the register,
// record.json and the original's file name, so AP-0001 always leads back to the source report.
// Report files hold those numbers, so keep them out of this public repo: research/coa/*.json (git-ignored).
// example.json shows the fields. Prints the matching REPORTS entry for data.js so the site and the certificate agree.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1');
const OUT = path.join(HERE, 'out');
const BUCKET = 'aura-reports', ARCHIVE = 'aura-archive', DB = 'aura-coa';
const WRANGLER = path.join(HERE, 'node_modules/wrangler/bin/wrangler.js');

const [file, ...flags] = process.argv.slice(2);
if (!file) { console.error('usage: node generate.mjs <report.json> [--publish [--original <lab.pdf>]]'); process.exit(1); }
const publish = flags.includes('--publish');
const original = flags.includes('--original') ? flags[flags.indexOf('--original') + 1] : null;
if (original && !fs.existsSync(original)) fail(`--original: no file at ${original}`);
const r = JSON.parse(fs.readFileSync(file, 'utf8'));

// ---- check the report before anything is rendered: a wrong or missing value must never reach a certificate
const REQUIRED = ['productId', 'product', 'size', 'lab', 'labReportNo', 'testDate', 'results'];
const missing = REQUIRED.filter((k) => r[k] == null || r[k] === '' || (Array.isArray(r[k]) && !r[k].length));
if (missing.length) fail(`missing ${missing.join(', ')}`);
for (const k of ['testDate', 'receivedDate', 'orderedDate', 'issuedDate'])
  if (r[k] != null && !/^\d{4}-\d{2}-\d{2}$/.test(r[k])) fail(`${k} must be YYYY-MM-DD, got "${r[k]}"`);
for (const [i, row] of r.results.entries()) if (!row.test || !row.result) fail(`results[${i}] needs test and result`);
if (/manufacturer|supplier/i.test(Object.keys(r).join(' '))) fail('supplier and manufacturer fields are not allowed on the certificate');
// house naming: these compounds only ever appear under their code names (semaglutide is not GLP1-S, so it stays)
const CODE = { retatrutide: 'GLP1-R', tirzepatide: 'GLP1-T', sermorelin: 'GLP1-S' };
const named = JSON.stringify(r).match(new RegExp(Object.keys(CODE).join('|'), 'i'));
if (named) fail(`write ${CODE[named[0].toLowerCase()]} instead of "${named[0]}"`);

// ---- the data.js fields, shared by the register and the printed entry
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9.]+/g, '');
// each result row may carry kind: identity | purity | content | appearance, which is what the site shows
const find = (kind) => r.results.find((x) => x.kind === kind)?.result;
const site = { purity: find('purity')?.replace(/[^\d.]/g, ''), identity: r.identity ?? find('identity'), content: find('content') ?? r.contentSummary, appearance: find('appearance') };
const today = new Date().toISOString().slice(0, 10);

// ---- certificate number from the register: the lab report's existing number, else the next one (only when publishing)
const sql = (v) => (v == null || v === '' ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);
const d1 = (query) => {
  const out = execFileSync(process.execPath, [WRANGLER, 'd1', 'execute', DB, '--remote', '--json', '--command', query], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return JSON.parse(out)[0].results;
};
const existing = d1(`SELECT id, seq, issued_date, original_key, original_etag FROM certificates WHERE lab = ${sql(r.lab)} AND lab_task_no = ${sql(r.labReportNo)}`)[0];
if (publish && !existing && !original) fail('a new certificate needs --original <lab report.pdf>: the source it is issued from');
let id = existing?.id, seq = existing?.seq;
const newer = d1(`SELECT id, test_date FROM certificates WHERE product_id = ${sql(r.productId)} AND size = ${sql(r.size)} AND test_date > ${sql(r.testDate)}`);
if (publish && newer.length) fail(`${newer[0].id} (tested ${newer[0].test_date}) is newer for this product and size; publishing this one would replace it on the site`);
if (!id && publish) { seq = (d1('SELECT COALESCE(MAX(seq), 0) AS n FROM certificates')[0].n) + 1; id = `AP-${String(seq).padStart(4, '0')}`; }
const issued = r.issuedDate ?? existing?.issued_date ?? today;
console.log(`No.   ${id ?? 'AP-DRAFT (assigned on --publish)'}${existing ? ' (re-issue)' : ''}`);

// ---- R2 keys: everything filed under the certificate number
const name = id ?? `draft-${r.productId}-${slug(r.size)}-${r.testDate}`;
const no = id ?? 'AP-DRAFT';
const keys = {
  public: `${no}.pdf`,
  print: `${no}/print.pdf`,
  original: `${no}/lab-original-${String(r.labReportNo).replace(/[^A-Za-z0-9-]+/g, '')}.pdf`,
  record: `${no}/record.json`,
};

// ---- values the template can use: {{name}} is escaped text, {{{name}}} is raw HTML,
//      {{#name}}…{{/name}} is kept only when name has a value
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const longDate = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
  .toUpperCase().replace('SEPT', 'SEP');
const vals = {
  certNo: id ?? 'AP-DRAFT',
  product: r.product,
  size: r.size,
  lab: r.lab,
  testDate: longDate(r.testDate),
  receivedDate: r.receivedDate ? longDate(r.receivedDate) : '',
  orderedDate: r.orderedDate ? longDate(r.orderedDate) : '',
  issuedDate: longDate(issued),
  sampleId: r.sampleId ?? '',
  batch: r.batch ?? '',
  sampleDescription: r.sampleDescription ?? '',
  testsRequested: r.testsRequested ?? '',
  verifyKey: r.verifyKey ?? '',
  verifyUrl: r.verifyUrl ?? '',
  notes: r.notes ?? '',
  onRequest: '',
  // two columns as on the template, padded to at least three rows
  resultsRows: [...r.results, ...Array(Math.max(0, 3 - r.results.length)).fill({ test: '', result: '' })]
    .map((x) => `<tr><td>${esc(x.test)}</td><td>${esc(x.result)}</td></tr>`).join(''),
};
const RAW = new Set(['resultsRows']);
const template = fs.readFileSync(path.join(HERE, 'template.html'), 'utf8');
const fill = (v) => template
  .replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, k, body) => (v[k] ? body : ''))
  .replace(/\{\{\{(\w+)\}\}\}|\{\{(\w+)\}\}/g, (m, raw, txt) => {
    const k = raw ?? txt;
    if (!(k in v)) fail(`template uses {{${k}}}, which isn't a known value`);
    return raw || RAW.has(k) ? v[k] : esc(v[k]);
  });
const versions = {
  '': fill({ ...vals, sampleId: '', batch: '', verifyKey: '', verifyUrl: '', onRequest: 'yes' }),
  '-print': fill(vals),
};
// neither copy may carry the lab task number (except on the print copy when the lab verifies by it, as tjqxgd does);
// the public copy must not leak what it leaves out
for (const [suffix, html] of Object.entries(versions))
  for (const s of (suffix ? (r.verifyKey === r.labReportNo ? [] : [r.labReportNo]) : [r.labReportNo, r.sampleId, r.batch, r.verifyKey]).filter(Boolean))
    if (html.includes(esc(s))) fail(`${suffix ? 'print' : 'public'} copy contains "${s}"`);

// ---- render: written next to the template so its relative paths (logo, fonts) resolve
const tmp = path.join(HERE, `.render-${process.pid}.html`);
fs.mkdirSync(OUT, { recursive: true });
const pdfs = {};
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
try {
  const page = await browser.newPage();
  for (const [suffix, html] of Object.entries(versions)) {
    fs.writeFileSync(tmp, html);
    await page.goto(`file:///${tmp.split(path.sep).join('/')}`, { waitUntil: 'networkidle0' });
    pdfs[suffix] = path.join(OUT, `${name}${suffix}.pdf`);
    await page.pdf({ path: pdfs[suffix], printBackground: true, preferCSSPageSize: true });
    console.log(`PDF   ${path.relative(process.cwd(), pdfs[suffix])}`);
  }
} finally { await browser.close(); fs.rmSync(tmp, { force: true }); }

// ---- publish: upload, then record it in the register
if (publish) {
  const download = `Aura-Pharma-${id}-${r.product.replace(/[^A-Za-z0-9]+/g, '-')}-${slug(r.size)}.pdf`;
  const wr = (...args) => execFileSync(process.execPath, [WRANGLER, 'r2', 'object', ...args, '--remote'], { stdio: ['ignore', 'ignore', 'inherit'] });
  // returns the file's MD5, which is the ETag R2 gives a single-part upload
  const put = (dest, f, type = 'application/pdf', disposition = null) => {
    wr('put', dest, '--file', f, '--content-type', type, ...(disposition ? ['--content-disposition', disposition] : []));
    const etag = crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex');
    console.log(`R2    ${dest}  etag ${etag}`);
    return etag;
  };
  const original_etag = original ? put(`${ARCHIVE}/${keys.original}`, original) : existing.original_etag;
  const original_key = original ? keys.original : existing.original_key;
  const public_etag = put(`${BUCKET}/${keys.public}`, pdfs[''], 'application/pdf', `attachment; filename="${download}"`);
  const print_etag = put(`${ARCHIVE}/${keys.print}`, pdfs['-print']);
  const row = {
    id, seq, product_id: r.productId, product: r.product, size: r.size, status: 'current',
    lab: r.lab, lab_task_no: r.labReportNo, sample_id: r.sampleId, batch: r.batch, verify_key: r.verifyKey, verify_url: r.verifyUrl,
    ordered_date: r.orderedDate, received_date: r.receivedDate, test_date: r.testDate, issued_date: issued,
    ...site, original_key, original_etag, public_key: keys.public, print_key: keys.print, public_etag, print_etag,
  };
  // a copy of the row next to the PDFs, so the archive folder explains itself without the database
  const recordFile = path.join(OUT, `${id}-record.json`);
  fs.writeFileSync(recordFile, JSON.stringify({ ...row, buckets: { public: BUCKET, archive: ARCHIVE }, written: new Date().toISOString() }, null, 2));
  put(`${ARCHIVE}/${keys.record}`, recordFile, 'application/json');
  // the certificate this one replaces comes off the site; its archive folder stays
  const replaced = d1(`SELECT id, public_key FROM certificates WHERE product_id = ${sql(r.productId)} AND size = ${sql(r.size)} AND id <> ${sql(id)} AND status = 'current'`);
  const cols = Object.keys(row);
  d1(`INSERT INTO certificates (${cols.join(', ')}) VALUES (${cols.map((c) => sql(row[c])).join(', ')})
      ON CONFLICT(id) DO UPDATE SET ${cols.filter((c) => c !== 'id').map((c) => `${c} = excluded.${c}`).join(', ')}, updated_at = datetime('now');
      UPDATE certificates SET status = 'archived', updated_at = datetime('now')
        WHERE product_id = ${sql(r.productId)} AND size = ${sql(r.size)} AND id <> ${sql(id)} AND status = 'current';`);
  console.log(`D1    ${DB}: ${id} recorded${existing ? ' (updated)' : ''}`);
  for (const old of replaced) {
    if (old.public_key) { wr('delete', `${BUCKET}/${old.public_key}`); console.log(`R2    ${BUCKET}/${old.public_key} removed (${old.id} archived)`); }
  }
}

// ---- the matching data.js entry
const entry = { productId: r.productId, certNo: id ?? 'AP-DRAFT', size: r.size, date: r.testDate, lab: r.lab, ...site, verify: r.verifyUrl || undefined };
console.log('\ndata.js REPORTS entry:\n  ' + JSON.stringify(entry).replace(/"(\w+)":/g, '$1: ').replace(/,(?=\w+: )/g, ', ')
  .replace(/\}$/, `, pdf: \`\${REPORTS_URL}/${keys.public}\` }`));

function fail(msg) { console.error(`${file}: ${msg}`); process.exit(1); }
