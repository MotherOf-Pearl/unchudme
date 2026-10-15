-- The project still gave anon and authenticated every privilege on new public tables (Supabase's default),
-- which let a customer set their own `verified` flag. Strip that back to exactly what the site needs, and stop
-- future tables from getting those privileges automatically (grant per table instead).
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, institution, research_area) on public.profiles to authenticated;

alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated, public;
