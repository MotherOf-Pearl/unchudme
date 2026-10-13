// node render.mjs preview <productId>   -> preview.png for one product (first option)
// node render.mjs all                   -> media/vials/<id>--<option-slug>.webp for every catalog option
// node render.mjs hero                  -> media/hero-vials.webp (three vials, transparent background)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1');
const SITE = path.resolve(HERE, '../..');
const OUT = path.join(SITE, 'media/vials');
const SIZE = 1000;

// catalog + logo straight from the site so labels never drift from it
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(SITE, 'data.js'), 'utf8') + ';this.PRODUCTS = PRODUCTS; this.LOTS = LOTS;', ctx);
const FACE = fs.readFileSync(path.join(SITE, 'app.js'), 'utf8').match(/const FACE_PATHS = `([\s\S]*?)`;/)[1];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-|-$/g, '');
const vialText = (o) => (o === 'Standard vial' ? '' : o.replace(/^(\w+) ([\d.]+ mg) \+ (\w+) ([\d.]+ mg)$/, '$1 $2  +  $3 $4'));

const MIME = { '.html': 'text/html', '.js': 'text/javascript' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const f = path.join(url.startsWith('/js/') ? SITE : HERE, url); // shared vial model lives in the site's js/
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
}).listen(8767);

const [mode, arg] = process.argv.slice(2);
const HERO = ['ghk-cu', 'bpc-157', 'tb-500']; // left, centre, right
const HERO_W = 1200, HERO_H = 1100;

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', `--window-size=${SIZE},${SIZE}`],
});
const page = await browser.newPage();
await page.setViewport(mode === 'hero' ? { width: HERO_W, height: HERO_H, deviceScaleFactor: 1 } : { width: SIZE, height: SIZE, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('[err]', e.message));
await page.evaluateOnNewDocument((f) => { window.FACE_PATHS = f; }, FACE);
await page.goto(`http://127.0.0.1:8767/${mode === 'hero' ? 'hero' : 'vial'}.html`);
await page.waitForFunction('window.READY === true', { timeout: 60000 });

const lotOf = (id) => ctx.LOTS.find((l) => l.productId === id).lot;
if (mode === 'hero') {
  const specs = HERO.map((id) => { const p = ctx.PRODUCTS.find((x) => x.id === id); return { name: p.name, option: vialText(p.sizes[0].label), lot: lotOf(id) }; });
  await page.evaluate((s) => window.renderHero(s), specs);
  await page.screenshot({ path: path.join(SITE, 'media/hero-vials.webp'), type: 'webp', quality: 88, omitBackground: true });
  console.log('hero-vials.webp');
  await browser.close(); server.close(); process.exit(0);
}
const jobs = ctx.PRODUCTS.filter((p) => mode !== 'preview' || p.id === arg)
  .flatMap((p) => (mode === 'preview' ? p.sizes.slice(0, 1) : p.sizes).map((s) => ({ p, s })));
fs.mkdirSync(OUT, { recursive: true });
for (const { p, s } of jobs) {
  const lot = lotOf(p.id);
  await page.evaluate((spec) => window.renderVial(spec), { name: p.name, option: vialText(s.label), lot });
  const file = mode === 'preview' ? path.join(HERE, 'preview.png') : path.join(OUT, `${p.id}--${slug(s.label)}.webp`);
  await page.screenshot({ path: file, type: mode === 'preview' ? 'png' : 'webp', quality: mode === 'preview' ? undefined : 86 });
  console.log(path.basename(file));
}
await browser.close(); server.close();
