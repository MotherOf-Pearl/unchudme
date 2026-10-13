import puppeteer from 'puppeteer-core';
const [url, out, w, h] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new' });
const p = await b.newPage(); await p.setViewport({ width: +w, height: +h });
await p.evaluateOnNewDocument(() => localStorage.setItem('ruo-ack', 'true'));
await p.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500));
await p.screenshot({ path: out, fullPage: true });
const info = await p.evaluate(() => {
  const cs = (el) => el && getComputedStyle(el);
  const pick = (sel) => { const e = document.querySelector(sel); const c = cs(e); return e && { sel, font: c.fontFamily, size: c.fontSize, weight: c.fontWeight, color: c.color, bg: c.backgroundColor }; };
  return [pick('body'), pick('h1'), pick('h2'), pick('header'), pick('a.button, .btn, button'), pick('.product-card, .card, li.product')];
});
console.log(JSON.stringify(info, null, 1));
await b.close();
