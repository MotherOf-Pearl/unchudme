// POST /api/crypto-invoice  { order: "AO-1001" }  with the customer's Supabase access token as a Bearer token,
// or { order, token } for a guest order (its secret guest_token).
// Creates (once) a NOWPayments hosted invoice for one of the customer's own unpaid crypto orders and returns its URL.
// The amount comes from the order row (priced by place_order() in the database), never from the browser.
// Env (Vercel → Settings → Environment Variables): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NOWPAYMENTS_API_KEY, SITE_URL.
const SUPABASE_URL = process.env.SUPABASE_URL || "https://guzqebqtxiwngutbdmkl.supabase.co";
const SITE_URL = (process.env.SITE_URL || "https://www.aurapharma.us").replace(/\/$/, "");
const svc = () => ({ apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` });

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NOWPAYMENTS_API_KEY) return res.status(503).json({ error: "crypto payments aren't set up yet" });

  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const orderNo = String(req.body?.order || ""), guest = String(req.body?.token || "");
  if (!/^AO-\d+$/.test(orderNo) || (guest ? !/^[0-9a-f-]{36}$/i.test(guest) : !token)) return res.status(400).json({ error: "bad request" });

  // whose order: a guest's (order number + secret token) or the signed-in customer's
  let owner;
  if (guest) owner = `guest_token=eq.${guest}&user_id=is.null`;
  else {
    const u = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${token}` } });
    if (!u.ok) return res.status(401).json({ error: "sign in again" });
    owner = `user_id=eq.${(await u.json()).id}`;
  }
  const q = await fetch(`${SUPABASE_URL}/rest/v1/orders?order_no=eq.${orderNo}&${owner}&select=order_no,total,status,pay_method,crypto_invoice_url`, { headers: svc() });
  const [order] = q.ok ? await q.json() : [];
  if (!order) return res.status(404).json({ error: "order not found" });
  if (order.pay_method !== "crypto" || order.status !== "awaiting_payment") return res.status(409).json({ error: "this order doesn't need a crypto payment" });
  if (order.crypto_invoice_url) return res.status(200).json({ url: order.crypto_invoice_url });

  const back = `${SITE_URL}/checkout?order=${orderNo}${guest ? `&t=${guest}` : ""}`;
  const np = await fetch("https://api.nowpayments.io/v1/invoice", {
    method: "POST",
    headers: { "x-api-key": process.env.NOWPAYMENTS_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      price_amount: Number(order.total), price_currency: "usd", order_id: orderNo,
      order_description: `Aura Pharma order ${orderNo}`,
      ipn_callback_url: `${SITE_URL}/api/crypto-webhook`, success_url: back, cancel_url: back,
    }),
  });
  const inv = await np.json().catch(() => ({}));
  if (!np.ok || !inv.invoice_url) { console.error("NOWPayments invoice failed", np.status, inv); return res.status(502).json({ error: "the payment provider didn't respond" }); }

  await fetch(`${SUPABASE_URL}/rest/v1/orders?order_no=eq.${orderNo}`, {
    method: "PATCH", headers: { ...svc(), "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ crypto_invoice_id: String(inv.id), crypto_invoice_url: inv.invoice_url }),
  });
  return res.status(200).json({ url: inv.invoice_url });
};
