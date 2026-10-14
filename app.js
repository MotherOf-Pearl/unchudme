// Shared chrome (header, footer, researcher gate, cart) + per-page renderers.
// Each page sets <body data-page="..."> and includes data.js then app.js.

const $ = (s, el = document) => el.querySelector(s);
const money = (n) => `$${n.toFixed(2)}`;
const byId = (id) => PRODUCTS.find((p) => p.id === id);
const catLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label ?? id;
const priced = (p) => p.sizes.filter((s) => s.price != null);
const minPrice = (p) => (priced(p).length ? Math.min(...priced(p).map((s) => s.price)) : Infinity);
const priceTag = (p) => (priced(p).length ? money(minPrice(p)) : "Price on request");
// Availability from stock.js: on hand, sold out and on reorder, or ordered from the wholesaler on demand
const onHand = (p, s) => STOCK[p.id]?.[s.label];
const availability = (n) => (n > 0 ? { cls: "in", text: "In stock" }
  : n === 0 ? { cls: "back", text: `Backordered · ships in ${LEAD_TIME}` } : { cls: "order", text: `Ships in ${LEAD_TIME}` });
const inStock = (p) => p.sizes.some((s) => onHand(p, s) > 0);
const productAvailability = (p) => (inStock(p) ? availability(1)
  : p.sizes.some((s) => onHand(p, s) === 0) ? availability(0) : availability());
const stockPill = ({ cls, text }) => `<span class="stock-pill ${cls}">${text}</span>`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const RUO_SHORT = "For laboratory research use only. Not for human or veterinary use.";
const RUO_LONG = `All products sold by ${BRAND.name} are intended solely for in vitro laboratory research by qualified professionals. They are not drugs, food, dietary supplements, or cosmetics, are not intended for human or animal consumption, and are not intended to diagnose, treat, cure, or prevent any disease. Nothing on this site is medical advice or guidance on use in humans or animals. Purchasers are responsible for compliance with all applicable laws.`;

// Rendered product shots from tools/vials (one per product option)
const optSlug = (label) => label.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, "");
// media/ is served with a 1-year immutable cache — bump MEDIA_V whenever the vial renders change
const MEDIA_V = 5;
const vialImg = (p, s) => `media/vials/${p.id}--${optSlug(s.label)}.webp?v=${MEDIA_V}`;

// Logo: featureless face outline — swept hair, clean hairline, high cheekbones, hollow cheeks, sharp jaw.
const FACE_PATHS = `<path d="M10.3 13.4L12.4 10.3C14 9.7 16.5 9.5 20 9.5S26 9.7 27.6 10.3L29.7 13.4C31.2 11.3 31.7 8.6 31.1 6.4C30.4 4 28.3 2.2 25.4 1.5C22 .7 17.6 1 14.6 2.4C11.8 3.7 9.7 6 9.3 8.8C9.1 10.5 9.5 12.1 10.3 13.4Z" fill="currentColor" stroke="none"/><path d="M13.6 9.4C15.6 6.4 19.6 4.3 25.4 4.4M17.4 9.1C19.6 7.2 23.4 6.2 28.6 6.9" stroke="var(--bg,#0f1215)" stroke-width="1"/><path d="M20 9.5C23.5 9.5 26 9.7 27.6 10.3L29.7 13.4C30.6 15.6 31 18.2 30.8 20.6C30.6 23 29 24.4 28.7 26.6C28.5 28.4 29.4 29.9 29.3 31.4L23.4 38.6C22.4 39.3 21.2 39.5 20 39.5S17.6 39.3 16.6 38.6L10.7 31.4C10.6 29.9 11.5 28.4 11.3 26.6C11 24.4 9.4 23 9.2 20.6C9 18.2 9.4 15.6 10.3 13.4L12.4 10.3C14 9.7 16.5 9.5 20 9.5Z"/><path d="M13.4 34.9L13.9 46M26.6 34.9L26.1 46" opacity=".55"/>`;
const logoSVG = (h = 34) => `<svg class="logo-face" width="${h * 40 / 48}" height="${h}" viewBox="0 0 40 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${FACE_PATHS}</svg>`;

function setFavicon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 48" fill="none" stroke="#6fc2a7" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" color="#6fc2a7" style="--bg:#0f1215">${FACE_PATHS}</svg>`;
  document.head.insertAdjacentHTML("beforeend", `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(svg)}">`);
}

/* ---------- chrome ---------- */
function renderChrome() {
  setFavicon();
  const page = document.body.dataset.page;
  const nav = [["shop", "shop.html", "Shop"], ["coa", "coa.html", "Certificates"], ["quality", "quality.html", "Quality"], ["faq", "faq.html", "FAQ"]];
  document.body.insertAdjacentHTML("afterbegin", `
    <div class="bg" aria-hidden="true"></div>
    <div class="ruo-strip">${RUO_SHORT}</div>
    <header class="site"><div class="wrap">
      <a class="logo" href="index.html">${logoSVG()}${esc(BRAND.name)}</a>
      <button class="menu-btn" aria-label="Menu" aria-expanded="false">Menu</button>
      <nav class="main">${nav.map(([k, h, l]) => `<a href="${h}"${k === page ? ' aria-current="page"' : ""}>${l}</a>`).join("")}</nav>
      <button class="cart-btn" aria-label="Open cart">Cart (<span id="cart-count">0</span>)</button>
    </div></header>`);

  document.body.insertAdjacentHTML("beforeend", `
    <footer class="site"><div class="wrap">
      <div class="cols">
        <div><a class="logo" href="index.html" style="color:var(--ink)">${logoSVG()}${esc(BRAND.name)}</a>
          <p class="muted">${esc(BRAND.tagline)}</p></div>
        <div><b>Catalog</b>${CATEGORIES.map((c) => `<a href="shop.html?cat=${c.id}">${c.label}</a>`).join("")}</div>
        <div><b>Company</b><a href="coa.html">Certificates</a><a href="quality.html">Quality</a><a href="faq.html">FAQ</a><a href="#">Terms of sale</a><a href="#">Privacy</a></div>
      </div>
      <div class="legal">${RUO_LONG}<br><br>© ${new Date().getFullYear()} ${esc(BRAND.name)}. Prototype — not a live store.</div>
    </div></footer>
    <div class="drawer-bg"></div>
    <aside class="drawer" aria-label="Cart"><header><h3 style="margin:0">Cart</h3><button class="link-btn" data-close>Close</button></header>
      <div class="items"></div>
      <footer><div style="display:flex;justify-content:space-between"><span>Subtotal</span><b id="cart-sub">$0.00</b></div>
        <p class="notice" style="margin:0">Checkout requires account verification of research affiliation. ${RUO_SHORT}</p>
        <button class="btn primary" disabled title="Payment not connected in prototype">Checkout (not connected)</button></footer>
    </aside>`);

  $(".menu-btn").onclick = (e) => { const n = $("nav.main"); n.classList.toggle("open"); e.currentTarget.setAttribute("aria-expanded", n.classList.contains("open")); };
  $(".cart-btn").onclick = openCart;
  $(".drawer-bg").onclick = closeCart;
  $(".drawer [data-close]").onclick = closeCart;
  renderCart();
  gate();
}

function gate() {
  if (store.get("ruo-ack", false)) return;
  document.body.insertAdjacentHTML("beforeend", `
    <div class="gate" role="dialog" aria-modal="true" aria-labelledby="gate-t"><div class="box">
      <div class="eyebrow">Before you enter</div>
      <h2 id="gate-t" style="font-size:1.5rem">Research use only</h2>
      <p class="muted" style="font-size:.92rem">${esc(BRAND.name)} supplies research compounds to laboratories and qualified researchers. Please confirm:</p>
      <label><input type="checkbox" id="g1"> I am 21 years of age or older.</label>
      <label><input type="checkbox" id="g2"> I am purchasing for in vitro laboratory research and understand these products are not for human or animal use.</label>
      <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap">
        <button class="btn primary" id="g-enter" disabled>Enter site</button>
        <a class="btn" href="https://www.google.com">Leave</a>
      </div></div></div>`);
  const update = () => ($("#g-enter").disabled = !($("#g1").checked && $("#g2").checked));
  $("#g1").onchange = update; $("#g2").onchange = update;
  $("#g-enter").onclick = () => { store.set("ruo-ack", true); $(".gate").remove(); };
}

/* ---------- cart ---------- */
const cart = () => store.get("cart", []);
function addToCart(id, label, qty = 1) {
  const c = cart(); const hit = c.find((i) => i.id === id && i.label === label);
  hit ? (hit.qty += qty) : c.push({ id, label, qty });
  store.set("cart", c); renderCart(); openCart();
}
function renderCart() {
  const c = cart().filter((i) => byId(i.id)?.sizes.some((s) => s.label === i.label && s.price != null));
  $("#cart-count").textContent = c.reduce((n, i) => n + i.qty, 0);
  let sub = 0;
  $(".drawer .items").innerHTML = c.length ? c.map((i, idx) => {
    const p = byId(i.id), s = p.sizes.find((x) => x.label === i.label), price = s.price; sub += price * i.qty;
    const n = onHand(p, s) ?? 0, note = n >= i.qty ? "" : n > 0 ? `${n} in stock, ${i.qty - n} ships in ${LEAD_TIME}` : `Ships in ${LEAD_TIME}`;
    return `<div class="item"><div><b>${esc(p.name)}</b> <span class="muted mono">${esc(i.label)} × ${i.qty}</span><br>
      ${note ? `<span class="cart-note">${note}</span><br>` : ""}
      <button class="link-btn" data-rm="${idx}">Remove</button></div><div class="mono">${money(price * i.qty)}</div></div>`;
  }).join("") : `<p class="muted" style="padding:20px 0">Your cart is empty.</p>`;
  $("#cart-sub").textContent = money(sub);
  document.querySelectorAll("[data-rm]").forEach((b) => (b.onclick = () => {
    const c2 = cart(); c2.splice(+b.dataset.rm, 1); store.set("cart", c2); renderCart();
  }));
}
function openCart() { $(".drawer").classList.add("open"); $(".drawer-bg").classList.add("open"); }
function closeCart() { $(".drawer").classList.remove("open"); $(".drawer-bg").classList.remove("open"); }

/* ---------- shared pieces ---------- */
// "6 sizes · 5–60 mg" for plain mg ranges, otherwise "2 options"
function optionSummary(p) {
  const n = p.sizes.length, mgs = p.sizes.map((s) => s.label.match(/^([\d.]+) mg$/)?.[1]);
  if (n === 1) return esc(p.sizes[0].label);
  return mgs.every(Boolean) ? `${n} sizes · ${mgs[0]}–${mgs.at(-1)} mg` : `${n} options`;
}
const shownSize = (p) => p.sizes.find((s) => onHand(p, s) > 0) || p.sizes[0]; // picture the size on the shelf
function productCard(p) {
  return `<a class="card" href="product.html?id=${p.id}">
    <div class="vial"><img src="${vialImg(p, shownSize(p))}" alt="${esc(p.name)} vial" loading="lazy" width="1000" height="1000">${stockPill(productAvailability(p))}</div>
    <div class="card-body">
      <span class="tag">${catLabel(p.cat)}</span>
      <span class="name">${esc(p.name)}</span>
      <span class="meta">${optionSummary(p)}</span>
      <span class="price">${priceTag(p)}<span class="go" aria-hidden="true">→</span></span>
    </div>
  </a>`;
}

/* ---------- pages ---------- */
const pages = {
  home() {
    const onShelf = Object.keys(STOCK).map(byId).filter((p) => p && inStock(p));
    $("#featured").innerHTML = [...onShelf, ...PRODUCTS.filter((p) => !onShelf.includes(p))].slice(0, 8).map(productCard).join("");
    const l = LOTS.find((x) => x.productId === "bpc-157"), p = byId(l.productId);
    $("#mini-coa").innerHTML = `
      <div class="mini-coa-head"><b>${esc(p.name)}</b><span class="sample-badge">Sample</span></div>
      <div class="row"><span>Batch</span><span class="mono">${l.lot}</span></div>
      <div class="row"><span>Purity (HPLC)</span><span class="mono pass">${l.purity}%</span></div>
      <div class="row"><span>Identity (LC-MS)</span><span class="mono pass">Conforms</span></div>
      <div class="row"><span>Endotoxin</span><span class="mono">${l.endotoxin}</span></div>`;
  },

  shop() {
    const params = new URLSearchParams(location.search);
    let cat = params.get("cat") || "all", q = "", sort = "name";
    $("#chips").innerHTML = [{ id: "all", label: "All" }, { id: "instock", label: "In stock" }, ...CATEGORIES].map((c) =>
      `<button class="chip" data-cat="${c.id}" aria-pressed="${c.id === cat}">${c.label}</button>`).join("");
    const draw = () => {
      let list = PRODUCTS.filter((p) => (cat === "all" || p.cat === cat || (cat === "instock" && inStock(p))) &&
        [p.name, p.aka, p.seq, p.cas].join(" ").toLowerCase().includes(q));
      list.sort(sort === "price" ? (a, b) => minPrice(a) - minPrice(b) : sort === "mw" ? (a, b) => (a.mw ?? 1e9) - (b.mw ?? 1e9) : (a, b) => a.name.localeCompare(b.name));
      list = [...list.filter(inStock), ...list.filter((p) => !inStock(p))];
      $("#results").innerHTML = list.length ? list.map(productCard).join("") : `<p class="muted">No compounds match “${esc(q)}”.</p>`;
      $("#count").textContent = `${list.length} compound${list.length === 1 ? "" : "s"}`;
    };
    $("#chips").onclick = (e) => {
      const b = e.target.closest(".chip"); if (!b) return; cat = b.dataset.cat;
      document.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", c === b)); draw();
    };
    $("#q").oninput = (e) => { q = e.target.value.trim().toLowerCase(); draw(); };
    $("#sort").onchange = (e) => { sort = e.target.value; draw(); };
    draw();
  },

  product() {
    const p = byId(new URLSearchParams(location.search).get("id")) || PRODUCTS[0];
    document.title = `${p.name} · ${BRAND.name}`;
    let size = p.sizes.find((s) => onHand(p, s) > 0) || p.sizes[0];
    const lots = LOTS.filter((l) => l.productId === p.id);
    $("#pdp").innerHTML = `
      <div class="vial-lg"><img id="pdp-img" src="${vialImg(p, size)}" alt="${esc(p.name)} ${esc(size.label)} vial" width="1000" height="1000"></div>
      <div>
        <a class="muted" href="shop.html?cat=${p.cat}" style="font-size:.9rem">← ${catLabel(p.cat)}</a>
        <h1 style="font-size:2.4rem;margin-top:10px">${esc(p.name)}</h1>
        <div class="price" style="font-size:1.4rem;font-weight:650" id="price"></div>
        <div class="avail" id="avail"></div>
        <div class="sizes" role="group" aria-label="Option">${p.sizes.map((s, i) =>
          `<button class="size${onHand(p, s) > 0 ? " has-stock" : ""}" data-i="${i}" aria-pressed="${s === size}">${esc(s.label)}</button>`).join("")}</div>
        <div class="qty"><label for="qty" class="muted">Qty</label><input id="qty" class="field" type="number" min="1" max="50" value="1"></div>
        <button class="btn primary" id="add">Add to cart</button>
        <p class="notice" style="margin-top:18px">${RUO_SHORT} No usage, dosing or administration guidance is provided.</p>
        <h3 style="margin-top:28px">Specifications</h3>
        <table class="spec">
          ${p.seq ? `<tr><th>Sequence</th><td>${esc(p.seq)}</td></tr>` : ""}
          ${p.formula ? `<tr><th>Molecular formula</th><td>${esc(p.formula)}</td></tr>` : ""}
          ${p.mw ? `<tr><th>Molecular weight</th><td>${p.mw} g/mol</td></tr>` : ""}
          ${p.cas ? `<tr><th>CAS</th><td>${p.cas}</td></tr>` : ""}
          <tr><th>Form</th><td>${SPEC.form}</td></tr>
          <tr><th>Purity</th><td>${SPEC.purity}</td></tr>
          <tr><th>Storage</th><td>${SPEC.storage}</td></tr>
        </table>
        <h3 style="margin-top:28px">Certificates for this compound</h3>
        <div class="table-scroll"><table class="coa-table"><tr><th>Batch</th><th>Tested</th><th>Purity</th><th></th></tr>
          ${lots.map((l) => `<tr><td class="mono">${l.lot}</td><td>${l.date}</td><td class="mono">${l.purity}%</td>
            <td><a href="coa.html?batch=${l.lot}">View</a> <span class="sample-badge">Sample</span></td></tr>`).join("")}
        </table></div>
      </div>`;
    const setAvail = () => {
      const n = onHand(p, size), qty = Math.max(1, +$("#qty").value || 1);
      $("#avail").innerHTML = stockPill(availability(n)) +
        (n > 0 && qty > n ? `<span class="muted">Only ${n} on hand. ${qty - n} backordered, ships in ${LEAD_TIME}.</span>` : "");
    };
    $("#qty").oninput = setAvail;
    const setPrice = () => { setAvail(); $("#price").textContent = size.price == null ? "Price on request" : money(size.price); $("#add").disabled = size.price == null; $("#pdp-img").src = vialImg(p, size); $("#pdp-img").alt = `${p.name} ${size.label} vial`; };
    setPrice();
    document.querySelectorAll(".size").forEach((b) => (b.onclick = () => {
      size = p.sizes[+b.dataset.i];
      document.querySelectorAll(".size").forEach((x) => x.setAttribute("aria-pressed", x === b)); setPrice();
    }));
    $("#add").onclick = () => addToCart(p.id, size.label, Math.max(1, Math.min(50, +$("#qty").value || 1)));
    $("#related").innerHTML = PRODUCTS.filter((x) => x.cat === p.cat && x.id !== p.id).slice(0, 4).map(productCard).join("")
      || PRODUCTS.filter((x) => x.id !== p.id).slice(0, 4).map(productCard).join("");
  },

  coa() {
    const show = (code) => {
      const l = LOTS.find((x) => x.lot.toLowerCase() === code.trim().toLowerCase());
      if (!l) { $("#coa-out").innerHTML = code ? `<div class="coa-panel"><p>No certificate found for <span class="mono">${esc(code)}</span>. Batch numbers are printed on the vial label.</p></div>` : ""; return; }
      const p = byId(l.productId);
      const rows = [["Appearance", "White lyophilized powder", "Conforms"], ["Identity (LC-MS)", p.mw ? `MW ${p.mw}` : "Matches reference", l.identity],
        ["Purity (HPLC)", "≥ 98.0%", `${l.purity}%`], ["Endotoxin (LAL)", "< 1.0 EU/mg", l.endotoxin],
        ["Heavy metals", "USP <232>", "Pass"], ["Residual solvents", "USP <467>", "Pass"],
        ["Residual TFA", "≤ 1.0%", l.tfa], ["Water content (KF)", "≤ 6.0%", l.water]];
      $("#coa-out").innerHTML = `<div class="coa-panel">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <div><div class="eyebrow">Certificate of analysis</div><h2 style="margin:0">${esc(p.name)}</h2>
          <p class="muted mono" style="margin:6px 0 0">Batch ${l.lot} · tested ${l.date}</p></div>
          <div><span class="sample-badge">Sample data — not a real result</span></div></div>
        <div class="table-scroll" style="margin-top:18px"><table class="coa-table">
          <tr><th>Test</th><th>Specification</th><th>Result</th></tr>
          ${rows.map((r) => `<tr><td>${r[0]}</td><td class="mono">${r[1]}</td><td class="mono pass">${r[2]}</td></tr>`).join("")}
        </table></div>
        <p class="muted" style="font-size:.85rem;margin-top:16px">Laboratory: ${l.lab}. Original signed PDF will be linked here.</p></div>`;
      history.replaceState(null, "", `?batch=${l.lot}`);
    };
    $("#coa-form").onsubmit = (e) => { e.preventDefault(); show($("#lot").value); };
    $("#coa-list").innerHTML = LOTS.map((l) => `<tr><td class="mono"><a href="#" data-lot="${l.lot}">${l.lot}</a></td>
      <td>${esc(byId(l.productId).name)}</td><td>${l.date}</td><td class="mono">${l.purity}%</td></tr>`).join("");
    $("#coa-list").onclick = (e) => { const a = e.target.closest("[data-lot]"); if (!a) return; e.preventDefault(); $("#lot").value = a.dataset.lot; show(a.dataset.lot); scrollTo({ top: 0, behavior: "smooth" }); };
    const qs = new URLSearchParams(location.search), pre = qs.get("batch") ?? qs.get("lot"); // ?lot= kept for old links
    if (pre) { $("#lot").value = pre; show(pre); }
  },
};

renderChrome();
pages[document.body.dataset.page]?.();
