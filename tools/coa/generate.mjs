// Aura Pharma certificate generator: fills template.html with one report's values and renders a PDF.
//
//   node generate.mjs <report.json>            -> out/<product>-<size>-<date>.pdf
//   node generate.mjs <report.json> --upload   -> also uploads it to R2 aura-reports/<product>/<size>/<date>.pdf
//
// Report files hold lab report numbers and verification keys, so keep them out of this public repo:
// research/coa/*.json (git-ignored). example.json shows the fields.
// Prints the matching REPORTS entry for data.js so the site and the certificate carry the same values.
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1');
const OUT = path.join(HERE, 'out');
const BUCKET = 'aura-reports';

const [file, ...flags] = process.argv.slice(2);
if (!file) { console.error('usage: node generate.mjs <report.json> [--upload]'); process.exit(1); }
const r = JSON.parse(fs.readFileSync(file, 'utf8'));

// ---- check the report before anything is rendered: a wrong or missing value must never reach a certificate
const REQUIRED = ['productId', 'product', 'size', 'lab', 'labReportNo', 'testDate', 'results'];
const missing = REQUIRED.filter((k) => r[k] == null || r[k] === '' || (Array.isArray(r[k]) && !r[k].length));
if (missing.length) fail(`missing ${missing.join(', ')}`);
if (!/^\d{4}-\d{2}-\d{2}$/.test(r.testDate)) fail(`testDate must be YYYY-MM-DD, got "${r.testDate}"`);
for (const [i, row] of r.results.entries()) if (!row.test || !row.result) fail(`results[${i}] needs test and result`);
if (/manufacturer|supplier/i.test(Object.keys(r).join(' '))) fail('supplier/manufacturer fields are not allowed on the certificate');

// ---- values the template can use: {{name}} is escaped text, {{{name}}} is raw HTML,
//      {{#name}}…{{/name}} is kept only when name has a value
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const longDate = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const today = new Date().toISOString().slice(0, 10);
const vals = {
  product: r.product,
  size: r.size,
  lab: r.lab,
  labReportNo: r.labReportNo,
  testDate: longDate(r.testDate),
  receivedDate: r.receivedDate ? longDate(r.receivedDate) : '',
  issuedDate: longDate(r.issuedDate ?? today),
  method: r.method ?? '',
  verifyKey: r.verifyKey ?? '',
  verifyUrl: r.verifyUrl ?? '',
  notes: r.notes ?? '',
  resultsRows: r.results.map((x) =>
    `<tr><td>${esc(x.test)}</td><td>${esc(x.method ?? '')}</td><td>${esc(x.spec ?? '')}</td><td class="result">${esc(x.result)}</td></tr>`).join(''),
};
const RAW = new Set(['resultsRows']);

let html = fs.readFileSync(path.join(HERE, 'template.html'), 'utf8')
  .replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, k, body) => (vals[k] ? body : ''))
  .replace(/\{\{\{(\w+)\}\}\}|\{\{(\w+)\}\}/g, (m, raw, txt) => {
    const k = raw ?? txt;
    if (!(k in vals)) fail(`template uses {{${k}}}, which isn't a known value`);
    return raw || RAW.has(k) ? vals[k] : esc(vals[k]);
  });

// ---- render: written next to the template so its relative paths (logo, fonts) resolve
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9.]+/g, '').replace(/^-|-$/g, '');
const name = `${r.productId}-${slug(r.size)}-${r.testDate}`;
const tmp = path.join(HERE, `.render-${process.pid}.html`);
fs.writeFileSync(tmp, html);
fs.mkdirSync(OUT, { recursive: true });
const pdf = path.join(OUT, `${name}.pdf`);
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
try {
  const page = await browser.newPage();
  await page.goto(`file:///${tmp.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0' });
  await page.pdf({ path: pdf, format: 'A4', printBackground: true, preferCSSPageSize: true });
} finally { await browser.close(); fs.rmSync(tmp, { force: true }); }
console.log(`PDF   ${path.relative(process.cwd(), pdf)}`);

// ---- optional upload to the public bucket, same key scheme as data.js
const key = `${r.productId}/${slug(r.size)}/${r.testDate}.pdf`;
if (flags.includes('--upload')) {
  const download = `Aura-Pharma-${r.product.replace(/[^A-Za-z0-9]+/g, '-')}-${slug(r.size)}-${r.testDate}.pdf`;
  execFileSync('npx', ['wrangler', 'r2', 'object', 'put', `${BUCKET}/${key}`, '--file', pdf, '--content-type', 'application/pdf',
    '--content-disposition', `attachment; filename="${download}"`, '--remote'], { stdio: 'inherit', shell: process.platform === 'win32' });
  console.log(`R2    ${BUCKET}/${key}`);
}

// ---- the matching data.js entry
const find = (re) => r.results.find((x) => re.test(x.test))?.result;
const entry = {
  productId: r.productId, size: r.size, date: r.testDate, lab: r.lab,
  purity: find(/purity/i)?.replace(/[^\d.]/g, ''), identity: find(/identity/i), content: find(/content|quantity/i),
  appearance: find(/appearance/i), verify: r.verifyUrl || undefined,
};
console.log('\ndata.js REPORTS entry:\n  ' + JSON.stringify(entry).replace(/"(\w+)":/g, '$1: ').replace(/,(?=\w+: )/g, ', ')
  .replace(/\}$/, `, pdf: \`\${REPORTS_URL}/${key}\` }`));

function fail(msg) { console.error(`${file}: ${msg}`); process.exit(1); }
