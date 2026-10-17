-- Orders and checkout for Aura Pharma (see CHECKOUT.md).
-- Customers never write orders directly: the site calls place_order(), which re-prices the cart from
-- public.catalog_prices (synced from prices.js by tools/checkout/sync-prices.mjs), adds shipping, and refuses
-- the order if the total the customer saw differs. Customers can read only their own orders. Payment status is
-- changed by Aura Pharma (invoice orders, by hand) or by the crypto webhook (api/crypto-webhook.js, service role).
-- Apply: npx supabase db query --linked --project-ref guzqebqtxiwngutbdmkl -f supabase/migrations/<this file>

-- Price per option, the server's copy of prices.js. Read only by place_order(); not exposed to the API.
create table public.catalog_prices (
  product_id text not null,
  label      text not null,
  name       text not null,
  price      numeric(10, 2) not null check (price > 0),
  primary key (product_id, label)
);
alter table public.catalog_prices enable row level security;
grant all on public.catalog_prices to service_role;

create sequence public.order_no_seq start 1001;

create table public.orders (
  id                 uuid primary key default gen_random_uuid(),
  order_no           text not null unique default ('AO-' || nextval('public.order_no_seq')),
  user_id            uuid not null references auth.users (id),
  email              text not null,
  items              jsonb not null,            -- [{ id, label, name, qty, price }]
  subtotal           numeric(10, 2) not null,
  shipping           numeric(10, 2) not null,
  total              numeric(10, 2) not null,
  ship_name          text not null,
  ship_line1         text not null,
  ship_line2         text,
  ship_city          text not null,
  ship_state         text not null,
  ship_zip           text not null,
  ship_country       text not null default 'US',
  ship_phone         text,
  pay_method         text not null check (pay_method in ('invoice', 'crypto')),
  status             text not null default 'awaiting_payment'
                       check (status in ('awaiting_payment', 'paid', 'shipped', 'cancelled')),
  crypto_invoice_id  text,
  crypto_invoice_url text,
  crypto_status      text,                      -- last payment_status from NOWPayments
  tracking           text,
  paid_at            timestamptz,
  shipped_at         timestamptz,
  notes              text,                      -- internal
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index orders_user_id_idx on public.orders (user_id, created_at desc);
alter table public.orders enable row level security;

grant select (id, order_no, email, items, subtotal, shipping, total, ship_name, ship_line1, ship_line2, ship_city,
              ship_state, ship_zip, ship_country, ship_phone, pay_method, status, crypto_invoice_url, tracking,
              paid_at, shipped_at, created_at)
  on public.orders to authenticated;
grant all on public.orders to service_role;
grant usage on sequence public.order_no_seq to service_role;

create policy "Customers read their own orders" on public.orders
  for select to authenticated using ((select auth.uid()) = user_id);

create trigger orders_touch_updated_at before update on public.orders
  for each row execute function public.touch_updated_at();

-- Place an order for the signed-in, verified customer. Errors are raised with a short code the site maps to a message:
-- AP_SIGNED_OUT, AP_NOT_VERIFIED, AP_BAD_METHOD, AP_EMPTY, AP_BAD_ITEM, AP_UNAVAILABLE:<id>/<label>, AP_ADDRESS, AP_PRICE_CHANGED.
-- Shipping: $15 flat, free from $200 — keep in step with js/checkout-config.js.
create function public.place_order(items jsonb, ship jsonb, method text, expected_total numeric)
  returns table (order_no text, total numeric)
  language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  prof record;
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
  if uid is null then raise exception 'AP_SIGNED_OUT'; end if;
  select p.email, p.verified into prof from public.profiles p where p.id = uid;
  if not found or not prof.verified then raise exception 'AP_NOT_VERIFIED'; end if;
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

  insert into public.orders (user_id, email, items, subtotal, shipping, total, ship_name, ship_line1, ship_line2,
                             ship_city, ship_state, ship_zip, ship_phone, pay_method)
  values (uid, prof.email, lines, sub, shp, tot, left(s_name, 120), left(s_line1, 200),
          left(nullif(trim(ship ->> 'line2'), ''), 200), left(s_city, 100), s_state, s_zip,
          left(nullif(trim(ship ->> 'phone'), ''), 40), method)
  returning orders.order_no, orders.total into o;
  return query select o.order_no, o.total;
end $$;
revoke execute on function public.place_order(jsonb, jsonb, text, numeric) from public, anon;
grant execute on function public.place_order(jsonb, jsonb, text, numeric) to authenticated;
