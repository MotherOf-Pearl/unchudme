// Rebuild stock.js from the inventory source of truth: Peptide-Store/aura-ops → docs/inventory.md (private repo).
// stock.js is generated; never edit it by hand. Update inventory.md, then:
//   node tools/stock/sync-stock.mjs                  → fetches inventory.md from GitHub (MotherOf-Pearl login in Git Credential Manager)
//   node tools/stock/sync-stock.mjs path/to/inventory.md   → reads a local copy instead
// then push the site. Rows that don't match a catalog product + size are listed and left out.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ctx = {};
vm.createContext(ctx);
vm.runInContext(`${fs.readFileSync(path.join(ROOT, "data.js"), "utf8")}\nthis.PRODUCTS = PRODUCTS;`, ctx);
const { PRODUCTS } = ctx;

async function inventoryMd() {
  if (process.argv[2]) return fs.readFileSync(process.argv[2], "utf8");
  const cred = execSync("git credential fill", { input: "protocol=https\nhost=github.com\nusername=MotherOf-Pearl\n\n" }).toString();
  const token = cred.match(/^password=(.*)$/m)?.[1];
  const r = await fetch("https://api.github.com/repos/Peptide-Store/aura-ops/contents/docs/inventory.md",
    { headers: { Authorization: `token ${token}`, Accept: "application/vnd.github.raw" } });
  if (!r.ok) throw new Error(`couldn't fetch inventory.md (${r.status})`);
  return r.text();
}

const norm = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();
// "10 + 10 mg" on the sheet ↔ "CJC 10 mg + Ipa 10 mg" in the catalog
const sizeMatches = (label, size) => {
  const l = norm(label), s = norm(size);
  if (l === s) return true;
  const b = s.match(/^([\d.]+)\s*\+\s*([\d.]+)\s*mg$/);
  return !!b && new RegExp(`^\\w+ ${b[1]} mg \\+ \\w+ ${b[2]} mg$`).test(l);
};

const md = await inventoryMd();
const stock = {}, skipped = [];
for (const line of md.split("\n")) {
  const c = line.split("|").map((x) => x.trim());
  if (c.length < 6 || !/^\d+$/.test(c[4])) continue;          // | Compound | Size | Kits | Vials on hand |
  const [, name, size, , vials] = c;
  const p = PRODUCTS.find((x) => norm(x.name) === norm(name));
  const opt = p?.sizes.find((s) => sizeMatches(s.label, size));
  if (!opt) { skipped.push(`${name} ${size}`); continue; }
  (stock[p.id] ??= {})[opt.label] = +vials;
}

fs.writeFileSync(path.join(ROOT, "stock.js"),
`// GENERATED from Peptide-Store/aura-ops docs/inventory.md (the inventory source of truth) by tools/stock/sync-stock.mjs.
// Don't edit by hand: update inventory.md, run the script, push.
//   number > 0  → "In stock"
//   0           → "Backordered" (sold out, kit on reorder)
//   not listed  → "Ships in ~7 days" (ordered from the wholesaler on demand)
const STOCK = ${JSON.stringify(stock, null, 2)};
const LEAD_TIME = "~7 days";
`);
console.log(`stock.js: ${Object.values(stock).reduce((n, o) => n + Object.keys(o).length, 0)} options in stock`);
if (skipped.length) console.log(`not in the catalog, left out: ${skipped.join(", ")}`);
