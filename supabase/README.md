# JourneyX × Supabase

Hackathon-MVP backend. Project ref: `xmbfocscluhndxyodrwa`.

## One-time setup

1. Copy `.env.example` to `.env.local` and fill in `SUPABASE_URL`,
   `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (Supabase Studio →
   Project Settings → API).
2. Apply the migrations **in order**. Either:
   - **Studio**: run `0001_init.sql`, `0002_grants.sql`, then
     `0003_intelligence.sql` in the SQL Editor, or
   - **CLI**: `supabase link --project-ref xmbfocscluhndxyodrwa` and
     `supabase db push`.
3. Seed:
   ```
   npm run seed
   ```

`0003_intelligence.sql` adds the pipeline tables and columns. It is additive
and idempotent, except that it drops three superseded tables — see below.

## Schema

Seven logical tables. The physical names come from `0001_init.sql` and are kept
because the whole query and UI layer is built on them; the canonical names from
`docs/SOURCE_OF_TRUTH.md` §4.3 map onto them one-to-one:

| Source-of-truth name | Physical table | Holds |
|---|---|---|
| `customer_profiles` | `customers` | Unified customer, counters, churn risk, conflict flag |
| `customer_identifiers` | `customer_identifiers` | Every identifier, with `link_method` + `link_confidence` |
| `events` | `events` | Stored events with `dedup_key`, `resolution_method`, `resolution_confidence` |
| `resolution_logs` | `resolution_logs` | One audit row per event: evidence, candidates, conflicts |
| `detected_patterns` | `patterns` | Findings keyed by `(customer_id, pattern_key)` |
| `pipeline_metrics` → `ingestion_log` (D-22) | `ingestion_log` | One row per ingestion attempt, with stage timings |
| `notifications` | `notifications` | Identity conflicts and high churn risk |

Primary keys are `TEXT` for `customers` and `events` (`cust_…`, `evt_…`) and
`UUID` elsewhere.

### Tables dropped by `0003`

`journeys`, `identity_links` and `churn_signals` are removed:

- **journeys** — sessions and journeys are computed at read time from event
  timestamps (SoT §4.7), so storing them can only go stale.
- **identity_links** — its `link_method` / `confidence` now live directly on
  `customer_identifiers` (the migration backfills them first).
- **churn_signals** — churn is a `detected_patterns` row of type
  `churn_signal`, whose `metadata.signals` holds the rules that fired.

All three held synthetic seed data only, which `npm run seed` regenerates.

### Constraints that carry meaning

- `events.dedup_key` is **UNIQUE**, permanently. That is what makes ingestion
  idempotent: replaying a payload returns `duplicate: true` instead of a second
  event.
- `uq_strong_identifier` makes `(identifier_type, identifier_value)` unique
  across all profiles for `email`, `phone` and `loyalty_id`. A competing claim
  is recorded as an identity conflict rather than silently merging profiles.
- `patterns (customer_id, pattern_key)` is UNIQUE, so re-evaluating a customer
  updates findings in place instead of stacking duplicates.

## Seeding

`npm run seed` does **not** insert conclusions. It generates raw events and runs
every one through `processEvent` — the same validate → normalize → deduplicate →
resolve → stitch → detect pipeline the API runs. Profiles, identifiers,
resolution logs, patterns, churn signals and notifications are all pipeline
output.

For speed the run executes against the in-memory store (thousands of events
would otherwise mean tens of thousands of network round trips) and the resulting
rows are bulk-inserted. The code that *decides* anything is identical either way.

Options:

```
npm run seed                 # ~320 profiles, ~3,500 events
npm run seed -- --count 120  # smaller dataset
```

The seeder prints what the pipeline decided: resolution-method mix, pattern
counts, churn distribution and conflicts. Those are the numbers to quote — not
any figure written in a document (SoT D-46).

Re-running wipes the tables first, so it is idempotent.

### The held-back demo event

The seed deliberately withholds Priya Sharma's second call-center contact
(fixture `E12`, SoT §7.6). Replay it live against a running server:

```
npm run replay -- priya E12
```

The response shows it resolved by phone at 1.00, stitched into its
chronological place three days earlier than its arrival, and the
repeat-contact pattern it created. Replaying it twice returns `duplicate: true`.

## Query path

Server Components call `lib/queries/*` directly (SoT D-34); the API routes are
thin wrappers over the same functions. Both need `SUPABASE_URL` and either a
service-role key or an anon key. The server prefers the service-role key.
Missing configuration renders the route error boundary.

## RLS

All tables enable RLS and grant `SELECT` to `anon` + `authenticated`. **Writes
require the service-role key**, which is used by `scripts/seed.ts` and by the
ingestion API on the server. The service-role key is read only in
`"server-only"` modules and never reaches the browser bundle.

When deployed, set `INGEST_TOKEN`; the ingestion endpoints (`POST /events`,
`/events/batch`) then require a matching `x-ingest-token` header (SoT D-21). A
production build with no `INGEST_TOKEN` rejects all ingestion rather than
accepting it anonymously. Every other `/api/v1` route, including
`POST /notifications/read` (called by the bell), requires a signed-in session;
only `/api/v1/health` is public.
