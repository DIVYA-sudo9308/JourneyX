-- JourneyX — Supabase Security Advisor hardening.
--
-- Already applied to the live project by hand; this file records it so every
-- environment converges. Idempotent: safe to re-run, and each fix is skipped
-- when its function does not exist.
--
-- 1. Function Search Path Mutable — public.set_updated_at
--    Pin an empty search_path. The body only calls now(), which lives in
--    pg_catalog and resolves without one. Existing triggers are unaffected.
--
-- 2/3. Public / Signed-In Users Can Execute SECURITY DEFINER Function —
--    public.rls_auto_enable()
--    Supabase's auto-RLS function, fired by the `ensure_rls` event trigger. It
--    is not created by these migrations, so it may be absent. Nothing calls it
--    over the API; revoking EXECUTE removes the RPC endpoint without stopping
--    the event trigger, since trigger firing does not check EXECUTE.
--
-- Not covered here: "Leaked Password Protection Disabled" is an Auth setting
-- (Pro plan and above), not SQL.

do $$
begin
  if to_regprocedure('public.set_updated_at()') is not null then
    alter function public.set_updated_at() set search_path = '';
  end if;

  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;

notify pgrst, 'reload schema';
