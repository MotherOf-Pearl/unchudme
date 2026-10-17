// Copy prices.js into Supabase's public.catalog_prices, the price list place_order() charges from.
// Run after every price change (after research/apply-pricing.mjs), before pushing the site:
//   node tools/checkout/sync-prices.mjs          → writes the SQL and applies it to the linked project
//   node tools/checkout/sync-prices.mjs --dry    → writes the SQL only (tools/checkout/.prices.sql)
// If the site and the database disagree, checkout refuses orders with "prices changed", so don't skip this.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ctx = {};
vm.createContext(ctx);
vm.runInContext(`${fs.readFileSync(path.join(ROOT, "data.js"), "utf8")}\n${fs.readFileSync(path.join(ROOT, "prices.js"), "utf8")}\nthis.PRODUCTS = PRODUCTS;`, ctx);

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const rows = ctx.PRODUCTS.flatMap((p) => p.sizes.filter((s) => s.price != null).map((s) => `(${q(p.id)}, ${q(s.label)}, ${q(p.name)}, ${s.price.toFixed(2)})`));
const sql = `begin;\ndelete from public.catalog_prices;\ninsert into public.catalog_prices (product_id, label, name, price) values\n${rows.join(",\n")};\ncommit;\n`;
const out = path.join(ROOT, "tools/checkout/.prices.sql");
fs.writeFileSync(out, sql);
console.log(`${rows.length} priced options → ${path.relative(ROOT, out)}`);
if (!process.argv.includes("--dry")) {
  execSync(`npx supabase db query --linked --project-ref guzqebqtxiwngutbdmkl -f "${out}"`, { cwd: ROOT, stdio: "inherit" });
  console.log("catalog_prices updated");
}
