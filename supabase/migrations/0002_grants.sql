-- Follow-up: PostgREST enforces both RLS *and* table-level GRANTs. Without
-- these grants the anon role sees `42501 permission denied for table ...`
-- even though the RLS policy allows SELECT. The server-side query layer now
-- uses the service role key (bypasses both), so applying this migration is
-- optional — but required if anything reads Supabase with the anon key.

grant usage on schema public to anon, authenticated;

grant select on table
  public.customers,
  public.customer_identifiers,
  public.identity_links,
  public.events,
  public.journeys,
  public.patterns,
  public.churn_signals
to anon, authenticated;
