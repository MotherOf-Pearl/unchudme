-- Supabase's "automatic RLS" option adds public.rls_auto_enable() (security definer) for its event trigger.
-- The trigger doesn't need anyone to be able to call it through the API, so close that off (database advisor lints 0028/0029).
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
