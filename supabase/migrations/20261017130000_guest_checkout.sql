-- Guest checkout: orders without an account (see CHECKOUT.md).
-- A guest order has no user_id; the guest gets a secret guest_token, and reads the order back with
-- guest_order(order_no, token) (the status link is checkout.html?order=AO-…&t=<token>).
-- Signed-in customers no longer need to be verified to order. buyer_verified records whether the buyer was a verified
-- researcher when ordering; unverified and guest orders are checked for research use before they ship.
-- Apply: npx supabase db query --linked --project-ref guzqebqtxiwngutbdmkl -f supabase/migrations/<this file>

alter table public.orders alter column user_id drop not null;
alter table public.orders add column guest_token uuid not null default gen_random_uuid();
alter table public.orders add column buyer_verified boolean not null default false;
create index orders_email_created_idx on public.orders (email, created_at desc);
grant select (buyer_verified) on public.orders to authenticated;

drop function public.place_order(jsonb, jsonb, text, numeric);

-- Errors (short codes the site maps to messages): AP_BAD_METHOD, AP_EMPTY, AP_BAD_ITEM, AP_UNAVAILABLE:<id>/<label>,
-- AP_ADDRESS, AP_EMAIL, AP_TOO_MANY, AP_PRICE_CHANGED.
-- Signed out = guest: ship.email is required, and guest_token is returned (null for account orders).
-- Shipping: $15 flat, free from $200 — keep in step with js/checkout-config.js.
create function public.place_order(items jsonb, ship jsonb, method text, expected_total numeric)
  returns table (order_no text, total numeric, guest_token uuid)
  language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  buyer_email text;
  is_verified boolean := false;
  it jsonb;
  qty int;
  cp record;
  lines jsonb := '[]'::jsonb;
  sub numeric(10, 2) := 0;
  shp numeric(10, 2);
  tot numeric(10, 2);
  s_name text := nullif(trim(ship ->> 'name'), '');
  s_line1 text := nullif(trim(ship ->> 'line1'), '');
  s_city text := nullif(trim(ship ->> 'city'), '');
  s_state text := upper(nullif(trim(ship ->> 'state'), ''));
  s_zip text := nullif(trim(ship ->> 'zip'), '');
  o record;
begin
  if uid is not null then
    select p.email, p.verified into buyer_email, is_verified from public.profiles p where p.id = uid;
    if not found then raise exception 'AP_EMAIL'; end if;
  else
    buyer_email := lower(nullif(trim(ship ->> 'email'), ''));
    if buyer_email is null or length(buyer_email) > 254 or buyer_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'AP_EMAIL'; end if;
  end if;
  -- a brake on scripted or accidental repeat orders
  if (select count(*) from public.orders x where x.email = buyer_email and x.created_at > now() - interval '1 hour') >= 5
    then raise exception 'AP_TOO_MANY'; end if;

  if method not in ('invoice', 'crypto') then raise exception 'AP_BAD_METHOD'; end if;
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) = 0 then raise exception 'AP_EMPTY'; end if;
  if jsonb_array_length(items) > 40 then raise exception 'AP_BAD_ITEM'; end if;

  for it in select * from jsonb_array_elements(items) loop
    qty := (it ->> 'qty')::int;
    if qty is null or qty < 1 or qty > 50 then raise exception 'AP_BAD_ITEM'; end if;
    select c.name, c.price into cp from public.catalog_prices c where c.product_id = it ->> 'id' and c.label = it ->> 'label';
    if not found then raise exception 'AP_UNAVAILABLE:%/%', it ->> 'id', it ->> 'label'; end if;
    lines := lines || jsonb_build_object('id', it ->> 'id', 'label', it ->> 'label', 'name', cp.name, 'qty', qty, 'price', cp.price);
    sub := sub + cp.price * qty;
  end loop;

  if s_name is null or s_line1 is null or s_city is null or s_state !~ '^[A-Z]{2}$' or s_zip !~ '^\d{5}(-\d{4})?$'
    then raise exception 'AP_ADDRESS'; end if;

  shp := case when sub >= 200 then 0 else 15 end;
  tot := sub + shp;
  if expected_total is null or abs(tot - expected_total) > 0.005 then raise exception 'AP_PRICE_CHANGED'; end if;

  insert into public.orders (user_id, email, buyer_verified, items, subtotal, shipping, total, ship_name, ship_line1,
                             ship_line2, ship_city, ship_state, ship_zip, ship_phone, pay_method)
  values (uid, buyer_email, coalesce(is_verified, false), lines, sub, shp, tot, left(s_name, 120), left(s_line1, 200),
          left(nullif(trim(ship ->> 'line2'), ''), 200), left(s_city, 100), s_state, s_zip,
          left(nullif(trim(ship ->> 'phone'), ''), 40), method)
  returning orders.order_no, orders.total, orders.guest_token into o;
  return query select o.order_no, o.total, case when uid is null then o.guest_token end;
end $$;
revoke execute on function public.place_order(jsonb, jsonb, text, numeric) from public;
grant execute on function public.place_order(jsonb, jsonb, text, numeric) to anon, authenticated;

-- A guest reads their own order with the order number and its secret token (customer-facing fields only).
create function public.guest_order(order_no text, token uuid)
  returns jsonb
  language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('order_no', o.order_no, 'email', o.email, 'items', o.items, 'subtotal', o.subtotal,
    'shipping', o.shipping, 'total', o.total, 'ship_name', o.ship_name, 'ship_line1', o.ship_line1, 'ship_line2', o.ship_line2,
    'ship_city', o.ship_city, 'ship_state', o.ship_state, 'ship_zip', o.ship_zip, 'pay_method', o.pay_method, 'status', o.status,
    'crypto_invoice_url', o.crypto_invoice_url, 'tracking', o.tracking, 'paid_at', o.paid_at, 'created_at', o.created_at)
  from public.orders o
  where o.order_no = guest_order.order_no and o.guest_token = guest_order.token and o.user_id is null
$$;
revoke execute on function public.guest_order(text, uuid) from public;
grant execute on function public.guest_order(text, uuid) to anon, authenticated;
