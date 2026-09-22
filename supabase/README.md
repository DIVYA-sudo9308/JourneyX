# JourneyX × Supabase

Hackathon-MVP backend. Project ref: `xmbfocscluhndxyodrwa`.

## One-time setup

1. Copy `.env.example` to `.env.local` and fill in `SUPABASE_URL`,
   `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (Supabase Studio →
   Project Settings → API).
2. Apply the schema. Either:
   - **Studio**: run `supabase/migrations/0001_init.sql`, then
     `supabase/migrations/0002_grants.sql` in the SQL Editor, or
   - **CLI**: `supabase link --project-ref xmbfocscluhndxyodrwa` and
     `supabase db push`.
3. Seed the deterministic dataset:
   ```
   npm run seed
   ```
   Progress prints per table; totals summarized at the end.

## What gets seeded

- 305 customers (264 known, 41 anonymous)
- ~7k events across web/mobile/call center/email/chat/in-store
- Journeys, patterns (drop-off/escalation/repeat-contact/unresolved), churn signals
- Customer identifiers + identity links (origin/deterministic/probabilistic)

Re-running `npm run seed` is idempotent: it wipes the tables first, then
re-inserts.

## Query path

Server components call `lib/queries/*` directly (SoT D-34). These queries require
`SUPABASE_URL` and either a service-role key or an anon key. The server prefers
the service-role key, falling back to the anon key. Keys stay on the server.
Missing configuration displays the route error boundary; mock fixtures are used
by the seed script, not as an automatic query fallback.

Dashboard date/channel filters select customers with matching events. Pattern
metrics additionally use the detection date and pattern channel (either end for
escalations). Churn is the selected customers' current risk. Without filters,
all profiles are included. Repeat-contact rate counts distinct affected customers;
friction ranking also counts distinct customers, while pattern KPIs count occurrences.
Queries paginate aggregate inputs and journey events to avoid PostgREST row caps.

## RLS

All tables enable RLS. The migration grants `SELECT` to `anon` +
`authenticated`. Writes require the service role key, which is used by
`scripts/seed.ts` and optionally by the server query layer.
