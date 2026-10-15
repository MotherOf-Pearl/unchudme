// Rewrites REPORTS in data.js from the register: one entry per current certificate, so the site always shows
// exactly what is published. Run after publishing, check the site locally, then push.
//
//   node site-data.mjs
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1');
const DATA = path.join(HERE, '../../data.js');
const WRANGLER = path.join(HERE, 'node_modules/wrangler/bin/wrangler.js');

const rows = JSON.parse(execFileSync(process.execPath, [WRANGLER, 'd1', 'execute', 'aura-coa', '--remote', '--json', '--command',
  "SELECT * FROM certificates WHERE status = 'current' ORDER BY seq"], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }))[0].results;

const q = (v) => JSON.stringify(v);
const entry = (r) => '  { ' + [
  `productId: ${q(r.product_id)}`, `certNo: ${q(r.id)}`, `size: ${q(r.size)}`, `date: ${q(r.test_date)}`, `lab: ${q(r.lab)}`,
  r.purity && `purity: ${q(r.purity)}`, r.identity && `identity: ${q(r.identity)}`, r.content && `content: ${q(r.content)}`,
  r.appearance && `appearance: ${q(r.appearance)}`, r.verify_url && `verify: ${q(r.verify_url)}`, 'pdf: `${REPORTS_URL}/' + r.public_key + '`',
].filter(Boolean).join(', ') + ' },';

const src = fs.readFileSync(DATA, 'utf8');
const nl = src.includes('\r\n') ? '\r\n' : '\n';
const start = src.indexOf('const REPORTS = [');
const end = src.indexOf('];', start);
if (start < 0 || end < 0) { console.error('REPORTS block not found in data.js'); process.exit(1); }
fs.writeFileSync(DATA, src.slice(0, start) + 'const REPORTS = [' + nl + rows.map(entry).join(nl) + nl + src.slice(end));
console.log(`data.js: ${rows.length} current certificates (${rows.map((r) => r.id).join(', ')})`);
