import puppeteer from 'puppeteer-core';
const [url, prefix, w, h, n] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const p = await b.newPage(); await p.setViewport({ width: +w, height: +h });
await p.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise((r) => setTimeout(r, 1500));
await p.evaluate(() => { const btn = [...document.querySelectorAll('button')].find((x) => /yes/i.test(x.textContent)); btn?.click(); });
await new Promise((r) => setTimeout(r, 1000));
for (let i = 0; i < +n; i++) {
  await p.evaluate((y) => scrollTo(0, y), i * +h);
  await new Promise((r) => setTimeout(r, 1400));
  await p.screenshot({ path: `${prefix}${i}.png` });
}
await b.close();
