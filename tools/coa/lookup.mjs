// Answer "send me the lab work for AP-0001": everything withheld from the public certificate, plus the files.
//
//   node lookup.mjs AP-0001
//
// Reads the register row (D1 aura-coa), downloads the lab's untouched original and the print copy from
// R2 aura-archive/AP-0001/ into out/lookup/AP-0001/, and checks each file's MD5 against the ETag recorded at
// publish, so you know the original you're sending is the one the certificate was issued from.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { execFileSync } from 'node:child_process';

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1');
const WRANGLER = path.join(HERE, 'node_modules/wrangler/bin/wrangler.js');
const run = (args) => execFileSync(process.execPath, [WRANGLER, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const arg = (process.argv[2] ?? '').trim().toUpperCase();
const m = arg.match(/^(?:AP-?)?(\d{1,6})$/);
if (!m) { console.error('usage: node lookup.mjs AP-0001'); process.exit(1); }
const id = `AP-${m[1].padStart(4, '0')}`;

const row = JSON.parse(run(['d1', 'execute', 'aura-coa', '--remote', '--json', '--command', `SELECT * FROM certificates WHERE id = '${id}'`]))[0].results[0];
if (!row) { console.error(`${id}: not in the register`); process.exit(1); }

const show = (label, v) => v && console.log(`${label.padEnd(18)}${v}`);
console.log(`\nBatch ID ${id}  ${row.product} ${row.size}  (${row.status})\n`);
show('Laboratory', row.lab);
show('Lab task number', row.lab_task_no);
show('Verification key', row.verify_key);
show('Verify at', row.verify_url);
show('Sample', row.sample_id);
show('Supplier batch', row.batch);
show('Testing ordered', row.ordered_date);
show('Sample received', row.received_date);
show('Analysed', row.test_date);
show('Issued', row.issued_date);
show('Results', [row.identity, row.purity && `purity ${row.purity}%`, row.content, row.appearance].filter(Boolean).join(' · '));

const dir = path.join(HERE, 'out', 'lookup', id);
fs.mkdirSync(dir, { recursive: true });
console.log('');
for (const [label, key, etag] of [['Lab original', row.original_key, row.original_etag], ['Print copy', row.print_key, row.print_etag]]) {
  if (!key) { console.log(`${label.padEnd(18)}not on file`); continue; }
  const file = path.join(dir, path.basename(key));
  run(['r2', 'object', 'get', `aura-archive/${key}`, '--file', file, '--remote']);
  const md5 = crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex');
  console.log(`${label.padEnd(18)}${path.relative(process.cwd(), file)}  ${md5 === etag ? 'matches the register' : `DOES NOT MATCH the register (${etag})`}`);
}
