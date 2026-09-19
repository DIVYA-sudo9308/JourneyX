# JourneyX — Implementation Plan

**Version:** 1.0
**Date:** 2026-09-19
**Companions:** [PRD](PRD.md) · [TRD](TRD.md) · [App Flow](APP_FLOW.md) · [Data Model](DATA_MODEL.md) · [Architecture](ARCHITECTURE.md)
**Hackathon:** BIT N BUILD'26 — Gujarat Round

---

## Table of Contents

1. [Implementation Strategy](#1-implementation-strategy)
2. [Project Structure](#2-project-structure)
3. [Development Phases](#3-development-phases)
4. [Task Breakdown](#4-task-breakdown)
5. [Parallel Team Work](#5-parallel-team-work)
6. [Identity Resolution Implementation](#6-identity-resolution-implementation)
7. [Event Pipeline Implementation](#7-event-pipeline-implementation)
8. [Frontend Implementation](#8-frontend-implementation)
9. [Design System Implementation](#9-design-system-implementation)
10. [Testing Plan](#10-testing-plan)
11. [Demo Data](#11-demo-data)
12. [Deployment](#12-deployment)
13. [GitHub Strategy](#13-github-strategy)
14. [Documentation](#14-documentation)
15. [MVP Cut-Off](#15-mvp-cut-off)
16. [Final Demo Preparation](#16-final-demo-preparation)
17. [Final Checklist](#17-final-checklist)
18. [Final Output](#18-final-output)

---

## 1. Implementation Strategy

### 1.1 Build Order Principle

**Build from the inside out: data layer → processing logic → API → frontend.**

The dependency chain is:

```
Database Schema
  └──▶ Shared Types + Errors + Logger + DB Client
         └──▶ Validator + Normalizer + Deduplicator (pure logic, testable)
                └──▶ Identity Resolution (deterministic → probabilistic → conflicts)
                       └──▶ Pipeline Processor (orchestrator that wires validation through resolution)
                              └──▶ Journey Stitcher + Pattern Detectors
                                     └──▶ API Routes (thin controllers over the pipeline + query services)
                                            └──▶ Seed Script (generates demo data through the pipeline)
                                               └──▶ Frontend Pages (consume API routes)
                                                      └──▶ Polish + Demo Prep
```

### 1.2 Why This Order

| Principle | Rationale |
|---|---|
| **Database first** | Every service depends on the schema. Nothing can be integration-tested without it. |
| **Pure logic before I/O** | Validator, normalizer, probabilistic scorer can be unit-tested without a database. Build them first, verify with tests, then integrate. |
| **Identity before stitching** | The pipeline cannot store events without resolving their profile. Identity resolution is the core innovation — build it early, test it thoroughly. |
| **Pipeline before API** | API routes are thin wrappers. The pipeline is the hard part. Build the engine, then expose it. |
| **Seed before frontend** | The frontend needs data to display. The seed script exercises the full pipeline and creates the demo dataset. Build it before any frontend work. |
| **Frontend last** | Frontend is the most visible but least risky layer. With the API and seed data working, frontend is straightforward assembly of components consuming JSON. |

### 1.3 What NOT to Do

- Do NOT start with UI mockup implementation.
- Do NOT add authentication (no auth for MVP — TRD Section 14).
- Do NOT add WebSockets or SSE (polling via SWR — TRD Section 13).
- Do NOT add a message broker (synchronous pipeline — Architecture Section 7).
- Do NOT add Redis, caching layers, or materialized views.
- Do NOT build a settings page, admin panel, or report builder.
- Do NOT add CI/CD pipelines beyond git push → auto-deploy.

---

## 2. Project Structure

```
journeyx/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # Root layout (nav, search, notifications)
│   ├── page.tsx                      # Redirect to /dashboard
│   ├── globals.css                   # Tailwind + design tokens
│   ├── error.tsx                     # Global error boundary
│   ├── loading.tsx                   # Global loading state
│   │
│   ├── dashboard/
│   │   ├── page.tsx                  # Dashboard (analytics overview)
│   │   ├── loading.tsx               # Dashboard skeleton
│   │   └── error.tsx                 # Dashboard error boundary
│   │
│   ├── customers/
│   │   ├── page.tsx                  # Customer list with filters
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   └── [id]/
│   │       ├── page.tsx              # Customer profile
│   │       ├── loading.tsx
│   │       ├── journey/
│   │       │   ├── page.tsx          # Journey timeline
│   │       │   └── loading.tsx
│   │       └── identity/
│   │           ├── page.tsx          # Identity graph
│   │           └── loading.tsx
│   │
│   ├── pipeline/
│   │   └── page.tsx                  # Pipeline health (P2)
│   │
│   └── api/
│       └── v1/
│           ├── health/
│           │   └── route.ts          # GET /api/v1/health
│           ├── events/
│           │   ├── route.ts          # POST /api/v1/events
│           │   ├── batch/
│           │   │   └── route.ts      # POST /api/v1/events/batch
│           │   └── [id]/
│           │       └── route.ts      # GET /api/v1/events/:id
│           ├── customers/
│           │   ├── route.ts          # GET /api/v1/customers
│           │   ├── search/
│           │   │   └── route.ts      # GET /api/v1/customers/search
│           │   └── [id]/
│           │       ├── route.ts      # GET /api/v1/customers/:id
│           │       ├── journey/
│           │       │   └── route.ts  # GET /api/v1/customers/:id/journey
│           │       └── identity/
│           │           └── route.ts  # GET /api/v1/customers/:id/identity
│           ├── analytics/
│           │   └── summary/
│           │       └── route.ts      # GET /api/v1/analytics/summary
│           ├── notifications/
│           │   ├── route.ts          # GET /api/v1/notifications
│           │   └── read/
│           │       └── route.ts      # POST /api/v1/notifications/read
│           └── pipeline/
│               └── health/
│                   └── route.ts      # GET /api/v1/pipeline/health
│
├── components/                       # Shared React components
│   ├── ui/                           # shadcn/ui components (generated)
│   ├── layout/
│   │   ├── top-nav.tsx
│   │   ├── sidebar.tsx
│   │   ├── search-bar.tsx
│   │   └── notification-bell.tsx
│   ├── dashboard/
│   │   ├── kpi-card.tsx
│   │   └── analytics-chart.tsx
│   ├── customers/
│   │   ├── customer-table.tsx
│   │   ├── customer-row.tsx
│   │   ├── filter-sidebar.tsx
│   │   └── pagination.tsx
│   ├── journey/
│   │   ├── timeline.tsx
│   │   ├── event-card.tsx
│   │   ├── session-boundary.tsx
│   │   ├── journey-boundary.tsx
│   │   ├── timeline-filter-bar.tsx
│   │   └── pattern-badge.tsx
│   ├── identity/
│   │   ├── identity-graph.tsx
│   │   ├── resolution-history.tsx
│   │   └── confidence-meter.tsx
│   └── shared/
│       ├── channel-icon.tsx
│       ├── churn-risk-badge.tsx
│       ├── empty-state.tsx
│       ├── error-display.tsx
│       └── notification-dropdown.tsx
│
├── hooks/                            # Custom React hooks
│   ├── use-customers.ts
│   ├── use-customer.ts
│   ├── use-journey.ts
│   ├── use-identity.ts
│   ├── use-analytics.ts
│   ├── use-notifications.ts
│   └── use-search.ts
│
├── lib/                              # Backend business logic
│   ├── shared/
│   │   ├── types.ts                  # Shared TypeScript interfaces
│   │   ├── errors.ts                 # AppError class
│   │   ├── logger.ts                 # Structured JSON logger
│   │   ├── db.ts                     # Prisma Client singleton
│   │   ├── rate-limiter.ts           # In-memory rate limiter
│   │   └── notifications.ts         # Notification service
│   │
│   ├── pipeline/
│   │   ├── processor.ts              # Pipeline orchestrator
│   │   ├── validator.ts              # Zod validation
│   │   ├── normalizer.ts             # Timestamp, identifier, category normalization
│   │   └── deduplicator.ts           # SHA-256 dedup key check
│   │
│   ├── identity/
│   │   ├── resolver.ts               # Identity resolution orchestrator
│   │   ├── deterministic.ts          # Exact match on strong identifiers
│   │   ├── probabilistic.ts          # Weighted scoring on weak signals
│   │   ├── confidence.ts             # Confidence computation
│   │   ├── conflicts.ts              # Multi-profile conflict handler
│   │   └── explainability.ts         # Evidence record builder
│   │
│   ├── journey/
│   │   ├── stitcher.ts               # Timeline insertion + session/journey computation
│   │   ├── patterns.ts               # Pattern detection orchestrator
│   │   ├── dropoff.ts                # Drop-off detector
│   │   ├── escalation.ts             # Escalation detector
│   │   ├── repeat.ts                 # Repeat contact detector
│   │   ├── unresolved.ts             # Unresolved issue detector
│   │   └── churn.ts                  # Churn signal evaluator
│   │
│   └── analytics/
│       ├── aggregator.ts             # KPI computation orchestrator
│       └── queries.ts                # Prisma aggregate queries
│
├── prisma/
│   ├── schema.prisma                 # Prisma schema (7 tables)
│   └── seed.ts                       # Synthetic data seed script
│
├── scripts/
│   └── seed-demo.ts                  # Demo-specific seed (Priya Sharma scenario)
│
├── __tests__/                        # Test directory
│   ├── unit/
│   │   ├── validator.test.ts
│   │   ├── normalizer.test.ts
│   │   ├── deduplicator.test.ts
│   │   ├── deterministic.test.ts
│   │   ├── probabilistic.test.ts
│   │   ├── confidence.test.ts
│   │   ├── dropoff.test.ts
│   │   ├── escalation.test.ts
│   │   ├── repeat.test.ts
│   │   ├── unresolved.test.ts
│   │   └── churn.test.ts
│   ├── integration/
│   │   ├── pipeline.test.ts
│   │   ├── identity-resolution.test.ts
│   │   └── api-routes.test.ts
│   └── e2e/
│       └── demo-scenario.test.ts
│
├── docs/                             # Project documentation
│   ├── PRD.md
│   ├── TRD.md
│   ├── APP_FLOW.md
│   ├── DATA_MODEL.md
│   ├── ARCHITECTURE.md
│   └── IMPLEMENTATION_PLAN.md
│
├── .env.example                      # Environment variable template
├── .env.local                        # Local dev environment (gitignored)
├── .gitignore
├── next.config.ts                    # Next.js configuration
├── tailwind.config.ts                # Tailwind + design tokens
├── tsconfig.json                     # TypeScript configuration
├── package.json
├── vitest.config.ts                  # Test configuration
├── components.json                   # shadcn/ui configuration
├── postcss.config.mjs                # PostCSS for Tailwind
└── README.md
```

---

## 3. Development Phases

### Phase 0 — Repository & Infrastructure (Hour 0–1)

Set up the project skeleton. Everything depends on this.

### Phase 1 — Database & Shared Layer (Hour 1–3)

Prisma schema, migrations, shared types, error handling, logger, DB client.

### Phase 2 — Event Validation & Normalization (Hour 3–5)

Pure logic modules with unit tests. No database dependency for testing.

### Phase 3 — Identity Resolution (Hour 5–10)

The hardest and most important module. Deterministic matching, probabilistic scoring, conflict handling, explainability. Fully tested.

### Phase 4 — Pipeline Orchestrator & Storage (Hour 10–13)

Wire validation → normalization → dedup → identity → storage into a single pipeline. Integration test end-to-end.

### Phase 5 — Journey Stitching & Pattern Detection (Hour 13–17)

Stitcher, all 5 pattern detectors, notification creation. Wire into the pipeline.

### Phase 6 — API Routes (Hour 17–20)

Expose the pipeline and query layer as REST endpoints. Thin controllers.

### Phase 7 — Seed Script & Demo Data (Hour 20–23)

Build the synthetic data generator. Run it through the pipeline. Verify demo scenarios.

### Phase 8 — Frontend Shell & Core Pages (Hour 23–32)

Layout, navigation, dashboard, customer list, profile, journey timeline, identity graph.

### Phase 9 — Frontend Polish & Notifications (Hour 32–36)

Search bar, notification bell, filters, responsive tweaks, loading/error states.

### Phase 10 — Testing & Bug Fixes (Hour 36–40)

Integration tests, edge cases, fix bugs discovered during UI testing.

### Phase 11 — Deployment (Hour 40–42)

Deploy to Vercel + Neon (or Railway). Seed production database. Verify.

### Phase 12 — Demo Polish (Hour 42–48)

Screenshots, video recording, presentation, final README.

### Phase Dependency Graph

```
Phase 0 ──▶ Phase 1 ──▶ Phase 2 ──▶ Phase 3 ──▶ Phase 4 ──▶ Phase 5
                                                                │
                                                                ▼
                                                          Phase 6 ──▶ Phase 7
                                                                │
                                                                ▼
                                                          Phase 8 ──▶ Phase 9 ──▶ Phase 10
                                                                                     │
                                                                                     ▼
                                                                              Phase 11 ──▶ Phase 12
```

---

## 4. Task Breakdown

### Phase 0 — Repository & Infrastructure

---

#### T-001: Initialize Next.js project

| Attribute | Detail |
|---|---|
| **Description** | Create Next.js 14+ project with TypeScript, App Router, Tailwind CSS, ESLint. |
| **Dependencies** | None |
| **Files** | `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css` |
| **Expected Output** | `npm run dev` starts the application at `localhost:3000` with a blank page. |
| **Acceptance Criteria** | TypeScript compiles. Tailwind classes render. Dev server runs without errors. |
| **Priority** | P0 — Critical |

---

#### T-002: Install core dependencies

| Attribute | Detail |
|---|---|
| **Description** | Install: `prisma`, `@prisma/client`, `zod`, `swr`, `recharts`, `lucide-react`. Dev: `vitest`, `@testing-library/react`. Initialize shadcn/ui. |
| **Dependencies** | T-001 |
| **Files** | `package.json`, `components.json` |
| **Expected Output** | All packages install. `npx shadcn-ui init` creates the config. |
| **Acceptance Criteria** | `npm install` succeeds. No version conflicts. |
| **Priority** | P0 — Critical |

---

#### T-003: Create .env.example and .gitignore

| Attribute | Detail |
|---|---|
| **Description** | Create `.env.example` with `DATABASE_URL` and `NEXT_PUBLIC_APP_URL` placeholders. Add `.env.local`, `node_modules/`, `.next/` to `.gitignore`. |
| **Dependencies** | T-001 |
| **Files** | `.env.example`, `.gitignore`, `.env.local` |
| **Expected Output** | Template for environment variables. Secrets not committed. |
| **Acceptance Criteria** | `.env.local` is gitignored. `.env.example` documents all required variables. |
| **Priority** | P0 — Critical |

---

#### T-004: Initialize git repository

| Attribute | Detail |
|---|---|
| **Description** | `git init`. Create initial commit with project skeleton. |
| **Dependencies** | T-001, T-002, T-003 |
| **Files** | `.git/` |
| **Expected Output** | Git repo with initial commit. |
| **Acceptance Criteria** | `git log` shows one commit. No secrets in commit. |
| **Priority** | P0 — Critical |

---

### Phase 1 — Database & Shared Layer

---

#### T-005: Create Prisma schema

| Attribute | Detail |
|---|---|
| **Description** | Translate the 7-table SQL schema from DATA_MODEL Section 15 into `prisma/schema.prisma`. All 7 tables: `customer_profiles`, `customer_identifiers`, `events`, `resolution_logs`, `detected_patterns`, `pipeline_metrics`, `notifications`. Include all CHECK constraints (as Prisma enums or `@@map` with raw SQL), indexes, foreign keys, and defaults. |
| **Dependencies** | T-001, T-002 |
| **Files** | `prisma/schema.prisma` |
| **Expected Output** | Prisma schema that generates the exact PostgreSQL tables from DATA_MODEL. |
| **Acceptance Criteria** | `npx prisma validate` passes. Schema matches DATA_MODEL Section 3 column-for-column. |
| **Priority** | P0 — Critical |

---

#### T-006: Run initial migration

| Attribute | Detail |
|---|---|
| **Description** | Connect to local PostgreSQL (or Neon dev branch). Run `npx prisma migrate dev --name init`. Verify tables created. |
| **Dependencies** | T-005, `.env.local` with `DATABASE_URL` |
| **Files** | `prisma/migrations/` |
| **Expected Output** | 7 tables created in PostgreSQL with correct columns, constraints, indexes. |
| **Acceptance Criteria** | `npx prisma db push` succeeds. Introspecting the database shows all tables. |
| **Priority** | P0 — Critical |

---

#### T-007: Create Prisma Client singleton

| Attribute | Detail |
|---|---|
| **Description** | Create `lib/shared/db.ts` with the Prisma Client singleton pattern from TRD Section 5.6. |
| **Dependencies** | T-005 |
| **Files** | `lib/shared/db.ts` |
| **Expected Output** | Importable `prisma` client that reuses connections in development. |
| **Acceptance Criteria** | Can import `prisma` and execute `prisma.customerProfile.findMany()` without error. |
| **Priority** | P0 — Critical |

---

#### T-008: Create shared types

| Attribute | Detail |
|---|---|
| **Description** | Define all TypeScript interfaces in `lib/shared/types.ts`: `RawEvent`, `NormalizedEvent`, `ProcessingResult`, `ResolutionResult`, `JourneyEvent`, `DetectedPattern`, `AnalyticsSummary`, `Channel`, `EventCategory`, `PatternType`, `ChurnRisk`, `ResolutionMethod`, API response wrappers. |
| **Dependencies** | T-001 |
| **Files** | `lib/shared/types.ts` |
| **Expected Output** | Single source of truth for all TypeScript types shared between API and frontend. |
| **Acceptance Criteria** | All types compile. Types match the interfaces defined in TRD Sections 6.1, 7.1, 8.1, 9.1. |
| **Priority** | P0 — Critical |

---

#### T-009: Create AppError class

| Attribute | Detail |
|---|---|
| **Description** | Create `lib/shared/errors.ts` with the `AppError` class from TRD Section 5.4. Error codes: `VALIDATION_ERROR`, `NOT_FOUND`, `RATE_LIMITED`, `INTERNAL_ERROR`, `CONFLICT`. |
| **Dependencies** | T-001 |
| **Files** | `lib/shared/errors.ts` |
| **Expected Output** | Typed error class with code, statusCode, message, details. |
| **Acceptance Criteria** | `throw new AppError('NOT_FOUND', 404, 'Customer not found')` works. |
| **Priority** | P0 — Critical |

---

#### T-010: Create structured logger

| Attribute | Detail |
|---|---|
| **Description** | Create `lib/shared/logger.ts` with structured JSON logging (timestamp, level, module, event_id, profile_id, message, data). PII filtering: never log raw email/phone/name values — log type + hash only. |
| **Dependencies** | T-001 |
| **Files** | `lib/shared/logger.ts` |
| **Expected Output** | Logger with `info()`, `warn()`, `error()` methods that output JSON to stdout. |
| **Acceptance Criteria** | `logger.info('pipeline', 'Event processed', { event_id: '...' })` outputs valid JSON. No PII in output. |
| **Priority** | P1 — High |

---

#### T-011: Create rate limiter

| Attribute | Detail |
|---|---|
| **Description** | Create `lib/shared/rate-limiter.ts`. In-memory token bucket: 100 requests per second per client IP. Used only on ingestion endpoints. |
| **Dependencies** | T-001 |
| **Files** | `lib/shared/rate-limiter.ts` |
| **Expected Output** | `checkRateLimit(clientIp): boolean` function. |
| **Acceptance Criteria** | Returns `true` for first 100 calls in 1 second. Returns `false` on 101st. Resets after window. |
| **Priority** | P2 — Medium |

---

### Phase 2 — Event Validation & Normalization

---

#### T-012: Implement event validator

| Attribute | Detail |
|---|---|
| **Description** | Create `lib/pipeline/validator.ts`. Zod schema from TRD Section 5.3: channel enum, non-empty event_type, parseable timestamp string, at least one non-empty identifier, optional metadata object. Return `ValidatedRawEvent` or throw `AppError(VALIDATION_ERROR, 400)` with field-level errors. |
| **Dependencies** | T-008 (types), T-009 (errors) |
| **Files** | `lib/pipeline/validator.ts` |
| **Expected Output** | `validate(input: unknown): ValidatedRawEvent` function. |
| **Acceptance Criteria** | Rejects: missing channel, empty identifiers, invalid email format. Accepts: minimal valid event with one identifier. |
| **Priority** | P0 — Critical |

---

#### T-013: Write validator unit tests

| Attribute | Detail |
|---|---|
| **Description** | Test all validation rules: valid events (all channels, various identifier combos), invalid events (missing fields, bad enum, no identifiers, invalid email, empty string identifiers, null identifiers, missing metadata). |
| **Dependencies** | T-012 |
| **Files** | `__tests__/unit/validator.test.ts` |
| **Expected Output** | 15+ test cases covering every validation rule. |
| **Acceptance Criteria** | All tests pass. Coverage: every validation rule has at least one positive and one negative test. |
| **Priority** | P0 — Critical |

---

#### T-014: Implement event normalizer

| Attribute | Detail |
|---|---|
| **Description** | Create `lib/pipeline/normalizer.ts`. Assign UUID. Parse timestamp to UTC Date (reject Invalid Date, reject >1 hour future). Lowercase+trim emails. Digits-only phones. Trim names. Map `event_type` to `event_category` using taxonomy. Generate SHA-256 `dedup_key` per TRD Section 6.4. Preserve raw payload. |
| **Dependencies** | T-008 (types) |
| **Files** | `lib/pipeline/normalizer.ts` |
| **Expected Output** | `normalize(validated: ValidatedRawEvent): NormalizedEvent` function. |
| **Acceptance Criteria** | Email lowercased. Phone stripped to digits. Timestamp parsed to UTC. UUID assigned. dedup_key is SHA-256 hex. Unknown event_type maps to event_category based on taxonomy. |
| **Priority** | P0 — Critical |

---

#### T-015: Write normalizer unit tests

| Attribute | Detail |
|---|---|
| **Description** | Test: timestamp parsing (ISO, with timezone, without timezone, future rejection), identifier normalization (uppercase email, phone with dashes, name with whitespace), event type to category mapping, dedup key determinism (same input → same key), UUID uniqueness. |
| **Dependencies** | T-014 |
| **Files** | `__tests__/unit/normalizer.test.ts` |
| **Expected Output** | 12+ test cases. |
| **Acceptance Criteria** | All tests pass. |
| **Priority** | P0 — Critical |

---

#### T-016: Implement deduplicator

| Attribute | Detail |
|---|---|
| **Description** | Create `lib/pipeline/deduplicator.ts`. Query `events` table for matching `dedup_key` within 5-minute window. Return `{ isDuplicate: boolean, existingEventId?: string }`. |
| **Dependencies** | T-007 (db), T-008 (types) |
| **Files** | `lib/pipeline/deduplicator.ts` |
| **Expected Output** | `checkDuplicate(event: NormalizedEvent): Promise<DedupResult>` function. |
| **Acceptance Criteria** | Returns `isDuplicate: false` for new events. Returns `isDuplicate: true` with existing event ID for duplicate key within window. |
| **Priority** | P0 — Critical |

---

### Phase 3 — Identity Resolution

---

#### T-017: Implement deterministic matcher

| Attribute | Detail |
|---|---|
| **Description** | Create `lib/identity/deterministic.ts`. For each strong identifier (email, phone, loyalty_id) present on the event: query `customer_identifiers` WHERE `identifier_type = :type AND identifier_value = :value`. Collect matching profile IDs. Return: `{ matched: boolean, profiles: [{profileId, matchedField, matchedValue}], uniqueProfiles: string[] }`. |
| **Dependencies** | T-007 (db), T-008 (types) |
| **Files** | `lib/identity/deterministic.ts` |
| **Expected Output** | `matchDeterministic(identifiers: NormalizedIdentifiers): Promise<DeterministicResult>` |
| **Acceptance Criteria** | Returns 0 matches for unknown identifiers. Returns 1 match for known email. Returns 2+ for conflicting strong identifiers. |
| **Priority** | P0 — Critical |

---

#### T-018: Implement probabilistic scorer

| Attribute | Detail |
|---|---|
| **Description** | Create `lib/identity/probabilistic.ts`. For weak identifiers (device_id: 0.60, cookie_id: 0.30, name: 0.20, temporal_proximity: 0.10): query candidate profiles, compute weighted score, compute confidence as score/max_possible. Name matching uses Jaro-Winkler (implement inline — ~40 lines). Sort candidates by confidence descending. Cap combined score at 0.94. |
| **Dependencies** | T-007 (db), T-008 (types) |
| **Files** | `lib/identity/probabilistic.ts` |
| **Expected Output** | `scoreProbabilistic(event: NormalizedEvent, candidateProfileIds: string[]): Promise<ProbabilisticCandidate[]>` |
| **Acceptance Criteria** | device_id match contributes 0.60. cookie_id match contributes 0.30. Name with 92% Jaro-Winkler contributes 0.184. Total capped at 0.94. Candidates sorted descending. |
| **Priority** | P0 — Critical |

---

#### T-019: Implement Jaro-Winkler similarity

| Attribute | Detail |
|---|---|
| **Description** | Implement Jaro-Winkler string similarity algorithm inline in `lib/identity/probabilistic.ts` (no external dependency). Threshold for name matching: 0.85. |
| **Dependencies** | None |
| **Files** | `lib/identity/probabilistic.ts` (inline function) |
| **Expected Output** | `jaroWinkler(s1: string, s2: string): number` returning 0.0–1.0 |
| **Acceptance Criteria** | `jaroWinkler("martha", "marhta")` ≈ 0.961. `jaroWinkler("priya", "priya")` = 1.0. `jaroWinkler("alice", "bob")` < 0.5. |
| **Priority** | P0 — Critical |

---

#### T-020: Write probabilistic scorer unit tests

| Attribute | Detail |
|---|---|
| **Description** | Test: single signal match, multiple signal match, score capping at 0.94, name fuzzy matching (exact, similar, dissimilar), temporal proximity, no candidates → empty list, confidence calculation (score/max_possible). |
| **Dependencies** | T-018, T-019 |
| **Files** | `__tests__/unit/probabilistic.test.ts` |
| **Expected Output** | 10+ test cases with deterministic expected values. |
| **Acceptance Criteria** | All tests pass. Edge cases covered. |
| **Priority** | P0 — Critical |

---

#### T-021: Implement confidence module

| Attribute | Detail |
|---|---|
| **Description** | Create `lib/identity/confidence.ts`. Functions: `computeConfidence(score, maxPossible)`, `categorizeConfidence(score)` → 'high' (≥0.90), 'medium' (0.70–0.89), 'low' (<0.70). Threshold constant: `MATCH_THRESHOLD = 0.70`. |
| **Dependencies** | T-008 (types) |
| **Files** | `lib/identity/confidence.ts` |
| **Expected Output** | Confidence computation and categorization functions. |
| **Acceptance Criteria** | Correct threshold application. Categories match ranges. |
| **Priority** | P0 — Critical |

---

#### T-022: Implement conflict handler

| Attribute | Detail |
|---|---|
| **Description** | Create `lib/identity/conflicts.ts`. When deterministic matching returns 2+ profiles: query event counts for each profile, select the one with the most events as winner, record conflict details (both profiles, matching identifiers, event counts), create a notification. DO NOT merge profiles. |
| **Dependencies** | T-007 (db), T-008 (types) |
| **Files** | `lib/identity/conflicts.ts` |
| **Expected Output** | `handleConflict(conflictingProfiles, event): Promise<ConflictResult>` |
| **Acceptance Criteria** | Returns winner profile (most events). Records conflict. Creates notification. Does NOT merge or delete profiles. |
| **Priority** | P0 — Critical |

---

#### T-023: Implement explainability module

| Attribute | Detail |
|---|---|
| **Description** | Create `lib/identity/explainability.ts`. Build evidence records per DATA_MODEL Section 8. Each evidence entry: `{ signal, identifier_type, identifier_value, weight, score, matched, details }`. Build candidates structure. Build conflict_details structure. |
| **Dependencies** | T-008 (types) |
| **Files** | `lib/identity/explainability.ts` |
| **Expected Output** | `buildEvidence(matchDetails): EvidenceEntry[]`, `buildCandidates(candidates): CandidateEntry[]` |
| **Acceptance Criteria** | Evidence is a complete record of why the resolution decision was made. Every signal is documented. |
| **Priority** | P0 — Critical |

---

#### T-024: Implement identity resolver (orchestrator)

| Attribute | Detail |
|---|---|
| **Description** | Create `lib/identity/resolver.ts`. The main orchestrator: extract identifiers → deterministic match → (if no match) probabilistic scoring → (if score ≥ 0.70) link to profile → (if score < 0.70) create new profile → (if 2+ profiles) handle conflict → expand identifiers → write resolution log. Use Prisma `$transaction` for atomicity. |
| **Dependencies** | T-017, T-018, T-021, T-022, T-023 |
| **Files** | `lib/identity/resolver.ts` |
| **Expected Output** | `resolve(event: NormalizedEvent): Promise<ResolutionResult>` |
| **Acceptance Criteria** | Known email → deterministic match (confidence 1.0). Unknown identifiers → new profile. Two profiles matched → conflict handled. Identifiers expanded on the matched profile. Resolution log written. |
| **Priority** | P0 — Critical |

---

#### T-025: Write identity resolution integration tests

| Attribute | Detail |
|---|---|
| **Description** | Test against a real database: (1) First event creates new profile. (2) Second event with same email matches deterministically. (3) Third event with same device_id matches probabilistically. (4) Fourth event with conflicting strong identifiers triggers conflict. (5) Identifier expansion adds new identifiers to existing profiles. (6) Resolution logs contain correct evidence. |
| **Dependencies** | T-024 |
| **Files** | `__tests__/integration/identity-resolution.test.ts` |
| **Expected Output** | 8+ integration tests with database setup/teardown. |
| **Acceptance Criteria** | All tests pass against a real PostgreSQL instance. |
| **Priority** | P0 — Critical |

---

### Phase 4 — Pipeline Orchestrator & Storage

---

#### T-026: Implement pipeline processor

| Attribute | Detail |
|---|---|
| **Description** | Create `lib/pipeline/processor.ts`. Orchestrate: validate → normalize → deduplicate → resolve identity → store event → stitch → detect patterns → record pipeline metrics. Return `ProcessingResult`. |
| **Dependencies** | T-012, T-014, T-016, T-024 |
| **Files** | `lib/pipeline/processor.ts` |
| **Expected Output** | `processEvent(raw: unknown): Promise<ProcessingResult>` |
| **Acceptance Criteria** | Valid event → stored in DB, profile created/updated, resolution logged, metrics recorded. Invalid event → AppError thrown. Duplicate → short-circuit with `{duplicate: true}`. |
| **Priority** | P0 — Critical |

---

#### T-027: Write pipeline integration tests

| Attribute | Detail |
|---|---|
| **Description** | End-to-end pipeline test: submit raw event JSON → verify event in DB, profile created, identifiers linked, resolution log written, pipeline metric recorded. Test invalid event → error returned, nothing in DB. Test duplicate → early return. |
| **Dependencies** | T-026 |
| **Files** | `__tests__/integration/pipeline.test.ts` |
| **Expected Output** | 6+ integration tests. |
| **Acceptance Criteria** | All tests pass. Database state verified after each test. |
| **Priority** | P0 — Critical |

---

### Phase 5 — Journey Stitching & Pattern Detection

---

#### T-028: Implement journey stitcher

| Attribute | Detail |
|---|---|
| **Description** | Create `lib/journey/stitcher.ts`. After event storage: update profile `event_count`, `last_seen_at`, `channels_used`, `channel_count`, `updated_at`. On query: compute sessions (30-min gap), journey boundaries (24-hour gap), cross-channel transitions. Return `JourneyEvent[]` with `session_index`, `journey_index`, `is_transition`. |
| **Dependencies** | T-007 (db), T-008 (types) |
| **Files** | `lib/journey/stitcher.ts` |
| **Expected Output** | `updateProfileMetadata(profileId, event)`, `getJourneyTimeline(profileId, filters): JourneyEvent[]` |
| **Acceptance Criteria** | Profile metadata increments correctly. Sessions split at 30-min gaps. Journeys split at 24-hour gaps. Transitions detected when channel changes between consecutive events. |
| **Priority** | P0 — Critical |

---

#### T-029: Implement drop-off detector

| Attribute | Detail |
|---|---|
| **Description** | Create `lib/journey/dropoff.ts`. Three process definitions: (1) `checkout_start` without `purchase_complete` within 2 hours. (2) `form_start` without `form_submit` within 1 hour. (3) `application_start` without `application_complete` within 24 hours. Check the customer's recent events for unmatched start events. |
| **Dependencies** | T-008 (types) |
| **Files** | `lib/journey/dropoff.ts` |
| **Expected Output** | `detectDropOffs(profileId, events, asOf): DetectedPattern[]` |
| **Acceptance Criteria** | Detects checkout abandonment. Does not fire if purchase_complete exists within window. Time-based evaluation correct. |
| **Priority** | P0 — Critical |

---

#### T-030: Implement escalation detector

| Attribute | Detail |
|---|---|
| **Description** | Create `lib/journey/escalation.ts`. Channel tiers: `web=1, mobile=1, email=2, chat=2, call_center=3, in_store=4`. Detect when a customer contacts a higher-tier channel within 24 hours of a lower-tier contact. Only trigger on assisted-contact starts (call_started, store_visit), not call-ended events. |
| **Dependencies** | T-008 (types) |
| **Files** | `lib/journey/escalation.ts` |
| **Expected Output** | `detectEscalations(profileId, events, asOf): DetectedPattern[]` |
| **Acceptance Criteria** | web → call_center within 24h = escalation. call_center → web = NOT escalation (downward). web → web = NOT escalation (same tier). |
| **Priority** | P0 — Critical |

---

#### T-031: Implement repeat contact detector

| Attribute | Detail |
|---|---|
| **Description** | Create `lib/journey/repeat.ts`. Count support-category events within a 7-day window. If ≥ 2 support contacts in 7 days, create a repeat contact pattern. |
| **Dependencies** | T-008 (types) |
| **Files** | `lib/journey/repeat.ts` |
| **Expected Output** | `detectRepeatContacts(profileId, events, asOf): DetectedPattern[]` |
| **Acceptance Criteria** | 2 support calls in 5 days = repeat. 1 support call = not repeat. 2 browse events = not repeat (wrong category). |
| **Priority** | P0 — Critical |

---

#### T-032: Implement unresolved issue detector

| Attribute | Detail |
|---|---|
| **Description** | Create `lib/journey/unresolved.ts`. Match `ticket_created` events that lack a corresponding `ticket_resolved` event within 7 days. |
| **Dependencies** | T-008 (types) |
| **Files** | `lib/journey/unresolved.ts` |
| **Expected Output** | `detectUnresolved(profileId, events, asOf): DetectedPattern[]` |
| **Acceptance Criteria** | ticket_created 8 days ago without resolution = unresolved. ticket_created + ticket_resolved within 7 days = NOT unresolved. |
| **Priority** | P0 — Critical |

---

#### T-033: Implement churn signal evaluator

| Attribute | Detail |
|---|---|
| **Description** | Create `lib/journey/churn.ts`. Four rules: (1) 3+ support contacts + unresolved = high. (2) escalation + 14+ days inactivity = high. (3) repeated drop-offs (2+) = medium. (4) declining engagement (30+ days since last event) = medium. Aggregate to overall risk: any high → high, any medium → medium, else none. Update `customer_profiles.churn_risk`. |
| **Dependencies** | T-007 (db), T-008 (types) |
| **Files** | `lib/journey/churn.ts` |
| **Expected Output** | `evaluateChurnRisk(profileId, events, patterns, asOf): ChurnResult` |
| **Acceptance Criteria** | Profile with 3 support + unresolved → churn_risk = 'high'. Profile with 2 drop-offs → 'medium'. Profile with no patterns → 'none'. |
| **Priority** | P0 — Critical |

---

#### T-034: Implement pattern detection orchestrator

| Attribute | Detail |
|---|---|
| **Description** | Create `lib/journey/patterns.ts`. Run all 5 detectors (drop-off, escalation, repeat, unresolved, churn). Each detector runs in try/catch — one detector failure doesn't stop the others. Reconcile patterns: stable IDs, update existing patterns, remove stale patterns (per CHANGELOG correction #4). Create notifications for WARNING/CRITICAL patterns. Update profile flags (`has_drop_off`, `has_escalation`, etc.). |
| **Dependencies** | T-029, T-030, T-031, T-032, T-033 |
| **Files** | `lib/journey/patterns.ts` |
| **Expected Output** | `detectPatterns(profileId, event): Promise<DetectedPattern[]>` |
| **Acceptance Criteria** | All 5 detectors run. Individual failure logged + others continue. Profile flags updated. Notifications created for high-severity patterns. |
| **Priority** | P0 — Critical |

---

#### T-035: Write pattern detector unit tests

| Attribute | Detail |
|---|---|
| **Description** | Unit tests for each detector (drop-off, escalation, repeat, unresolved, churn). Test positive detection, negative (no pattern), edge cases (exactly at time boundary, exactly at threshold). |
| **Dependencies** | T-029, T-030, T-031, T-032, T-033 |
| **Files** | `__tests__/unit/dropoff.test.ts`, `__tests__/unit/escalation.test.ts`, `__tests__/unit/repeat.test.ts`, `__tests__/unit/unresolved.test.ts`, `__tests__/unit/churn.test.ts` |
| **Expected Output** | 25+ test cases across all detectors. |
| **Acceptance Criteria** | All tests pass. Each detector has at least 4 test cases. |
| **Priority** | P0 — Critical |

---

### Phase 6 — API Routes

---

#### T-036: Implement POST /api/v1/events

| Attribute | Detail |
|---|---|
| **Description** | Create `app/api/v1/events/route.ts`. Parse JSON body, rate limit check, call `processEvent()`, return 202 with `{event_id, profile_id, resolution}` or 400/429/500. |
| **Dependencies** | T-026 (processor), T-011 (rate limiter) |
| **Files** | `app/api/v1/events/route.ts` |
| **Expected Output** | Working event ingestion endpoint. |
| **Acceptance Criteria** | Valid event → 202. Invalid → 400 with field errors. Duplicate → 202 with `duplicate: true`. |
| **Priority** | P0 — Critical |

---

#### T-037: Implement POST /api/v1/events/batch

| Attribute | Detail |
|---|---|
| **Description** | Create `app/api/v1/events/batch/route.ts`. Accept `{events: RawEvent[]}` (max 100). Process sequentially. Return `{processed, failed, results[]}`. |
| **Dependencies** | T-026, T-036 |
| **Files** | `app/api/v1/events/batch/route.ts` |
| **Expected Output** | Batch ingestion endpoint. |
| **Acceptance Criteria** | 100 events processed sequentially. Mixed success/failure reported per-event. |
| **Priority** | P0 — Critical |

---

#### T-038: Implement GET /api/v1/customers

| Attribute | Detail |
|---|---|
| **Description** | Paginated customer list with filters: `page`, `pageSize`, `pattern`, `channel`, `churnRisk`, `minConfidence`, `dateFrom`, `dateTo`, `sortBy`, `sortOrder`. Query `customer_profiles` with Prisma. Mask PII in list responses. |
| **Dependencies** | T-007, T-008 |
| **Files** | `app/api/v1/customers/route.ts` |
| **Expected Output** | Paginated JSON response with customer summaries. |
| **Acceptance Criteria** | Pagination works. Filters apply correctly. PII masked (email → `j***@example.com`). |
| **Priority** | P0 — Critical |

---

#### T-039: Implement GET /api/v1/customers/search

| Attribute | Detail |
|---|---|
| **Description** | Search customers by identifier value. Query `customer_identifiers` WHERE `identifier_value ILIKE $1`. Return matching profiles. |
| **Dependencies** | T-007, T-008 |
| **Files** | `app/api/v1/customers/search/route.ts` |
| **Expected Output** | Search results with profile summaries. |
| **Acceptance Criteria** | Search by partial email returns matching profiles. Search by phone returns matches. Empty query returns error. |
| **Priority** | P0 — Critical |

---

#### T-040: Implement GET /api/v1/customers/:id

| Attribute | Detail |
|---|---|
| **Description** | Single customer profile with full detail: profile data, identifier count, event count, pattern summary, churn risk. |
| **Dependencies** | T-007, T-008 |
| **Files** | `app/api/v1/customers/[id]/route.ts` |
| **Expected Output** | Full customer profile JSON. |
| **Acceptance Criteria** | Valid UUID → profile data. Invalid UUID → 404. |
| **Priority** | P0 — Critical |

---

#### T-041: Implement GET /api/v1/customers/:id/journey

| Attribute | Detail |
|---|---|
| **Description** | Journey timeline. Query events for profile, compute sessions/journeys via `stitcher.getJourneyTimeline()`. Apply filters (channel, eventType, dateFrom, dateTo, pattern). Annotate events with patterns. |
| **Dependencies** | T-028 (stitcher), T-007 |
| **Files** | `app/api/v1/customers/[id]/journey/route.ts` |
| **Expected Output** | `JourneyEvent[]` with session_index, journey_index, is_transition, patterns. |
| **Acceptance Criteria** | Events sorted by timestamp. Sessions computed. Filters applied. Patterns annotated. |
| **Priority** | P0 — Critical |

---

#### T-042: Implement GET /api/v1/customers/:id/identity

| Attribute | Detail |
|---|---|
| **Description** | Identity graph data. Query `customer_identifiers` and `resolution_logs` for profile. Return identifiers with confidence, resolution history with evidence. |
| **Dependencies** | T-007, T-008 |
| **Files** | `app/api/v1/customers/[id]/identity/route.ts` |
| **Expected Output** | Identifiers + resolution history JSON. |
| **Acceptance Criteria** | All identifiers returned with type, value, confidence, source_channel. Resolution logs returned with method, evidence, candidates. |
| **Priority** | P0 — Critical |

---

#### T-043: Implement GET /api/v1/events/:id

| Attribute | Detail |
|---|---|
| **Description** | Single event detail. Full event data including metadata, identifiers, resolution info. |
| **Dependencies** | T-007, T-008 |
| **Files** | `app/api/v1/events/[id]/route.ts` |
| **Expected Output** | Full event JSON. |
| **Acceptance Criteria** | Valid UUID → event data. Invalid → 404. |
| **Priority** | P1 — High |

---

#### T-044: Implement GET /api/v1/analytics/summary

| Attribute | Detail |
|---|---|
| **Description** | Create `lib/analytics/aggregator.ts` and `lib/analytics/queries.ts`. Compute KPIs: total customers, total events, events by channel, resolution method distribution, confidence distribution, pattern counts, churn risk distribution, drop-offs by process, escalations by channel pair. Apply optional filters (dateFrom, dateTo, channel). |
| **Dependencies** | T-007, T-008 |
| **Files** | `lib/analytics/aggregator.ts`, `lib/analytics/queries.ts`, `app/api/v1/analytics/summary/route.ts` |
| **Expected Output** | `AnalyticsSummary` JSON with KPIs and chart data. |
| **Acceptance Criteria** | All KPIs compute correctly. Filters work. Empty database returns zeros. |
| **Priority** | P0 — Critical |

---

#### T-045: Implement GET /api/v1/notifications

| Attribute | Detail |
|---|---|
| **Description** | Create `lib/shared/notifications.ts` and API route. Return notifications sorted by `created_at` desc. Include unread count. Support `?unreadOnly=true`. |
| **Dependencies** | T-007, T-008 |
| **Files** | `lib/shared/notifications.ts`, `app/api/v1/notifications/route.ts` |
| **Expected Output** | Notification list with unread count. |
| **Acceptance Criteria** | Returns notifications. Unread count accurate. |
| **Priority** | P1 — High |

---

#### T-046: Implement POST /api/v1/notifications/read

| Attribute | Detail |
|---|---|
| **Description** | Mark notifications as read. Accept `{ids: string[]}` or `{all: true}`. Update `read = true`. |
| **Dependencies** | T-045 |
| **Files** | `app/api/v1/notifications/read/route.ts` |
| **Expected Output** | Notifications marked as read. |
| **Acceptance Criteria** | Specific IDs marked. `all: true` marks all. |
| **Priority** | P1 — High |

---

#### T-047: Implement GET /api/v1/pipeline/health

| Attribute | Detail |
|---|---|
| **Description** | Query `pipeline_metrics` for stage counts, error counts, throughput. |
| **Dependencies** | T-007, T-008 |
| **Files** | `app/api/v1/pipeline/health/route.ts` |
| **Expected Output** | Pipeline health summary JSON. |
| **Acceptance Criteria** | Stage counts accurate. Error messages included. |
| **Priority** | P2 — Medium |

---

#### T-048: Implement GET /api/v1/health

| Attribute | Detail |
|---|---|
| **Description** | Simple health check. Verify database connectivity. Return `{status: 'ok', timestamp}` or `{status: 'error'}`. |
| **Dependencies** | T-007 |
| **Files** | `app/api/v1/health/route.ts` |
| **Expected Output** | Health check response. |
| **Acceptance Criteria** | Returns 200 when DB is reachable. Returns 503 when DB is down. |
| **Priority** | P1 — High |

---

### Phase 7 — Seed Script & Demo Data

---

#### T-049: Implement seed script

| Attribute | Detail |
|---|---|
| **Description** | Create `prisma/seed.ts`. Generate ~500 customers with ~15,000 events across all 6 channels. Include the Priya Sharma demo scenario and the Support Loop demo scenario. Seed data flows through the full pipeline (POST /events/batch or direct `processEvent()` calls). See Section 11 for exact demo data specification. |
| **Dependencies** | T-026 (processor), T-034 (patterns) |
| **Files** | `prisma/seed.ts`, `scripts/seed-demo.ts` |
| **Expected Output** | Running `npx prisma db seed` populates the database with ~500 profiles, ~15,000 events, resolution logs, detected patterns, and notifications. |
| **Acceptance Criteria** | Priya Sharma profile exists with all 12 demo events. All 5 pattern types are represented. Churn risk distribution: some high, some medium, some none. All 6 channels used. |
| **Priority** | P0 — Critical |

---

### Phase 8 — Frontend Shell & Core Pages

---

#### T-050: Install shadcn/ui components

| Attribute | Detail |
|---|---|
| **Description** | Add shadcn/ui components: `button`, `card`, `badge`, `table`, `input`, `select`, `checkbox`, `slider`, `dialog`, `dropdown-menu`, `tabs`, `tooltip`, `separator`, `skeleton`, `scroll-area`. |
| **Dependencies** | T-002 |
| **Files** | `components/ui/*` |
| **Expected Output** | All UI primitives available for use. |
| **Acceptance Criteria** | Components render correctly. Dark mode support via Tailwind. |
| **Priority** | P0 — Critical |

---

#### T-051: Implement design tokens in Tailwind config

| Attribute | Detail |
|---|---|
| **Description** | Add channel colors, pattern colors, and semantic tokens to `tailwind.config.ts`. See Section 9 for complete specification. |
| **Dependencies** | T-001 |
| **Files** | `tailwind.config.ts`, `app/globals.css` |
| **Expected Output** | CSS custom properties and Tailwind utility classes for all design tokens. |
| **Acceptance Criteria** | `text-channel-web` renders blue. `bg-pattern-dropoff` renders red. Dark mode inverts correctly. |
| **Priority** | P0 — Critical |

---

#### T-052: Implement root layout with navigation

| Attribute | Detail |
|---|---|
| **Description** | Create `app/layout.tsx` with: sidebar (Dashboard, Customers, Pipeline links), top nav bar (logo, search bar placeholder, notification bell placeholder). Responsive: sidebar collapses on mobile. Active link highlighting. |
| **Dependencies** | T-050, T-051 |
| **Files** | `app/layout.tsx`, `components/layout/sidebar.tsx`, `components/layout/top-nav.tsx` |
| **Expected Output** | Application shell with navigation. All pages render inside the layout. |
| **Acceptance Criteria** | Sidebar links navigate correctly. Active state shows on current route. Responsive on mobile. |
| **Priority** | P0 — Critical |

---

#### T-053: Implement Dashboard page

| Attribute | Detail |
|---|---|
| **Description** | Create `app/dashboard/page.tsx`. Server component for initial load. 9 KPI cards (total customers, total events, events today, unique channels, avg confidence, active patterns, high churn, medium churn, resolution rate). Chart grid: events by channel (bar), resolution methods (pie), confidence distribution (histogram), drop-offs by process (bar), escalations by pair (bar), churn distribution (pie). Date range and channel filters. SWR with 30s refresh. |
| **Dependencies** | T-044 (analytics API), T-050, T-051 |
| **Files** | `app/dashboard/page.tsx`, `components/dashboard/kpi-card.tsx`, `components/dashboard/analytics-chart.tsx`, `hooks/use-analytics.ts` |
| **Expected Output** | Working dashboard with real data from the analytics API. |
| **Acceptance Criteria** | KPIs display correct values. Charts render with Recharts. Filters update the view. Auto-refresh at 30s. |
| **Priority** | P0 — Critical |

---

#### T-054: Implement Customer List page

| Attribute | Detail |
|---|---|
| **Description** | Create `app/customers/page.tsx`. Paginated table with columns: name, channels, event count, confidence, churn risk, patterns. Filter sidebar: pattern checkboxes, channel checkboxes, churn risk select, confidence slider, date range picker. Sorting by column header click. Pagination controls. URL state for all filters. |
| **Dependencies** | T-038 (customers API), T-050 |
| **Files** | `app/customers/page.tsx`, `components/customers/customer-table.tsx`, `components/customers/customer-row.tsx`, `components/customers/filter-sidebar.tsx`, `components/customers/pagination.tsx`, `hooks/use-customers.ts` |
| **Expected Output** | Working customer list with filters, sorting, pagination. |
| **Acceptance Criteria** | Table renders customers. Filters narrow results. Pagination works. Clicking a row navigates to `/customers/[id]`. |
| **Priority** | P0 — Critical |

---

#### T-055: Implement Customer Profile page

| Attribute | Detail |
|---|---|
| **Description** | Create `app/customers/[id]/page.tsx`. Server component. Display: name, churn risk badge, channel badges, event count, first/last seen, avg confidence, pattern summary cards (counts per type). Navigation links to journey timeline and identity graph. |
| **Dependencies** | T-040 (customer detail API), T-050 |
| **Files** | `app/customers/[id]/page.tsx`, `components/shared/churn-risk-badge.tsx`, `components/shared/channel-icon.tsx` |
| **Expected Output** | Customer profile summary page. |
| **Acceptance Criteria** | Profile data displays correctly. Churn badge colored by risk level. Links to sub-pages work. 404 for invalid IDs. |
| **Priority** | P0 — Critical |

---

#### T-056: Implement Journey Timeline page

| Attribute | Detail |
|---|---|
| **Description** | Create `app/customers/[id]/journey/page.tsx`. Vertical timeline with: channel-colored left border per event, session boundaries (30-min gap markers), journey boundaries (24-hour gap markers), cross-channel transition indicators, pattern badges on events, expandable event cards (click to reveal metadata + resolution info), filter bar (channel toggles, event type, date range, pattern filter). |
| **Dependencies** | T-041 (journey API), T-050, T-051 |
| **Files** | `app/customers/[id]/journey/page.tsx`, `components/journey/timeline.tsx`, `components/journey/event-card.tsx`, `components/journey/session-boundary.tsx`, `components/journey/journey-boundary.tsx`, `components/journey/timeline-filter-bar.tsx`, `components/journey/pattern-badge.tsx`, `hooks/use-journey.ts` |
| **Expected Output** | Visual journey timeline with all annotations. |
| **Acceptance Criteria** | Events render chronologically. Channel colors correct. Session/journey boundaries visible. Events expandable. Patterns shown as badges. Filters work. |
| **Priority** | P0 — Critical |

---

#### T-057: Implement Identity Graph page

| Attribute | Detail |
|---|---|
| **Description** | Create `app/customers/[id]/identity/page.tsx`. Show: profile node at center, identifier nodes around it (type + masked value), edges with confidence labels, resolution history (expandable entries with method, confidence, evidence), conflict section if any. Simple CSS/SVG layout — no heavy graph library. |
| **Dependencies** | T-042 (identity API), T-050 |
| **Files** | `app/customers/[id]/identity/page.tsx`, `components/identity/identity-graph.tsx`, `components/identity/resolution-history.tsx`, `components/identity/confidence-meter.tsx`, `hooks/use-identity.ts` |
| **Expected Output** | Visual identity graph with resolution history. |
| **Acceptance Criteria** | All identifiers displayed as nodes. Confidence shown on edges. Resolution history expandable. Evidence visible. |
| **Priority** | P0 — Critical |

---

### Phase 9 — Frontend Polish & Notifications

---

#### T-058: Implement search bar

| Attribute | Detail |
|---|---|
| **Description** | Create `components/layout/search-bar.tsx`. Persistent in top nav. Type-ahead search with debounce (300ms). Results dropdown shows matching customers with name and identifiers. Click navigates to `/customers/[id]`. Enter navigates to `/customers?q=...`. |
| **Dependencies** | T-039 (search API), T-052 |
| **Files** | `components/layout/search-bar.tsx`, `hooks/use-search.ts` |
| **Expected Output** | Working search with dropdown results. |
| **Acceptance Criteria** | Typing triggers search after 300ms debounce. Results show matching customers. Click navigates. Escape closes dropdown. |
| **Priority** | P0 — Critical |

---

#### T-059: Implement notification bell

| Attribute | Detail |
|---|---|
| **Description** | Create `components/layout/notification-bell.tsx` and `components/shared/notification-dropdown.tsx`. Bell icon with unread count badge. Click opens 400px dropdown with notification list. Severity colors (CRITICAL=red, WARNING=amber, INFO=blue). Click notification navigates to deep link. Mark as read. SWR with 30s refresh for unread count. |
| **Dependencies** | T-045, T-046 (notification API), T-052 |
| **Files** | `components/layout/notification-bell.tsx`, `components/shared/notification-dropdown.tsx`, `hooks/use-notifications.ts` |
| **Expected Output** | Working notification center. |
| **Acceptance Criteria** | Badge shows unread count. Dropdown lists notifications. Clicking marks as read. Deep links navigate correctly. |
| **Priority** | P1 — High |

---

#### T-060: Implement loading and error states

| Attribute | Detail |
|---|---|
| **Description** | Add skeleton screens for: dashboard (skeleton KPI cards, skeleton charts), customer list (skeleton table rows), profile (skeleton cards), timeline (skeleton event cards). Add error boundaries: `app/error.tsx`, `app/dashboard/error.tsx`, `app/customers/error.tsx`. Inline SWR error handling with retry buttons. |
| **Dependencies** | T-053–T-057 |
| **Files** | `app/loading.tsx`, `app/error.tsx`, `app/dashboard/loading.tsx`, `app/dashboard/error.tsx`, `app/customers/loading.tsx`, `app/customers/error.tsx`, `components/shared/empty-state.tsx`, `components/shared/error-display.tsx` |
| **Expected Output** | Skeleton screens on page load. Error boundaries on failures. Empty states for no data. |
| **Acceptance Criteria** | Loading skeletons match page layout. Errors show retry button. Empty state explains what to do. |
| **Priority** | P1 — High |

---

#### T-061: Implement Pipeline Health page (P2)

| Attribute | Detail |
|---|---|
| **Description** | Create `app/pipeline/page.tsx`. Stage flow visualization (ingested → validated → normalized → ...). Per-stage counts. Error table. Manual refresh button. |
| **Dependencies** | T-047 |
| **Files** | `app/pipeline/page.tsx` |
| **Expected Output** | Pipeline health dashboard. |
| **Acceptance Criteria** | Stage counts display. Errors listed. Refresh works. |
| **Priority** | P2 — Medium |

---

### Phase 10 — Testing & Bug Fixes

---

#### T-062: API route integration tests

| Attribute | Detail |
|---|---|
| **Description** | Test all 9+ API endpoints with various inputs. Verify response shapes, status codes, error handling. Test pagination, filtering, sorting. |
| **Dependencies** | T-036–T-048 |
| **Files** | `__tests__/integration/api-routes.test.ts` |
| **Expected Output** | 20+ API tests. |
| **Acceptance Criteria** | All endpoints tested. Response shapes match TRD Section 12 spec. |
| **Priority** | P1 — High |

---

#### T-063: End-to-end demo scenario test

| Attribute | Detail |
|---|---|
| **Description** | Automated test that: seeds the Priya Sharma scenario, verifies profile exists, verifies 12 events stitched, verifies patterns detected (drop-off, escalation, repeat, churn), verifies identity graph (4 identifiers), verifies analytics compute correct KPIs. |
| **Dependencies** | T-049 (seed), all API routes |
| **Files** | `__tests__/e2e/demo-scenario.test.ts` |
| **Expected Output** | 1 comprehensive end-to-end test. |
| **Acceptance Criteria** | The exact demo scenario produces the exact expected results. Deterministic. |
| **Priority** | P0 — Critical |

---

#### T-064: Bug fix pass

| Attribute | Detail |
|---|---|
| **Description** | Run the full application. Click through every page. Verify all features. Fix bugs found. |
| **Dependencies** | All previous tasks |
| **Files** | Various |
| **Expected Output** | Working application with no critical bugs. |
| **Acceptance Criteria** | All pages load. All filters work. All links navigate. No console errors. No unhandled exceptions. |
| **Priority** | P0 — Critical |

---

### Phase 11 — Deployment

---

#### T-065: Deploy to Vercel + Neon

| Attribute | Detail |
|---|---|
| **Description** | Create Neon project. Get connection string. Create Vercel project. Set `DATABASE_URL` env var. Push to main. Verify deployment. Run migrations. Seed database. |
| **Dependencies** | All previous tasks |
| **Files** | Vercel configuration (automatic from Next.js) |
| **Expected Output** | Application live at `*.vercel.app`. |
| **Acceptance Criteria** | All pages load. API endpoints respond. Demo data present. |
| **Priority** | P0 — Critical |

---

#### T-066: Verify deployed application

| Attribute | Detail |
|---|---|
| **Description** | Run through the complete demo flow on the deployed URL. Verify data, navigation, charts, search, notifications. Test on mobile viewport. |
| **Dependencies** | T-065 |
| **Files** | None |
| **Expected Output** | Confirmed working production deployment. |
| **Acceptance Criteria** | All demo scenarios work on deployed URL. No 500 errors. Responsive on mobile. |
| **Priority** | P0 — Critical |

---

### Phase 12 — Demo Polish

---

#### T-067: Write final README

| Attribute | Detail |
|---|---|
| **Description** | Project README with: problem statement, solution overview, architecture diagram, tech stack, features list, setup instructions, demo guide, screenshots, team info, hackathon context. |
| **Dependencies** | T-065 |
| **Files** | `README.md` |
| **Expected Output** | Comprehensive, judge-facing README. |
| **Acceptance Criteria** | Clone → install → run instructions work. Architecture diagram present. Screenshots present. |
| **Priority** | P0 — Critical |

---

#### T-068: Record demo video

| Attribute | Detail |
|---|---|
| **Description** | 3-minute demo video following the script from APP_FLOW Section 7. See Section 16 for exact recording sequence. |
| **Dependencies** | T-066 |
| **Files** | Demo video file |
| **Expected Output** | 3-minute demo video. |
| **Acceptance Criteria** | Covers all 5 demo scenes. Shows identity resolution. Shows journey timeline. Shows patterns. Shows analytics. Under 3 minutes. |
| **Priority** | P0 — Critical |

---

#### T-069: Create presentation deck

| Attribute | Detail |
|---|---|
| **Description** | PPT covering: problem, solution, architecture, demo highlights, technical differentiators, future roadmap. |
| **Dependencies** | T-068 |
| **Files** | Presentation file |
| **Expected Output** | 8–12 slide deck. |
| **Acceptance Criteria** | Problem → solution → demo → technical → roadmap flow. Architecture diagram included. Screenshots included. |
| **Priority** | P0 — Critical |

---

## 5. Parallel Team Work

### 5.1 Workstreams

Assuming a **3-person hackathon team** (Team Member A, B, C):

```
             Hour  0    5    10   15   20   25   30   35   40   45   48
                   │    │    │    │    │    │    │    │    │    │    │
Member A           ├────┤    │    │    │    │    │    │    │    │    │
(Backend Lead)     │P0-1│    │    │    │    │    │    │    │    │    │
                   ├─────────┤    │    │    │    │    │    │    │    │
                   │P2: Valid+Norm│    │    │    │    │    │    │    │
                   ├──────────────┤    │    │    │    │    │    │    │
                   │P3: Identity  │    │    │    │    │    │    │    │
                   │  Resolution  │    │    │    │    │    │    │    │
                   ├───────────────────┤    │    │    │    │    │    │
                   │P4: Pipeline       │    │    │    │    │    │    │
                   ├────────────────────────┤    │    │    │    │    │
                   │P5: Journey + Patterns  │    │    │    │    │    │
                   ├─────────────────────────────┤    │    │    │    │
                   │P6: API Routes               │    │    │    │    │
                   ├──────────────────────────────────┤    │    │    │
                   │P7: Seed Script + Demo Data      │    │    │    │
                   ├───────────────────────────────────────┤    │    │
                   │P10: Integration Tests + Fixes        │    │    │
                   ├────────────────────────────────────────────┤    │
                   │P11: Deploy + Verify                       │    │
                   └─────────────────────────────────────────────────┘

Member B           ├────┤    │    │    │    │    │    │    │    │    │
(Frontend Lead)    │P0  │    │    │    │    │    │    │    │    │    │
                   ├─────────┤    │    │    │    │    │    │    │    │
                   │P1 (help)│    │    │    │    │    │    │    │    │
                   ├──────────────────────────┤    │    │    │    │    │
                   │ Design System + shadcn/ui│    │    │    │    │    │
                   │ T-050, T-051             │    │    │    │    │    │
                   │ Layout Shell T-052       │    │    │    │    │    │
                   ├───────────────────────────────────────┤    │    │
                   │P8: Dashboard, Customer List,         │    │    │
                   │    Profile, Timeline, Identity Graph  │    │    │
                   ├────────────────────────────────────────────┤    │
                   │P9: Search, Notifications, Loading/Error   │    │
                   ├─────────────────────────────────────────────────┘
                   │P12: UI polish + bug fixes                │
                   └──────────────────────────────────────────┘

Member C           ├────┤    │    │    │    │    │    │    │    │    │
(Full-Stack)       │P0  │    │    │    │    │    │    │    │    │    │
                   ├──────────────┤    │    │    │    │    │    │    │
                   │Unit tests    │    │    │    │    │    │    │    │
                   │(P2 + P3)     │    │    │    │    │    │    │    │
                   ├───────────────────┤    │    │    │    │    │    │
                   │Pattern detector   │    │    │    │    │    │    │
                   │unit tests         │    │    │    │    │    │    │
                   ├──────────────────────────┤    │    │    │    │    │
                   │ Help with seed script    │    │    │    │    │    │
                   ├───────────────────────────────┤    │    │    │    │
                   │ API tests + pipeline tests   │    │    │    │    │
                   ├────────────────────────────────────┤    │    │    │
                   │ E2E demo test                     │    │    │    │
                   ├─────────────────────────────────────────┤    │    │
                   │ README + Docs                          │    │    │
                   ├──────────────────────────────────────────────┤    │
                   │ Demo video + PPT                             │    │
                   └──────────────────────────────────────────────┘
```

### 5.2 Sync Points

| Hour | What Syncs | Why |
|---|---|---|
| 3 | Database schema ready | Frontend needs types. Tests need database. |
| 10 | Identity resolver done | Pipeline depends on it. Seed script depends on pipeline. |
| 17 | All API routes ready | Frontend can start calling real APIs instead of mocks. |
| 23 | Seed data ready | Frontend can develop against real demo data. |
| 36 | Feature freeze | Only bug fixes after this point. |
| 42 | Deployment complete | Demo recording can begin. |

### 5.3 Non-Blocking Strategies

| Potential Block | Mitigation |
|---|---|
| Frontend waiting for API | Member B builds frontend components with mock data (hardcoded JSON matching API response types). Swap to real API calls when routes are ready. |
| Tests waiting for identity resolver | Member C writes unit tests for validator/normalizer first (no DB dependency). Writes integration test scaffolds with `TODO` markers for identity tests. |
| Seed script waiting for pattern detectors | Member A can seed events without patterns first, then re-run seed after pattern detectors are wired in. |

---

## 6. Identity Resolution Implementation

### 6.1 Implementation Sequence

**Step 1 — Deterministic Matcher (simplest, highest value)**

```
Input: Event with identifiers {email?, phone?, loyalty_id?}
Action: SELECT profile_id FROM customer_identifiers
        WHERE identifier_type = :type AND identifier_value = :value
Output: 0 or 1 matching profiles (UNIQUE constraint ensures at most 1 per type+value)
```

Build this first. It handles the majority of real-world matches.

**Step 2 — New Profile Creation**

```
If deterministic returns 0 matches AND no weak identifiers:
  → Create new customer_profiles row
  → Create customer_identifiers rows for all event identifiers
  → Return {method: 'new_profile', confidence: 0.0}
```

With just Step 1 + 2, the system handles: known customers (deterministic match) and new customers (profile creation). This is a working MVP baseline.

**Step 3 — Identifier Expansion**

```
On deterministic match:
  For each identifier on the event not already linked to the profile:
    → INSERT INTO customer_identifiers
  This grows the identity graph over time.
```

This is critical for cross-channel stitching: first event has email, second event has email + device_id → device_id is now linked.

**Step 4 — Probabilistic Scoring (add only if time permits)**

```
If deterministic returns 0 matches AND weak identifiers exist:
  → Query customer_identifiers for weak identifier matches
  → Score candidates:
      device_id match: +0.60
      cookie_id match: +0.30
      name match (Jaro-Winkler ≥ 0.85): +0.20 × similarity
      temporal proximity (same 2h window, different channel): +0.10
  → confidence = score / max_possible (cap at 0.94)
  → If best confidence ≥ 0.70: link to that profile
  → Else: create new profile
```

**Step 5 — Conflict Handling**

```
If deterministic returns 2+ different profiles:
  → Winner = profile with most events
  → Record conflict in resolution_log
  → Create notification
  → DO NOT merge profiles
```

### 6.2 Signal Weights (Fixed)

| Signal | Weight | Type | Match Condition |
|---|---|---|---|
| `device_id` | 0.60 | Weak | Exact match in `customer_identifiers` |
| `cookie_id` | 0.30 | Weak | Exact match in `customer_identifiers` |
| `name` | 0.20 | Weak | Jaro-Winkler similarity ≥ 0.85 (contribution = 0.20 × similarity) |
| `temporal_proximity` | 0.10 | Contextual | Event within 2 hours of profile's last event, on a different channel |

**Combined cap: 0.94** (prevents probabilistic from ever reaching 1.0, which is reserved for deterministic).

### 6.3 Confidence Thresholds

| Range | Category | Action |
|---|---|---|
| 1.0 | Deterministic | Exact match on strong identifier |
| 0.75 | Conflict | Deterministic match to 2+ profiles; linked to most-established |
| 0.70–0.94 | Probabilistic match | Linked to best candidate profile |
| 0.0 | New profile | No match found; new profile created |
| < 0.70 | Below threshold | Probabilistic candidates exist but confidence too low; new profile created |

### 6.4 Test Cases for Identity Resolution

| Test | Input | Expected |
|---|---|---|
| First event ever | `{email: "a@b.com"}` | New profile created. Method = `new_profile`. Confidence = 0.0. |
| Same email | `{email: "a@b.com"}` | Deterministic match. Same profile. Confidence = 1.0. |
| Same email + new phone | `{email: "a@b.com", phone: "555"}` | Deterministic match. Phone added to profile (expansion). |
| Known phone only | `{phone: "555"}` | Deterministic match via phone. |
| Unknown device only | `{device_id: "dev_xyz"}` | If no matching device → new profile. |
| Known device only | `{device_id: "dev_xyz"}` (previously expanded) | Probabilistic match. device_id = 0.60 weight. Confidence = 0.60/0.60 = 1.0 → cap at 0.94. |
| Conflicting emails | Event has `email: "a@b.com"` → profile A, `phone: "555"` → profile B | Conflict. Winner = profile with most events. Notification created. |
| Fuzzy name match | `{device_id: "dev_xyz", name: "Prya Sharma"}` | Jaro-Winkler("Prya Sharma", "Priya Sharma") ≈ 0.96. Name contributes 0.192. device_id contributes 0.60. Confidence = 0.792/0.80 ≈ 0.99. Match. |
| Below threshold | `{name: "John"}` matching "Jonathan" with Jaro-Winkler 0.78 | Below 0.85 name threshold. Name doesn't contribute. No other signals. New profile. |

---

## 7. Event Pipeline Implementation

### 7.1 Complete Pipeline Path

```
Input: Raw JSON from POST /api/v1/events
│
├──▶ 1. PARSE
│     Parse request body as JSON.
│     Failure → 400 "Invalid JSON"
│
├──▶ 2. RATE LIMIT
│     Check in-memory rate limiter.
│     Failure → 429 "Too Many Requests"
│
├──▶ 3. VALIDATE (lib/pipeline/validator.ts)
│     Zod schema check.
│     Channel enum. At least 1 identifier. Email format.
│     Failure → 400 with field-level errors
│     Output: ValidatedRawEvent
│
├──▶ 4. NORMALIZE (lib/pipeline/normalizer.ts)
│     Assign UUID.
│     Parse timestamp → UTC Date.
│     Lowercase/trim identifiers.
│     Map event_type → event_category.
│     Generate SHA-256 dedup_key.
│     Failure → 400 "Invalid timestamp"
│     Output: NormalizedEvent
│
├──▶ 5. DEDUPLICATE (lib/pipeline/deduplicator.ts)
│     Query events WHERE dedup_key = ? AND created_at > NOW() - 5min.
│     If duplicate → return {duplicate: true, event_id: existing}
│     Output: {isDuplicate: false}
│
├──▶ 6. RESOLVE IDENTITY (lib/identity/resolver.ts)
│     Deterministic → Probabilistic → New/Conflict.
│     Expand identifiers.
│     Write resolution_log.
│     Output: {profileId, method, confidence, evidence}
│     (All within Prisma $transaction)
│
├──▶ 7. STORE EVENT
│     INSERT INTO events (within same $transaction as step 6).
│     Output: Stored event with profile_id
│
├──▶ 8. STITCH (lib/journey/stitcher.ts)
│     UPDATE customer_profiles: event_count++, last_seen_at, channels_used.
│     Best-effort — event already stored.
│
├──▶ 9. DETECT PATTERNS (lib/journey/patterns.ts)
│     Run 5 detectors. Each in try/catch.
│     INSERT detected_patterns.
│     UPDATE profile flags.
│     Best-effort — event already stored.
│
├──▶ 10. NOTIFY (within pattern detection)
│      INSERT notifications if thresholds crossed.
│      Best-effort.
│
└──▶ 11. RECORD METRICS
       INSERT pipeline_metrics row.
       Best-effort.
       
Output: HTTP 202 {event_id, profile_id, resolution: {method, confidence}}
```

### 7.2 Atomicity Guarantees

| Steps | Atomicity | Why |
|---|---|---|
| 6–7 (resolve + store event) | **Atomic** (Prisma `$transaction`) | An event must not exist without a profile, and a profile/identifier expansion must not exist without the event. |
| 8–11 (stitch + patterns + notify + metrics) | **Best-effort** | The event is already stored. If pattern detection fails, the event is still valid. These are side effects, not invariants. |

### 7.3 Event Type Taxonomy

| event_type | event_category |
|---|---|
| `page_view`, `product_view`, `search` | `browse` |
| `checkout_start`, `purchase_complete`, `cart_add`, `cart_remove` | `commerce` |
| `login`, `register`, `password_reset`, `profile_update` | `account` |
| `call_started`, `call_ended`, `ticket_created`, `ticket_resolved`, `complaint` | `support` |
| `email_open`, `email_click`, `push_open`, `chat_start`, `chat_end` | `engagement` |
| `store_visit`, `pos_purchase`, `return_initiated` | `in_store` |
| *(anything else)* | `browse` (default fallback) |

---

## 8. Frontend Implementation

### 8.1 Implementation Order

```
T-050: shadcn/ui primitives        ─────┐
T-051: Design tokens               ─────┤
                                        ├──▶ T-052: Layout shell
                                        │       │
                                        │       ├──▶ T-053: Dashboard
                                        │       ├──▶ T-054: Customer List
                                        │       ├──▶ T-055: Customer Profile
                                        │       │       │
                                        │       │       ├──▶ T-056: Journey Timeline
                                        │       │       └──▶ T-057: Identity Graph
                                        │       │
                                        │       ├──▶ T-058: Search Bar
                                        │       ├──▶ T-059: Notification Bell
                                        │       └──▶ T-060: Loading/Error States
                                        │
                                        └──▶ T-061: Pipeline Health (P2)
```

### 8.2 Dependencies Between Frontend Tasks

| Task | Blocked By | Blocks |
|---|---|---|
| shadcn/ui components (T-050) | T-002 (npm install) | Everything |
| Design tokens (T-051) | T-001 | Everything |
| Layout shell (T-052) | T-050, T-051 | All pages |
| Dashboard (T-053) | T-052, T-044 (analytics API) | Nothing |
| Customer List (T-054) | T-052, T-038 (customers API) | Nothing |
| Customer Profile (T-055) | T-052, T-040 (customer detail API) | T-056, T-057 |
| Journey Timeline (T-056) | T-055, T-041 (journey API) | Nothing |
| Identity Graph (T-057) | T-055, T-042 (identity API) | Nothing |
| Search Bar (T-058) | T-052, T-039 (search API) | Nothing |
| Notification Bell (T-059) | T-052, T-045 (notifications API) | Nothing |

### 8.3 Frontend Can Start Before API Is Ready

Member B should build components with hardcoded mock data that matches the exact API response types from `lib/shared/types.ts`. When API routes are ready (Phase 6), swap mock data for real `fetch()` calls. This prevents frontend from blocking on backend.

---

## 9. Design System Implementation

### 9.1 Design Tokens

```typescript
// tailwind.config.ts — extend theme
{
  colors: {
    // Channel colors
    channel: {
      web: '#3B82F6',
      mobile: '#8B5CF6',
      'call-center': '#10B981',
      email: '#F59E0B',
      chat: '#14B8A6',
      'in-store': '#F43F5E',
    },
    // Pattern colors
    pattern: {
      'drop-off': '#EF4444',
      escalation: '#F97316',
      'repeat-contact': '#EAB308',
      unresolved: '#6366F1',
      churn: '#E11D48',
    },
    // Severity colors
    severity: {
      critical: '#EF4444',
      warning: '#F59E0B',
      info: '#3B82F6',
    },
    // Confidence colors
    confidence: {
      high: '#10B981',
      medium: '#F59E0B',
      low: '#EF4444',
    },
  },
}
```

### 9.2 Typography

| Element | Font | Size | Weight |
|---|---|---|---|
| Page title | Inter | 24px (text-2xl) | 700 (bold) |
| Section heading | Inter | 18px (text-lg) | 600 (semibold) |
| Card title | Inter | 14px (text-sm) | 600 (semibold) |
| Body text | Inter | 14px (text-sm) | 400 (normal) |
| KPI number | Inter | 32px (text-3xl) | 700 (bold) |
| Badge text | Inter | 12px (text-xs) | 500 (medium) |
| Timestamp | JetBrains Mono | 12px (text-xs) | 400 (normal) |

### 9.3 Component Mapping

| Design Element | Implementation |
|---|---|
| KPI Cards | shadcn `Card` with large number + label |
| Data Table | shadcn `Table` with sortable headers |
| Badges | shadcn `Badge` with custom colors (channel, pattern, severity) |
| Buttons | shadcn `Button` (default, outline, ghost variants) |
| Search Input | shadcn `Input` with Lucide `Search` icon |
| Filters | shadcn `Checkbox`, `Select`, `Slider` in a sidebar |
| Charts | Recharts `BarChart`, `PieChart`, `LineChart` with design token colors |
| Timeline | Custom CSS: vertical line, event cards, session/journey dividers |
| Identity Graph | Custom SVG: central node, identifier nodes, confidence edges |
| Notification Dropdown | shadcn `DropdownMenu` with custom content |

### 9.4 Icons (Lucide)

| Usage | Icon |
|---|---|
| Web channel | `Globe` |
| Mobile channel | `Smartphone` |
| Call Center channel | `Phone` |
| Email channel | `Mail` |
| Chat channel | `MessageSquare` |
| In-Store channel | `MapPin` |
| Drop-off pattern | `TrendingDown` |
| Escalation pattern | `ArrowUpRight` |
| Repeat contact | `RefreshCw` |
| Unresolved issue | `AlertCircle` |
| Churn risk | `UserX` |
| Notification bell | `Bell` |
| Search | `Search` |
| Confidence high | `ShieldCheck` |
| Confidence low | `ShieldAlert` |

### 9.5 Layout

- **Sidebar:** 240px width, collapsible on mobile.
- **Content area:** Max-width 1280px, centered, 24px padding.
- **Cards:** 16px padding, 8px border-radius, subtle shadow.
- **Dashboard grid:** CSS Grid, 3 columns for KPIs, 2 columns for charts. Collapses to 1 column on mobile.
- **Timeline:** Single column, max-width 800px, centered within content area.

### 9.6 Responsive Breakpoints

| Breakpoint | Width | Layout |
|---|---|---|
| Mobile | < 768px | Sidebar hidden (hamburger menu). Single column. Cards stack. |
| Tablet | 768–1024px | Sidebar collapsed (icons only). 2-column grid. |
| Desktop | > 1024px | Full sidebar. 3-column KPI grid. 2-column chart grid. |

### 9.7 Dark Mode

Implemented via Tailwind's `dark:` variant and CSS custom properties on `:root`. System preference detection via `prefers-color-scheme`. No manual toggle for MVP.

---

## 10. Testing Plan

### 10.1 Test Matrix

| Layer | Tool | What Is Tested | Count |
|---|---|---|---|
| Unit | Vitest | Validator, normalizer, deduplicator, probabilistic scorer, confidence, all pattern detectors | ~60 tests |
| Integration | Vitest + real PostgreSQL | Pipeline end-to-end, identity resolution with DB, API routes | ~30 tests |
| E2E | Vitest | Demo scenario (Priya Sharma full journey) | ~5 tests |

### 10.2 Unit Tests

#### Validator (`__tests__/unit/validator.test.ts`)

| Test Case | Input | Expected |
|---|---|---|
| Valid minimal event | `{channel: "web", event_type: "page_view", timestamp: "2026-09-01T10:00:00Z", identifiers: {email: "a@b.com"}}` | Passes validation |
| All channels valid | 6 events, one per channel | All pass |
| Invalid channel | `{channel: "sms"}` | Throws VALIDATION_ERROR |
| Missing identifiers | `{identifiers: {}}` | Throws "At least one identifier required" |
| All identifiers empty string | `{identifiers: {email: "", phone: ""}}` | Throws "At least one identifier required" |
| Invalid email format | `{identifiers: {email: "not-an-email"}}` | Throws "Invalid email format" |
| Missing event_type | `{event_type: ""}` | Throws "event_type is required" |
| Extra fields ignored | `{...valid, extra: "field"}` | Passes (Zod strips extra) |

#### Normalizer (`__tests__/unit/normalizer.test.ts`)

| Test Case | Input | Expected |
|---|---|---|
| Email lowercased | `{email: "A@B.COM"}` | `"a@b.com"` |
| Phone digits only | `{phone: "+1 (555) 123-4567"}` | `"15551234567"` |
| Name trimmed | `{name: "  Priya Sharma  "}` | `"Priya Sharma"` |
| Timestamp UTC | `"2026-09-01T10:00:00+05:30"` | `2026-09-01T04:30:00.000Z` |
| Future timestamp rejected | `timestamp > now + 1 hour` | Throws validation error |
| Dedup key deterministic | Same input twice | Same SHA-256 output |
| UUID unique | Two calls | Different UUIDs |
| Event type mapping | `"page_view"` | `event_category: "browse"` |
| Unknown event type | `"custom_event"` | `event_category: "browse"` (default) |

#### Probabilistic Scorer (`__tests__/unit/probabilistic.test.ts`)

| Test Case | Expected |
|---|---|
| device_id match only | score=0.60, max=0.60, confidence=1.0 → capped at 0.94 |
| cookie_id match only | score=0.30, max=0.30, confidence=1.0 → capped at 0.94 |
| device_id + cookie_id match | score=0.90, max=0.90, confidence=1.0 → capped at 0.94 |
| name exact match | Jaro-Winkler=1.0, score=0.20, max=0.20, confidence=1.0 → capped at 0.94 |
| name similar match (0.92) | score=0.184, max=0.20, confidence=0.92 |
| name below threshold (0.78) | score=0, max=0.20 (name doesn't contribute below 0.85) |
| No signals present | Empty candidates list |
| All signals match | score=0.94 (capped), max=1.20 |

#### Pattern Detectors (per detector)

| Detector | Positive Case | Negative Case | Edge Case |
|---|---|---|---|
| Drop-off | checkout_start 1h ago, no purchase | checkout_start + purchase_complete | checkout_start exactly 2h ago (boundary) |
| Escalation | web event → call_center within 24h | call_center → web (downward) | Same channel (no escalation) |
| Repeat | 2 support events in 5 days | 1 support event only | 2 events exactly 7 days apart |
| Unresolved | ticket_created 8 days ago | ticket_created + ticket_resolved | ticket_created exactly 7 days ago |
| Churn | 3 support + unresolved issue | Clean profile with no patterns | Multiple medium signals |

### 10.3 Integration Tests

#### Pipeline (`__tests__/integration/pipeline.test.ts`)

1. Valid event → event in DB, profile created, identifiers linked, resolution log exists, pipeline metric exists.
2. Invalid event → nothing in DB, 400 error returned.
3. Duplicate event → 202 with `duplicate: true`, no second event in DB.
4. Two events same email → same profile, event_count=2.
5. Batch of 5 events → 5 events stored, profiles created/matched correctly.
6. Event with all identifiers → all identifiers linked to profile.

#### Identity Resolution (`__tests__/integration/identity-resolution.test.ts`)

1. New profile creation flow.
2. Deterministic match flow.
3. Identifier expansion flow.
4. Probabilistic match flow (device_id).
5. Conflict detection flow.
6. Resolution log evidence verification.
7. Conflict notification creation.
8. Below-threshold creates new profile.

### 10.4 E2E Demo Test (`__tests__/e2e/demo-scenario.test.ts`)

1. Seed Priya Sharma's 12 events in order.
2. Verify: 1 profile, 4 identifiers (email, phone, device_id, name).
3. Verify: 12 events linked to same profile.
4. Verify: Drop-off pattern detected (checkout abandonment).
5. Verify: Escalation pattern detected (web → call_center).
6. Verify: Repeat contact pattern detected (3+ support contacts).
7. Verify: Churn risk = 'high'.
8. Verify: Notifications created for high-severity patterns.
9. Verify: Resolution logs show deterministic + expansion evidence.
10. Verify: Analytics summary computes correct KPIs.

---

## 11. Demo Data

### 11.1 Overall Dataset

| Dimension | Value |
|---|---|
| Total customers | ~500 |
| Total events | ~15,000 |
| Events per customer | ~30 average (range: 5–80) |
| Channels used | All 6 (web, mobile, call_center, email, chat, in_store) |
| Date range | 2026-07-01 to 2026-09-19 (80 days) |
| Patterns represented | All 5 types |

### 11.2 Customer Distribution

| Segment | Count | Profile |
|---|---|---|
| Clean journeys (no patterns) | ~200 | 3–10 events, 1–2 channels, no friction |
| Single pattern | ~150 | 1 pattern type (drop-off OR escalation OR repeat) |
| Multi-pattern | ~100 | 2–3 pattern types |
| High churn risk | ~30 | 3+ support + escalation + unresolved |
| Medium churn risk | ~50 | 2 drop-offs OR declining engagement |
| Multi-channel heavy | ~50 | 4+ channels, 40+ events, identity expansion visible |
| Crafted demo scenarios | 2 | Priya Sharma + Support Loop (see below) |

### 11.3 Demo Scenario 1: "Frustrated Shopper" — Priya Sharma

This scenario must be deterministic and reproducible. Every field is specified.

**Profile:** Priya Sharma, 4 channels (web, mobile, call_center, in_store), high churn risk, 12 events.

**Event Sequence:**

| # | Timestamp | Channel | Event Type | Identifiers | Key Metadata | Pattern Triggered |
|---|---|---|---|---|---|---|
| 1 | 2026-09-01 10:00 UTC | web | page_view | cookie_id: `ck_priya_001` | `{page_url: "/products/laptop"}` | — |
| 2 | 2026-09-01 10:15 UTC | web | product_view | cookie_id: `ck_priya_001` | `{product_id: "LAPTOP-X1", price: 89999}` | — |
| 3 | 2026-09-01 10:30 UTC | web | checkout_start | cookie_id: `ck_priya_001`, email: `priya.sharma@example.com` | `{cart_value: 89999}` | — |
| 4 | 2026-09-01 14:00 UTC | web | page_view | email: `priya.sharma@example.com` | `{page_url: "/support/faq"}` | **Drop-off** (checkout_start without purchase, 3.5h elapsed) |
| 5 | 2026-09-02 09:00 UTC | mobile | product_view | device_id: `dev_priya_m01`, email: `priya.sharma@example.com` | `{product_id: "LAPTOP-X1"}` | — |
| 6 | 2026-09-02 09:30 UTC | mobile | checkout_start | device_id: `dev_priya_m01`, email: `priya.sharma@example.com` | `{cart_value: 89999}` | — |
| 7 | 2026-09-02 11:00 UTC | call_center | call_started | phone: `9198765432`, name: `Priya Sharma` | `{agent_id: "AGT-042", reason: "checkout_issue"}` | **Escalation** (mobile → call_center within 24h), **Drop-off** (2nd checkout abandoned) |
| 8 | 2026-09-02 11:25 UTC | call_center | ticket_created | phone: `9198765432` | `{ticket_id: "TKT-8891", category: "payment_failure"}` | — |
| 9 | 2026-09-05 14:00 UTC | email | email_open | email: `priya.sharma@example.com` | `{subject: "Your issue update", campaign_id: "followup"}` | — |
| 10 | 2026-09-08 10:00 UTC | chat | chat_start | email: `priya.sharma@example.com` | `{reason: "ticket_followup"}` | **Repeat Contact** (3rd support contact in 7 days) |
| 11 | 2026-09-08 10:30 UTC | chat | complaint | email: `priya.sharma@example.com` | `{sentiment: "negative", text: "Still not resolved"}` | **Unresolved** (ticket 8891 still open after 6 days) |
| 12 | 2026-09-15 16:00 UTC | in_store | store_visit | loyalty_id: `LYL-PRY-2024`, name: `Priya Sharma` | `{store_id: "S-AHM-01", purpose: "return"}` | **Churn** (escalation + 14d+ since last digital contact) |

**Identity Resolution Chain:**

1. Event 1–2: cookie_id `ck_priya_001` → new profile created.
2. Event 3: cookie_id matches profile + email added (expansion). Deterministic via cookie.
3. Event 4: email `priya.sharma@example.com` → deterministic match.
4. Event 5–6: email → deterministic match. device_id `dev_priya_m01` expanded.
5. Event 7: phone `9198765432` + name `Priya Sharma` → new identifiers. Probabilistic match via name Jaro-Winkler to existing "Priya Sharma" or deterministic if phone was previously linked. Since phone is new, this needs probabilistic: device_id from same device? No — different channel. Name match. If below threshold, link manually via the event carrying matching email in event 8 flow. **Correction:** Event 7 carries phone and name but no email/device. Probabilistic scoring: name "Priya Sharma" Jaro-Winkler = 1.0 against profile's name (0.20 × 1.0 = 0.20). Only signal. 0.20/0.20 = 1.0 → capped at 0.94. Above 0.70 threshold. **Match.** Phone and name expanded on profile.
6. Event 8: phone `9198765432` → deterministic match (expanded in step 5).
7. Event 9–11: email → deterministic match.
8. Event 12: loyalty_id `LYL-PRY-2024` + name → new identifier. Probabilistic via name (1.0 Jaro-Winkler). 0.20/0.20 → 0.94. Match. Loyalty_id expanded.

**Final Profile State:**

```json
{
  "display_name": "Priya Sharma",
  "event_count": 12,
  "channel_count": 5,
  "channels_used": ["web", "mobile", "call_center", "email", "chat", "in_store"],
  "churn_risk": "high",
  "has_drop_off": true,
  "has_escalation": true,
  "has_repeat_contact": true,
  "has_unresolved": true,
  "avg_confidence": 0.866
}
```

**Identifiers:** email, phone, device_id, cookie_id, loyalty_id, name — all 6 types linked.

### 11.4 Demo Scenario 2: "Support Loop" — Rajesh Patel

A simpler scenario focused on repeat contacts and unresolved issues.

| # | Channel | Event Type | Identifiers | Pattern |
|---|---|---|---|---|
| 1 | web | form_submit | email: `rajesh.p@company.in` | — |
| 2 | email | email_open | email: `rajesh.p@company.in` | — |
| 3 | chat | chat_start | email: `rajesh.p@company.in` | — |
| 4 | chat | ticket_created | email: `rajesh.p@company.in` | — |
| 5 | call_center | call_started | phone: `9112345678`, name: `Rajesh Patel` | Escalation (chat → call) |
| 6 | call_center | call_started | phone: `9112345678` | Repeat (2nd support in 7d) |
| 7 | chat | chat_start | email: `rajesh.p@company.in` | Repeat (3rd support) |
| 8 | call_center | call_started | phone: `9112345678` | Repeat (4th support), Churn risk medium |

### 11.5 Seed Script Design

```typescript
// prisma/seed.ts structure

async function main() {
  // 1. Clear existing data
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.detectedPattern.deleteMany(),
    prisma.resolutionLog.deleteMany(),
    prisma.pipelineMetric.deleteMany(),
    prisma.event.deleteMany(),
    prisma.customerIdentifier.deleteMany(),
    prisma.customerProfile.deleteMany(),
  ]);

  // 2. Seed crafted demo scenarios (Priya + Rajesh)
  await seedDemoScenarios();

  // 3. Seed ~498 random customers with varied patterns
  await seedRandomCustomers(498);

  console.log('Seed complete.');
}
```

The seed script calls `processEvent()` for each event, running the full pipeline. This ensures all identity resolution, pattern detection, and profile updates happen correctly.

---

## 12. Deployment

### 12.1 Environment Variables

| Variable | Local (`.env.local`) | Production (Vercel env vars) |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/journeyx` | Neon connection string (from Neon dashboard) |
| `NODE_ENV` | `development` | `production` (auto-set by Vercel) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://journeyx.vercel.app` |

### 12.2 `.env.example`

```env
# Database connection string (PostgreSQL)
DATABASE_URL="postgresql://user:password@localhost:5432/journeyx"

# Application URL (used for CORS and API base URL)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 12.3 Build Commands

| Command | Purpose | When |
|---|---|---|
| `npm install` | Install dependencies | After clone |
| `npx prisma generate` | Generate Prisma Client | After schema changes |
| `npx prisma migrate dev --name init` | Create initial migration | First time only (local) |
| `npx prisma migrate deploy` | Apply migrations | On deployment |
| `npx prisma db seed` | Seed demo data | After migrations |
| `npm run dev` | Start dev server | Local development |
| `npm run build` | Build for production | Vercel runs this automatically |
| `npm run test` | Run all tests | Before deployment |

### 12.4 Deployment Sequence

```
1. Create Neon project
   → Get DATABASE_URL connection string

2. Create Vercel project
   → Connect GitHub repo
   → Set DATABASE_URL in environment variables
   → Set NEXT_PUBLIC_APP_URL

3. Push to main
   → Vercel auto-detects Next.js
   → Runs: npm install → npx prisma generate → next build
   → Deploys to *.vercel.app

4. Run migrations (one-time)
   → npx prisma migrate deploy (from local machine pointing to Neon DB)

5. Seed database (one-time)
   → npx prisma db seed (from local machine pointing to Neon DB)
   → Or: deploy a seed API route, call it once, then remove it

6. Verify deployment
   → Visit *.vercel.app
   → Check /api/v1/health returns {status: "ok"}
   → Check dashboard shows seeded data
   → Click through demo scenario
```

### 12.5 Health Checks

| Check | Endpoint | Expected |
|---|---|---|
| Application | `GET /api/v1/health` | `{status: "ok", timestamp: "..."}` (200) |
| Database | Part of health check | Prisma `$queryRaw SELECT 1` succeeds |
| Demo data | `GET /api/v1/customers?page=1` | Returns customers (not empty) |
| Priya Sharma exists | `GET /api/v1/customers/search?q=priya` | Returns Priya's profile |

### 12.6 Fallback: Railway

If Vercel's 10s function timeout causes issues with batch seeding:

```
1. Create Railway project
2. Add PostgreSQL service
3. Add Next.js service (from GitHub repo)
4. Set DATABASE_URL to Railway PostgreSQL internal URL
5. Deploy
6. Run seed from Railway's shell
```

---

## 13. GitHub Strategy

### 13.1 Branching Strategy

**Single branch: `main`.** This is a hackathon. Feature branches add merge overhead without value for a 1–3 person team doing rapid iteration.

### 13.2 Commit Milestones

Each commit must be meaningful, compilable, and represent real progress. In chronological order:

```
feat: initialize next.js project with typescript and tailwind
feat: add prisma schema with 7-table database model
feat: add shared types, error handling, and structured logger
feat: implement event validator with zod schema
test: add event validator unit tests
feat: implement event normalizer with dedup key generation
test: add event normalizer unit tests
feat: implement deterministic identity matcher
feat: implement probabilistic scorer with jaro-winkler
test: add identity resolution unit tests
feat: implement identity resolver orchestrator with conflict handling
feat: implement pipeline processor (validate → resolve → store)
test: add pipeline integration tests
feat: implement journey stitcher with session/journey computation
feat: implement pattern detectors (drop-off, escalation, repeat, unresolved, churn)
test: add pattern detector unit tests
feat: implement event ingestion api routes (POST /events, /events/batch)
feat: implement customer query api routes (GET /customers, /search, /:id)
feat: implement journey and identity api routes
feat: implement analytics aggregator and api route
feat: implement notification service and api routes
feat: add synthetic data seed script with demo scenarios
feat: add shadcn/ui components and design tokens
feat: implement application shell with sidebar navigation
feat: implement analytics dashboard with kpi cards and charts
feat: implement customer list with filters, sorting, and pagination
feat: implement customer profile page
feat: implement journey timeline with session/journey boundaries
feat: implement identity graph with resolution history
feat: implement search bar with type-ahead
feat: implement notification center with bell badge
feat: add loading skeletons and error boundaries
test: add api route integration tests
test: add end-to-end demo scenario test
feat: add pipeline health page
fix: polish ui, fix responsive layout, dark mode
docs: add comprehensive readme with setup and demo guide
chore: deploy to vercel + neon
chore: seed production database with demo data
docs: final documentation updates
```

### 13.3 Commit Frequency

**Minimum 2 commits per hour during active development.** Each commit should be a working state (compiles, doesn't break existing functionality). No "WIP" commits. No "fix typo" commits that could be squashed into the previous commit.

---

## 14. Documentation

### 14.1 Documentation Update Schedule

| Document | When to Create | When to Update |
|---|---|---|
| **README.md** | Phase 0 (initial skeleton) | Phase 12 (final version with screenshots, setup guide, demo guide) |
| **docs/PRD.md** | Already exists | No changes during implementation |
| **docs/TRD.md** | Already exists | No changes during implementation |
| **docs/APP_FLOW.md** | Already exists | No changes during implementation |
| **docs/DATA_MODEL.md** | Already exists | No changes during implementation |
| **docs/ARCHITECTURE.md** | Already exists | No changes during implementation |
| **docs/IMPLEMENTATION_PLAN.md** | Now (this document) | Update task status during implementation |
| **docs/API.md** | Phase 6 (when routes are done) | If API shapes change during testing |
| **docs/SETUP.md** | Phase 11 (deployment) | Embed in README |
| **.env.example** | Phase 0 | If new env vars added |

### 14.2 README Structure (Final)

```markdown
# JourneyX — Cross-Channel Journey Intelligence

> Resolve fragmented identities. Stitch cross-channel events. Surface journey friction.

## Problem
[2 sentences from PRD]

## Solution
[3 sentences + architecture diagram]

## Features
- Identity Resolution (deterministic + probabilistic)
- Journey Timeline with session/journey boundaries
- Pattern Detection (drop-off, escalation, repeat, unresolved, churn)
- Analytics Dashboard
- Notification Center

## Tech Stack
Next.js 14 · TypeScript · PostgreSQL 16 · Prisma · shadcn/ui · Tailwind · Recharts

## Quick Start
[Clone → install → env → migrate → seed → run]

## Demo
[Link to deployed app]
[Link to demo video]

## Architecture
[Diagram from ARCHITECTURE.md]

## Screenshots
[Dashboard, Customer List, Journey Timeline, Identity Graph]

## Team
[Team member names]

## Hackathon
BIT N BUILD'26 — Gujarat Round — PS-4
```

---

## 15. MVP Cut-Off

### 15.1 Feature Freeze Definition

**Feature freeze occurs at Hour 36 (end of Phase 10).**

After feature freeze, the ONLY allowed changes are:

| Allowed | NOT Allowed |
|---|---|
| Bug fixes (functionality broken) | New features |
| CSS/styling fixes | New components |
| Typo fixes in UI text | New API endpoints |
| Performance fixes (slow queries) | New database tables/columns |
| Error message improvements | Refactoring |
| README/docs updates | "Nice to have" improvements |
| Demo data adjustments | Architecture changes |

### 15.2 MVP Feature Set (Frozen at Hour 36)

| Feature | Status Required |
|---|---|
| Event ingestion (single + batch) | Working |
| Identity resolution (deterministic + probabilistic) | Working |
| Event stitching (sessions + journeys) | Working |
| Pattern detection (all 5 types) | Working |
| Dashboard with KPIs and charts | Working |
| Customer list with filters | Working |
| Customer profile | Working |
| Journey timeline | Working |
| Identity graph | Working |
| Search | Working |
| Notifications | Working |
| Seed data (Priya Sharma demo) | Loaded |
| Deployment (Vercel + Neon) | Live |

### 15.3 P2 Features (Build Only If Ahead of Schedule)

| Feature | Estimated Effort | Include If |
|---|---|---|
| Pipeline Health page | 2 hours | Ahead by 4+ hours |
| Dark mode polish | 1 hour | Ahead by 2+ hours |
| Additional chart types | 2 hours | Ahead by 4+ hours |
| Mobile responsive polish | 1 hour | Ahead by 2+ hours |

---

## 16. Final Demo Preparation

### 16.1 Demo Environment

| Item | Setup |
|---|---|
| **URL** | `https://journeyx.vercel.app` (or Railway equivalent) |
| **Database** | Neon PostgreSQL with seeded data |
| **Browser** | Chrome, full screen, bookmarks bar hidden |
| **Resolution** | 1920×1080 (for recording) |
| **Network** | Stable internet (backup: local dev server with local PostgreSQL) |

### 16.2 Demo Dataset State

Before recording, verify:

- [ ] Priya Sharma profile exists with 12 events across 5 channels.
- [ ] Priya has all 5 pattern types detected.
- [ ] Priya's churn risk is "high."
- [ ] Priya's identity graph shows 6 identifier types.
- [ ] Dashboard shows non-zero KPIs.
- [ ] Notification bell shows unread notifications.
- [ ] At least 100 customers visible in the customer list.
- [ ] Multiple churn risk levels represented.

### 16.3 Exact Click Sequence (3-Minute Demo Script)

**Scene 1: Problem Statement (0:00–0:30)**

1. Open browser to dashboard.
2. Narrate: "Customers interact across web, mobile, call centers, email, chat, and stores — each channel sees a fragment. JourneyX stitches these fragments into one unified journey."
3. Point to the dashboard KPIs: total customers, total events, channels.

**Scene 2: Data Ingestion (0:30–0:50)**

1. Show a terminal with `curl` posting a raw event.
2. Show the 202 response with `event_id`, `profile_id`, `resolution`.
3. Narrate: "Events arrive via API. Each one goes through validation, normalization, deduplication, and identity resolution — in under 200 milliseconds."

**Scene 3: Search & Identity Resolution (0:50–1:20)**

1. Click the search bar. Type "Priya."
2. Click Priya Sharma in the dropdown.
3. Click "Identity" link.
4. Show the identity graph: email, phone, device, cookie, loyalty — all linked.
5. Expand a resolution history entry. Show evidence: "deterministic match on email, confidence 1.0."
6. Show a probabilistic entry: "name similarity 96%, device match, confidence 0.94."
7. Narrate: "Priya was 5 different people across 5 channels. JourneyX resolved her to one profile. Every decision is explainable."

**Scene 4: Journey Timeline & Patterns (1:20–2:20)**

1. Click "Journey" link.
2. Show the vertical timeline. Point to channel colors.
3. Point to session boundary markers.
4. Point to the drop-off badge: "Priya started checkout on web but never completed — that's a drop-off."
5. Point to the escalation badge: "She moved from mobile to call center — an escalation."
6. Point to the repeat contact badge: "Three support contacts in 7 days."
7. Expand an event card. Show metadata.
8. Point to the churn risk badge: "High churn risk — escalation, unresolved issue, repeated support contacts."
9. Narrate: "This is the story no single channel could tell. JourneyX detected 4 friction patterns automatically."

**Scene 5: Analytics & Close (2:20–3:00)**

1. Navigate to Dashboard.
2. Point to charts: events by channel, resolution methods, pattern distribution.
3. Point to churn risk distribution.
4. Show notification bell — click to show notifications (churn warning, identity conflict).
5. Narrate: "JourneyX doesn't just collect data — it surfaces the moments that matter. Drop-offs. Escalations. Churn risk. All with transparent, explainable identity resolution."
6. Close with: "Built for hackathon scale, designed for production."

### 16.4 Backup Plan

| Failure | Backup |
|---|---|
| Deployed site unreachable | Run `npm run dev` locally with local PostgreSQL. |
| Database connection lost | Local PostgreSQL with pre-seeded data. |
| Internet drops during recording | Pre-record the demo locally. |
| Search doesn't work | Navigate directly to Priya's profile via bookmarked URL. |
| Charts don't render | Point to KPI cards (always server-rendered). |

### 16.5 Pre-Demo Checklist

- [ ] Deployed URL loads in < 3 seconds.
- [ ] Dashboard shows data (not empty state).
- [ ] Search for "Priya" returns results.
- [ ] Priya's journey timeline renders with 12 events.
- [ ] Identity graph shows 6 identifier nodes.
- [ ] Pattern badges visible on timeline.
- [ ] Notification bell shows unread count.
- [ ] Chrome in full-screen, bookmarks hidden.
- [ ] Screen recording software ready.
- [ ] Microphone tested.
- [ ] Script rehearsed at least once.

### 16.6 Video Recording

| Setting | Value |
|---|---|
| Resolution | 1920×1080 |
| Format | MP4 |
| Max length | 3 minutes |
| Audio | Voiceover narration |
| Editing | Trim dead air. Add text overlays for key points (optional). |

---

## 17. Final Checklist

```
REPOSITORY & CODE
[ ] Public GitHub repository created
[ ] README with problem, solution, setup, demo guide
[ ] Continuous, meaningful commits (30+ commits)
[ ] Clean code (no commented-out blocks, no TODO in production paths)
[ ] .env.example present, .env.local gitignored
[ ] No secrets in repository

DATABASE
[ ] Prisma schema with 7 tables
[ ] Migrations run successfully
[ ] Indexes match DATA_MODEL spec
[ ] Seed script populates ~500 customers, ~15,000 events

EVENT PIPELINE
[ ] POST /api/v1/events accepts and processes events
[ ] POST /api/v1/events/batch handles up to 100 events
[ ] Validation rejects malformed events with field-level errors
[ ] Normalization: timestamps UTC, identifiers normalized, dedup keys generated
[ ] Deduplication: same event within 5 minutes returns duplicate flag
[ ] Pipeline runs end-to-end in < 200ms per event

IDENTITY RESOLUTION
[ ] Deterministic matching on email, phone, loyalty_id
[ ] Probabilistic scoring on device_id, cookie_id, name
[ ] Jaro-Winkler name matching with 0.85 threshold
[ ] Signal weights: device_id=0.60, cookie_id=0.30, name=0.20, temporal=0.10
[ ] Confidence threshold: 0.70 for probabilistic match
[ ] Score cap: 0.94 for probabilistic
[ ] Conflict detection when strong identifiers match 2+ profiles
[ ] Identifier expansion on match
[ ] Resolution logs with full evidence
[ ] Explainable — every decision has a "because" trail

EVENT STITCHING
[ ] Events linked to correct profile
[ ] Sessions computed with 30-minute gap
[ ] Journey boundaries computed with 24-hour gap
[ ] Cross-channel transitions detected
[ ] Profile metadata updated (event_count, channels_used, etc.)

PATTERN DETECTION
[ ] Drop-off: checkout_start without purchase within 2 hours
[ ] Escalation: lower-tier → higher-tier channel within 24 hours
[ ] Repeat contact: 2+ support events in 7 days
[ ] Unresolved issue: ticket without resolution in 7 days
[ ] Churn signals: rule-based aggregation → risk level
[ ] Profile flags updated (has_drop_off, has_escalation, etc.)
[ ] churn_risk updated on profile

FRONTEND
[ ] Dashboard with 9 KPI cards and 6 charts
[ ] Customer list with filters (pattern, channel, churn, confidence)
[ ] Customer list with sorting and pagination
[ ] Customer profile with pattern summary
[ ] Journey timeline with channel colors, session/journey boundaries
[ ] Journey timeline with expandable event cards
[ ] Journey timeline with pattern badge annotations
[ ] Identity graph with confidence edges
[ ] Identity resolution history with evidence
[ ] Search bar with type-ahead
[ ] Notification bell with unread badge and dropdown
[ ] Loading skeletons on all pages
[ ] Error boundaries on all pages
[ ] Responsive on mobile

ANALYTICS
[ ] Total customers, total events, events by channel
[ ] Resolution method distribution
[ ] Confidence distribution
[ ] Pattern counts by type
[ ] Churn risk distribution
[ ] Drop-offs by process
[ ] Escalations by channel pair

NOTIFICATIONS
[ ] Identity conflict → WARNING notification
[ ] High churn risk → CRITICAL notification
[ ] Escalation threshold → INFO notification
[ ] Repeat contact 3+ → WARNING notification
[ ] Notification bell badge count
[ ] Mark as read

TESTING
[ ] Validator unit tests pass
[ ] Normalizer unit tests pass
[ ] Probabilistic scorer unit tests pass
[ ] Pattern detector unit tests pass
[ ] Pipeline integration tests pass
[ ] Identity resolution integration tests pass
[ ] E2E demo scenario test passes

DEPLOYMENT
[ ] Application deployed to Vercel (or Railway)
[ ] Database deployed to Neon (or Railway)
[ ] Health check returns OK
[ ] Demo data seeded
[ ] All pages load on deployed URL

DEMO
[ ] Demo dataset includes Priya Sharma scenario
[ ] Demo video recorded (≤ 3 minutes)
[ ] Demo video shows: identity resolution, journey timeline, patterns, analytics
[ ] Presentation deck (8–12 slides)

SUBMISSION
[ ] Public GitHub URL ready
[ ] Demo video uploaded
[ ] Presentation deck ready
[ ] Team info in README
```

---

## 18. Final Output

### A. Build Order

```
1.  Initialize project (Next.js + TypeScript + Tailwind)
2.  Install dependencies + shadcn/ui init
3.  Prisma schema + migration
4.  Shared types + errors + logger + DB client
5.  Event validator + unit tests
6.  Event normalizer + unit tests
7.  Deduplicator
8.  Deterministic matcher
9.  Probabilistic scorer (+ Jaro-Winkler) + unit tests
10. Confidence module
11. Conflict handler
12. Explainability module
13. Identity resolver orchestrator + integration tests
14. Pipeline processor + integration tests
15. Journey stitcher
16. Drop-off detector + tests
17. Escalation detector + tests
18. Repeat contact detector + tests
19. Unresolved issue detector + tests
20. Churn evaluator + tests
21. Pattern detection orchestrator
22. POST /events + POST /events/batch
23. GET /customers + GET /customers/search
24. GET /customers/:id + GET /customers/:id/journey + GET /customers/:id/identity
25. GET /events/:id
26. GET /analytics/summary
27. GET /notifications + POST /notifications/read
28. GET /pipeline/health + GET /health
29. Seed script + demo scenarios
30. Design tokens + shadcn/ui components
31. Application shell (layout + nav + sidebar)
32. Dashboard page
33. Customer list page
34. Customer profile page
35. Journey timeline page
36. Identity graph page
37. Search bar
38. Notification bell
39. Loading/error states
40. Pipeline health page (P2)
41. Integration tests + E2E tests
42. Bug fixes
43. Deploy to Vercel + Neon
44. Seed production database
45. Verify deployment
46. Write final README
47. Record demo video
48. Create presentation deck
```

### B. Team Task Allocation

| Member | Primary Responsibility | Tasks |
|---|---|---|
| **A (Backend Lead)** | Database, pipeline, identity, API routes, deployment | T-005 through T-048, T-049 (seed), T-065, T-066 |
| **B (Frontend Lead)** | UI components, pages, design system, responsive | T-050 through T-061, T-064 (UI bugs) |
| **C (Full-Stack)** | Tests, docs, seed data, demo prep | T-013, T-015, T-020, T-025, T-027, T-035, T-062, T-063, T-067, T-068, T-069 |

### C. Critical Path

```
Prisma Schema → Shared Types → Validator → Normalizer → Deterministic Matcher
→ Probabilistic Scorer → Identity Resolver → Pipeline Processor → Journey Stitcher
→ Pattern Detectors → API Routes → Seed Script → Frontend Pages → Deploy → Demo

Time on critical path: ~42 hours
Total buffer: ~6 hours
```

The critical path runs through the backend. If identity resolution takes longer than 5 hours, it delays everything downstream. Mitigation: start with deterministic-only resolution (works end-to-end), add probabilistic as an enhancement.

### D. MVP Definition

**JourneyX MVP = a deployed web application that:**

1. Ingests events from 6 channels via REST API.
2. Resolves fragmented identities using deterministic + probabilistic matching.
3. Stitches events into unified customer timelines with session/journey boundaries.
4. Detects 5 friction patterns (drop-off, escalation, repeat, unresolved, churn).
5. Displays an analytics dashboard with KPIs and charts.
6. Provides customer search, profile view, journey timeline, and identity graph.
7. Shows notifications for high-severity patterns and identity conflicts.
8. Includes a deterministic demo scenario (Priya Sharma) that exercises all features.
9. Explains every identity decision with stored evidence.

**What MVP is NOT:** authentication, real-time push, ML models, data export, mobile app, admin settings, CI/CD pipeline, monitoring dashboards, production-scale optimization.

### E. Feature Freeze

**Hour 36. No new features after this point.**

Hours 36–42: testing, bug fixes, deployment.
Hours 42–48: demo recording, presentation, submission prep.

### F. Demo Plan

1. **Deployed URL:** `https://journeyx.vercel.app`
2. **Demo script:** 3 minutes, 5 scenes (Problem → Ingestion → Identity → Journey → Analytics)
3. **Star scenario:** Priya Sharma — 12 events, 5 channels, 6 identifiers, 4 friction patterns, high churn risk
4. **Differentiator to emphasize:** Explainable identity resolution (show the evidence, not just the match)
5. **Backup:** Local dev server with local PostgreSQL + pre-recorded video

### G. Submission Checklist

```
[ ] Public GitHub repository URL
[ ] Continuous commits visible (30+ commits across development period)
[ ] README.md with:
    [ ] Problem statement
    [ ] Solution overview
    [ ] Tech stack
    [ ] Architecture diagram
    [ ] Setup instructions
    [ ] Demo guide
    [ ] Screenshots
    [ ] Team info
[ ] Live deployment URL
[ ] Demo video (≤ 3 minutes, MP4)
[ ] Presentation deck (8–12 slides, PDF/PPTX)
[ ] All tests passing
[ ] No secrets in repository
[ ] No broken links in README
```

---

*End of Implementation Plan*
