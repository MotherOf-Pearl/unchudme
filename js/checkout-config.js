// Checkout settings. Shipping must match place_order() in supabase/migrations/20261017120000_orders.sql:
// the database re-prices every order and refuses it if the totals differ.
window.AURA_CHECKOUT = {
  shippingFlat: 15,        // US shipping per order
  freeShippingFrom: 200,   // subtotal at which shipping is free
  // Crypto via NOWPayments (api/crypto-invoice.js). Turn on only once NOWPAYMENTS_API_KEY, NOWPAYMENTS_IPN_SECRET and
  // SUPABASE_SERVICE_ROLE_KEY are set in Vercel (CHECKOUT.md); until then only invoice payment is offered.
  crypto: false,
};
