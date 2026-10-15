-- Customer profiles for Aura Pharma accounts (Supabase project "Aura Pharma", ref guzqebqtxiwngutbdmkl).
-- One row per signed-up user, created automatically at sign-up from the details on the sign-up form.
-- Customers can read and edit only their own name, institution and research area; `verified` and `role`
-- are set by Aura Pharma (dashboard / SQL) after checking research affiliation, never by the customer.
-- Apply: npx supabase db query --linked --project-ref guzqebqtxiwngutbdmkl -f supabase/migrations/<this file>

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null,
  full_name     text,
  institution   text,
  research_area text,
  verified      boolean not null default false,   -- research affiliation checked by Aura Pharma
  verified_at   timestamptz,
  role          text not null default 'customer' check (role in ('customer', 'affiliate', 'admin')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- New tables aren't exposed to the Data API automatically: grant exactly what the site needs.
grant select on public.profiles to authenticated;
grant update (full_name, institution, research_area) on public.profiles to authenticated;

create policy "Customers read their own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "Customers update their own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Sign-up → profile row, from the metadata the sign-up form sends.
create function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, institution, research_area)
  values (new.id, new.email,
          nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
          nullif(trim(new.raw_user_meta_data ->> 'institution'), ''),
          nullif(trim(new.raw_user_meta_data ->> 'research_area'), ''));
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep the profile's email in step if the account email changes.
create function public.handle_user_email_change() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (old.email is distinct from new.email) execute function public.handle_user_email_change();

create function public.touch_updated_at() returns trigger
  language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;
create trigger profiles_touch_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();
