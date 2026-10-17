// POST /api/crypto-webhook — NOWPayments IPN (instant payment notification) for crypto orders.
// Checks the x-nowpayments-sig HMAC-SHA512 signature, records the payment status on the order, and marks the order
// paid when NOWPayments reports "finished" for at least the order total.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NOWPAYMENTS_IPN_SECRET.
const crypto = require("node:crypto");
const SUPABASE_URL = process.env.SUPABASE_URL || "https://guzqebqtxiwngutbdmkl.supabase.co";
const svc = () => ({ apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` });

// NOWPayments signs the JSON body with its keys sorted (at every level)
const sortDeep = (v) => Array.isArray(v) ? v.map(sortDeep)
  : v && typeof v === "object" ? Object.keys(v).sort().reduce((o, k) => ((o[k] = sortDeep(v[k])), o), {}) : v;

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret || !process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(503).end();

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const sig = String(req.headers["x-nowpayments-sig"] || "");
  const want = crypto.createHmac("sha512", secret).update(JSON.stringify(sortDeep(body))).digest("hex");
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return res.status(401).end();

  const orderNo = String(body.order_id || "");
  if (!/^AO-\d+$/.test(orderNo)) return res.status(200).end();   // not one of ours; acknowledge so it isn't retried
  const q = await fetch(`${SUPABASE_URL}/rest/v1/orders?order_no=eq.${orderNo}&select=total,status,pay_method`, { headers: svc() });
  const [order] = q.ok ? await q.json() : [];
  if (!order || order.pay_method !== "crypto") return res.status(200).end();

  const patch = { crypto_status: String(body.payment_status || "") };
  const paidEnough = String(body.price_currency || "").toLowerCase() === "usd" && Number(body.price_amount) >= Number(order.total) - 0.005;
  if (body.payment_status === "finished" && paidEnough && order.status === "awaiting_payment") {
    patch.status = "paid";
    patch.paid_at = new Date().toISOString();
  }
  const r = await fetch(`${SUPABASE_URL}/rest/v1/orders?order_no=eq.${orderNo}`, {
    method: "PATCH", headers: { ...svc(), "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(patch),
  });
  return res.status(r.ok ? 200 : 500).end();   // a 500 makes NOWPayments retry
};
