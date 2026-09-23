# JourneyX

> See the journey behind every interaction.

Cross-channel journey intelligence platform — resolves fragmented customer
identities, stitches events into unified journeys, and surfaces the friction
that costs customers. Built for **BIT N BUILD'26** (Gujarat Round, PS-4).

The sources of truth are in [`docs/`](docs/) — chiefly
[`docs/SOURCE_OF_TRUTH.md`](docs/SOURCE_OF_TRUTH.md) — and the brand system in
[`JourneyX_Brand_Assets/`](JourneyX_Brand_Assets/).

## Status

The full pipeline runs end to end. An event posted to `/api/v1/events` is
validated, normalized, deduplicated, resolved to a customer, stitched into that
customer's timeline and run through the detectors; the resulting profile,
identifiers, resolution evidence, patterns, churn signal, notifications and
dashboard numbers all change as a result.

Nothing in the UI is hardcoded: every figure is computed from the database, and
every identity edge shown is a decision recorded in `resolution_logs`.

See [`supabase/README.md`](supabase/README.md) to configure and seed the
database. A fresh checkout needs Supabase credentials.

## The pipeline

```
event → validate → normalize → deduplicate → resolve identity
      → store + audit → stitch → detect patterns → analytics → UI
```

| Stage | Module | What it does |
|---|---|---|
| Validate | `lib/pipeline/validate.ts` | Zod schema; unknown channels rejected, unknown event types accepted as `unknown` |
| Normalize | `lib/pipeline/normalize.ts` | Email lowercased, phone to E.164, loyalty/customer IDs uppercased, timestamps to UTC |
| Deduplicate | `lib/pipeline/normalize.ts` | `dedup_key`, UNIQUE forever — replays are idempotent |
| Resolve | `lib/identity/resolve.ts` | Strong deterministic lookup, then scored probabilistic matching with a contradiction filter |
| Stitch | `lib/journey/build.ts` | Sessions (≤30 min), journeys (≤24 h) and channel transitions, computed at read time |
| Detect | `lib/patterns/detect.ts` | Drop-off, escalation, repeat contact, unresolved issue, rule-based churn |
| Reconcile | `lib/patterns/reconcile.ts` | Re-evaluates a customer's whole history, so findings are retracted when they stop holding |

Identity resolution never merges profiles on conflicting strong identifiers: it
records the conflict, flags both profiles and raises a notification. Churn is
rule-based and explainable (R1–R4), never a model.

## API

| Method | Route |
|---|---|
| POST | `/api/v1/events` |
| POST | `/api/v1/events/batch` (≤ 50) |
| GET | `/api/v1/customers` |
| GET | `/api/v1/customers/search?q=` |
| GET | `/api/v1/customers/:id` |
| GET | `/api/v1/customers/:id/journey` |
| GET | `/api/v1/customers/:id/identity` |
| GET | `/api/v1/events/:id` |
| GET | `/api/v1/analytics/summary` |
| GET / POST | `/api/v1/notifications`, `/api/v1/notifications/read` |
| GET | `/api/v1/pipeline/health` |
| GET | `/api/v1/health` |

Errors use `{ error: { code, message, details? } }`. Service credentials, stack
traces and database details never reach the client.

Post an event:

```bash
curl -X POST http://localhost:3000/api/v1/events -H 'Content-Type: application/json' -d '{"channel":"web","event_type":"checkout_start","timestamp":"2026-09-22T10:00:00Z","identifiers":{"email":"priya.sharma@example.com"},"metadata":{"cart_value":4999}}'
```

## Tech stack (resolved at Milestone 1, per SoT D-49)

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js (App Router, RSC) | 16.3.5 |
| UI runtime | React / React DOM | 19.3.0 |
| Language | TypeScript (strict) | 6.0.3 |
| Styling | Tailwind CSS + CSS custom properties | 3.4.19 |
| Components | shadcn/ui (hand-placed) + Radix primitives | — |
| Icons | lucide-react | 1.47.0 |
| Fonts | Geist Sans (`geist`) + IBM Plex Mono (`next/font/google`) | — |
| Client data | SWR (search dropdown + notification bell only) | 2.5.1 |
| Lint | ESLint (flat config) + eslint-config-next | 10.x |

> TypeScript is pinned to the 6.x line: `typescript@7` (the new native
> compiler) is not yet supported by `typescript-eslint`, which
> `eslint-config-next` depends on.

## Design system

The UI implements the **"Convergent Thread"** brand system. Tokens live as CSS
custom properties in [`app/globals.css`](app/globals.css) and are mapped into
Tailwind in [`tailwind.config.ts`](tailwind.config.ts). See
[`docs/JOURNEYX_UI_UX_DESIGN_SYSTEM.md`](docs/JOURNEYX_UI_UX_DESIGN_SYSTEM.md).

- Primary / Ink `#0B1220` · Secondary / Slate `#344054` · Accent / Signal Teal `#10B7A5`
- Geist Sans (UI) + IBM Plex Mono (data/IDs/scores)
- Light-first with a derived dark mode (both shipped)

## Getting started

```bash
npm ci
# Configure .env.local and apply migrations; see supabase/README.md
npm run dev
```

Open http://localhost:3000 — the root redirects to `/dashboard`.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (flat config) |
| `npm run typecheck` | Generate Next.js route types, then `tsc --noEmit` |
| `npm test` | Engine tests: identity, deduplication, detectors, and the end-to-end demo scenario |
| `npm run seed` | Generate synthetic events and run them through the real pipeline |
| `npm run replay -- priya E12` | Replay the held-back demo event against a running server |

## Project structure

```
app/
  api/v1/                Ingestion + read APIs (thin wrappers over lib/queries)
  dashboard|customers|pipeline/   Business screens
  globals.css            Design tokens (Convergent Thread) + base styles
components/
  identity/              Fragments panel, convergence graph, resolution chain
  journey/ customer/ dashboard/ customers/   Screen components
  layout/ shared/ ui/    Shell, design-system pieces, shadcn primitives
lib/
  pipeline/              Validation, normalization, dedup, orchestration, store port
    adapters/            Supabase and in-memory implementations of the port
  identity/              Resolution engine + Jaro-Winkler
  patterns/              Detectors and reconciliation
  journey/               Timeline read model
  analytics/ queries/    KPI computation and the server-side data layer
  demo/fixtures.ts       Canonical demo scenarios, shared by seed/replay/tests
scripts/                 seed.ts, generate.ts, replay.ts
supabase/migrations/     0001_init · 0002_grants · 0003_intelligence
tests/                   Engine, detector and end-to-end scenario tests
docs/                    Sources of truth
```

## Testing

```bash
npm test
```

The engine tests run the **real** `processEvent` pipeline against an in-memory
implementation of the same store interface the Supabase adapter implements — so
they exercise the production code path, not a stand-in. They include the
documented "Frustrated Shopper" scenario and assert its expected end state from
`docs/SOURCE_OF_TRUTH.md` §7.3: one profile, 14 events, identity confidence
0.80, mean resolution confidence 0.886, and each of the five patterns.
