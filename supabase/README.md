# JourneyX × Supabase

Hackathon-MVP backend. Project ref: `xmbfocscluhndxyodrwa`.

## One-time setup

1. Copy `.env.example` to `.env.local` and fill in `SUPABASE_URL`,
   `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (Supabase Studio →
   Project Settings → API).
2. Apply the schema. Either:
   - **Studio**: paste `supabase/migrations/0001_init.sql` into the SQL Editor
     and Run, or
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

Server components call `lib/queries/*` directly (SoT D-34). Those functions
prefer Supabase whenever `SUPABASE_URL` + `SUPABASE_ANON_KEY` are set,
otherwise they fall back to the deterministic mock fixture — so `npm run dev`
never breaks in a fresh clone.

## RLS

All tables enable RLS. The migration grants `SELECT` to `anon` +
`authenticated`. Writes require the service role key, which is only used by
`scripts/seed.ts` (server-side).
