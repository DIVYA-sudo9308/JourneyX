# JourneyX — System Architecture

**Version:** 1.0
**Date:** 2026-09-19
**Companions:** [PRD](PRD.md) · [TRD](TRD.md) · [App Flow](APP_FLOW.md) · [Data Model](DATA_MODEL.md)
**Hackathon:** BIT N BUILD'26 — Gujarat Round

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Component Architecture](#2-component-architecture)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Backend Architecture](#4-backend-architecture)
5. [Data Architecture](#5-data-architecture)
6. [Identity Resolution Architecture](#6-identity-resolution-architecture)
7. [Event Pipeline](#7-event-pipeline)
8. [Real-Time Layer](#8-real-time-layer)
9. [AI/ML Architecture](#9-aiml-architecture)
10. [Security Architecture](#10-security-architecture)
11. [Deployment Architecture](#11-deployment-architecture)
12. [Failure Handling](#12-failure-handling)
13. [Scalability](#13-scalability)
14. [Final Architecture Diagrams](#14-final-architecture-diagrams)

---

## 1. High-Level Architecture

### 1.1 Architecture Style

**Monolithic, modular, single-process.** JourneyX is one Next.js application that serves the frontend, the API, the event pipeline, and the identity resolution engine — all in a single deployable unit communicating with a single PostgreSQL database.

This is a deliberate choice, not a shortcut:

| Alternative Considered | Why Rejected |
|---|---|
| Microservices (separate identity service, event service, analytics service) | Adds 4+ deployables, inter-service networking, eventual consistency, and distributed tracing — all for a system that handles ~15,000 events total. The engineering cost exceeds the hackathon timeline by a factor of 3. |
| Event-driven with message broker (Kafka, RabbitMQ, Redis Streams) | Events are processed synchronously in <200ms. No throughput requirement justifies async processing. A message broker adds infrastructure cost and failure modes (queue overflow, message loss, consumer lag) with zero benefit at hackathon scale. |
| Serverless functions (separate Lambda/Cloud Function per pipeline stage) | Cold start latency (~500ms per function) exceeds the entire pipeline processing time (<200ms). Inter-function communication adds latency and cost. |

### 1.2 System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                                  │
│                                                                      │
│  Web       Mobile     Call Center    Email     Chat     In-Store     │
│  Events    Events     Events         Events    Events   Events       │
└─────┬────────┬──────────┬─────────────┬─────────┬────────┬──────────┘
      │        │          │             │         │        │
      └────────┴──────────┴──────┬──────┴─────────┴────────┘
                                 │
                    POST /api/v1/events
                    POST /api/v1/events/batch
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     NEXT.JS APPLICATION                              │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  API LAYER  (app/api/v1/*)                                   │    │
│  │                                                              │    │
│  │  Ingestion Routes    Query Routes      Health Route          │    │
│  │  POST /events        GET /customers    GET /health           │    │
│  │  POST /events/batch  GET /customers/   GET /pipeline/health  │    │
│  │                        search                                │    │
│  │                      GET /customers/                         │    │
│  │                        :id                                   │    │
│  │                      GET /customers/                         │    │
│  │                        :id/journey                           │    │
│  │                      GET /customers/                         │    │
│  │                        :id/identity                          │    │
│  │                      GET /events/:id                         │    │
│  │                      GET /analytics/                         │    │
│  │                        summary                               │    │
│  └────────────────────────┬─────────────────────────────────────┘    │
│                           │                                          │
│  ┌────────────────────────▼─────────────────────────────────────┐    │
│  │  BUSINESS LOGIC LAYER  (lib/*)                               │    │
│  │                                                              │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │    │
│  │  │ lib/pipeline  │  │ lib/identity │  │ lib/journey  │       │    │
│  │  │              │  │              │  │              │       │    │
│  │  │ processor    │  │ resolver     │  │ stitcher     │       │    │
│  │  │ validator    │  │ deterministic│  │ patterns     │       │    │
│  │  │ normalizer   │  │ probabilistic│  │ dropoff      │       │    │
│  │  │ deduplicator │  │ confidence   │  │ escalation   │       │    │
│  │  │              │  │ conflicts    │  │ repeat       │       │    │
│  │  │              │  │ explainabil. │  │ unresolved   │       │    │
│  │  │              │  │              │  │ churn        │       │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘       │    │
│  │                                                              │    │
│  │  ┌──────────────┐  ┌──────────────┐                          │    │
│  │  │ lib/analytics│  │ lib/shared   │                          │    │
│  │  │              │  │              │                          │    │
│  │  │ aggregator   │  │ types        │                          │    │
│  │  │ queries      │  │ errors       │                          │    │
│  │  │              │  │ logger       │                          │    │
│  │  │              │  │ db           │                          │    │
│  │  └──────────────┘  └──────────────┘                          │    │
│  └────────────────────────┬─────────────────────────────────────┘    │
│                           │ Prisma Client                            │
│  ┌────────────────────────▼─────────────────────────────────────┐    │
│  │  FRONTEND LAYER  (app/*)                                     │    │
│  │                                                              │    │
│  │  Layout (nav, search bar, notification bell)                 │    │
│  │  ├── /dashboard         (Analytics)                          │    │
│  │  ├── /customers         (Customer List)                      │    │
│  │  ├── /customers/[id]    (Profile)                            │    │
│  │  ├── /customers/[id]/journey  (Timeline)                     │    │
│  │  ├── /customers/[id]/identity (Identity Graph)               │    │
│  │  └── /pipeline          (Pipeline Health, P2)                │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ DATABASE_URL
                               ▼
                ┌──────────────────────────┐
                │   PostgreSQL 16          │
                │   (Neon / Railway)       │
                │                          │
                │   7 tables               │
                │   19 indexes             │
                │   ~52,500 rows (demo)    │
                └──────────────────────────┘
```

### 1.3 Why This Differs from the Prompt's Suggested Architecture

The prompt suggested a 12-layer architecture with an Event Gateway, Queue/Stream, Workers, API Gateway, and separate Analytics/ML layer. JourneyX's architecture is intentionally flatter:

| Suggested Layer | JourneyX Equivalent | Why Flattened |
|---|---|---|
| Data Sources | External systems calling `POST /events` | Same concept — JourneyX doesn't collect data; it receives it via API. |
| Event Gateway | Next.js API route handler | No dedicated gateway needed. The API route IS the gateway for a single-app monolith. |
| Event Validation | `lib/pipeline/validator.ts` | Inline in the pipeline, not a separate service. |
| Normalization | `lib/pipeline/normalizer.ts` | Inline. |
| Identity Resolution | `lib/identity/resolver.ts` | Inline. This is the most complex component but still runs in-process in <50ms. |
| Identity Store | PostgreSQL (`customer_profiles`, `customer_identifiers`) | Same database, not a separate store. |
| Event Store | PostgreSQL (`events`) | Same database. |
| Journey Engine | `lib/journey/stitcher.ts` + `lib/journey/patterns.ts` | Inline. |
| Analytics/ML | `lib/analytics/aggregator.ts` | Inline. No ML — rule-based only. |
| API Gateway | Next.js API routes | No separate gateway. Next.js IS the gateway. |
| Queue/Stream | **Eliminated** | Synchronous processing. No queue needed. |
| Workers | **Eliminated** | No background workers. All processing is synchronous within the API request. |

The architecture has the same logical layers — ingestion, identity, journey, analytics, storage, API, frontend — but implements them as **modules in a single process**, not as separate services.

### 1.4 Cross-Cutting Concerns

| Concern | Implementation | Location |
|---|---|---|
| **Error handling** | Typed `AppError` class with code, status, message, details | `lib/shared/errors.ts` |
| **Logging** | Structured JSON to stdout, PII-free | `lib/shared/logger.ts` |
| **Validation** | Zod schemas for all API inputs | `lib/pipeline/validator.ts` |
| **Database access** | Prisma Client singleton | `lib/shared/db.ts` |
| **Type safety** | Shared TypeScript interfaces across API and frontend | `lib/shared/types.ts` |
| **Rate limiting** | In-memory rate limiter on ingestion endpoints | `lib/shared/rate-limiter.ts` |

---

## 2. Component Architecture

### 2.1 Component Inventory

Every component in the system, with its complete specification:

---

#### C-01: API Route Handler (Ingestion)

| Attribute | Detail |
|---|---|
| **Responsibility** | Accept HTTP requests for event ingestion. Parse JSON body. Route to the pipeline processor. Return structured responses. |
| **Technology** | Next.js App Router API routes (TypeScript) |
| **Files** | `app/api/v1/events/route.ts`, `app/api/v1/events/batch/route.ts` |
| **Input** | HTTP POST with JSON body (`RawEvent` or `{events: RawEvent[]}`) |
| **Output** | HTTP 202 (success) with event_id + profile_id + resolution info, or HTTP 400 (validation error) with field-level errors |
| **Dependencies** | `lib/pipeline/processor.ts`, `lib/shared/rate-limiter.ts` |
| **Failure Modes** | Invalid JSON → 400. Rate limited → 429. Pipeline error → 500 (bubbles from processor). Request body too large → 413 (Next.js default 1MB limit). |

---

#### C-02: API Route Handler (Query)

| Attribute | Detail |
|---|---|
| **Responsibility** | Accept HTTP GET requests for customer data, journey data, analytics. Parse query parameters. Call service functions. Return structured JSON responses with pagination. |
| **Technology** | Next.js App Router API routes (TypeScript) |
| **Files** | `app/api/v1/customers/route.ts`, `app/api/v1/customers/search/route.ts`, `app/api/v1/customers/[id]/route.ts`, `app/api/v1/customers/[id]/journey/route.ts`, `app/api/v1/customers/[id]/identity/route.ts`, `app/api/v1/events/[id]/route.ts`, `app/api/v1/analytics/summary/route.ts`, `app/api/v1/pipeline/health/route.ts` |
| **Input** | HTTP GET with URL query parameters (filters, pagination, sorting) |
| **Output** | HTTP 200 with `{data: ..., pagination?: ...}` or HTTP 404 (not found) |
| **Dependencies** | Prisma Client (`lib/shared/db.ts`), `lib/analytics/aggregator.ts`, `lib/journey/stitcher.ts` |
| **Failure Modes** | Invalid query params → 400 (e.g., invalid page number). Customer not found → 404. Database error → 500. |

---

#### C-03: Pipeline Processor (Orchestrator)

| Attribute | Detail |
|---|---|
| **Responsibility** | Orchestrate the full event processing pipeline: validate → normalize → deduplicate → resolve identity → stitch → detect patterns. Single entry point for all event processing. |
| **Technology** | TypeScript module |
| **File** | `lib/pipeline/processor.ts` |
| **Input** | `RawEvent` (parsed from HTTP request body) |
| **Output** | `ProcessingResult { event_id, profile_id, duplicate, resolution: { method, confidence, matched_fields } }` |
| **Dependencies** | `lib/pipeline/validator.ts`, `lib/pipeline/normalizer.ts`, `lib/pipeline/deduplicator.ts`, `lib/identity/resolver.ts`, `lib/journey/stitcher.ts`, `lib/journey/patterns.ts`, Prisma Client |
| **Failure Modes** | Validation failure → throws `AppError(VALIDATION_ERROR, 400)`. Normalization failure (bad timestamp) → throws `AppError(VALIDATION_ERROR, 400)`. Duplicate detected → returns early with `{duplicate: true}`. Database write failure → throws `AppError(INTERNAL_ERROR, 500)`. |

---

#### C-04: Validator

| Attribute | Detail |
|---|---|
| **Responsibility** | Validate raw event JSON against the Zod schema. Check required fields, types, value constraints (channel enum, at least one identifier). |
| **Technology** | Zod (TypeScript) |
| **File** | `lib/pipeline/validator.ts` |
| **Input** | Parsed JSON object (unknown type) |
| **Output** | Typed `ValidatedRawEvent` or throws `AppError` with field-level errors |
| **Dependencies** | Zod, `lib/shared/types.ts` |
| **Failure Modes** | Missing required fields → error with field list. Invalid enum value → error. No identifiers → error. All failures are validation errors (400), not crashes. |

---

#### C-05: Normalizer

| Attribute | Detail |
|---|---|
| **Responsibility** | Transform validated raw event into a normalized internal representation. Assign UUID. Parse timestamp to UTC Date. Lowercase/trim identifiers. Map event_type to event_category. Compute dedup_key. |
| **Technology** | TypeScript, Node.js `crypto` (SHA-256 for dedup_key) |
| **File** | `lib/pipeline/normalizer.ts` |
| **Input** | `ValidatedRawEvent` |
| **Output** | `NormalizedEvent` (with UUID, parsed timestamp, normalized identifiers, dedup_key, event_category) |
| **Dependencies** | Node.js `crypto`, event type taxonomy mapping |
| **Failure Modes** | Unparseable timestamp (passed initial string check but `new Date()` returns Invalid Date) → throws validation error. Timestamp >1 hour in the future → throws validation error. |

---

#### C-06: Deduplicator

| Attribute | Detail |
|---|---|
| **Responsibility** | Check if an event is a duplicate by looking up its composite dedup_key in recent events. Prevent double-processing of the same event. |
| **Technology** | TypeScript, Prisma query |
| **File** | `lib/pipeline/deduplicator.ts` |
| **Input** | `NormalizedEvent` (specifically its `dedup_key`) |
| **Output** | `{ isDuplicate: boolean, existingEventId?: string }` |
| **Dependencies** | Prisma Client (query `events` table where `dedup_key = ?` and `created_at > NOW() - 5 minutes`) |
| **Failure Modes** | Database query error → throws (treated as processing failure, not duplicate). This is a read-only check — no writes, no side effects. |

---

#### C-07: Identity Resolver (Orchestrator)

| Attribute | Detail |
|---|---|
| **Responsibility** | Determine which customer profile an event belongs to. Orchestrate deterministic → probabilistic → new profile creation. Handle conflicts. Expand identifiers. Write resolution log. |
| **Technology** | TypeScript |
| **File** | `lib/identity/resolver.ts` |
| **Input** | `NormalizedEvent` |
| **Output** | `ResolutionResult { profileId, method, confidence, evidence, conflict, identifiersAdded }` |
| **Dependencies** | `lib/identity/deterministic.ts`, `lib/identity/probabilistic.ts`, `lib/identity/confidence.ts`, `lib/identity/conflicts.ts`, `lib/identity/explainability.ts`, Prisma Client |
| **Failure Modes** | Database error during profile lookup/create → throws 500. Conflict detected → handled gracefully (links to most-established profile, creates notification, records conflict in resolution log). Never crashes on conflict. |

---

#### C-08: Deterministic Matcher

| Attribute | Detail |
|---|---|
| **Responsibility** | Find exact matches on strong identifiers (email, phone, loyalty_id) by querying the `customer_identifiers` table. |
| **Technology** | TypeScript, Prisma query |
| **File** | `lib/identity/deterministic.ts` |
| **Input** | Strong identifiers extracted from the event (`{email?, phone?, loyalty_id?}`) |
| **Output** | `DeterministicResult { matched: boolean, profiles: [{profileId, matchedField, matchedValue}], uniqueProfiles: string[] }` |
| **Dependencies** | Prisma Client (indexed query on `customer_identifiers(identifier_type, identifier_value)`) |
| **Failure Modes** | Database error → throws (bubbles to resolver). Zero matches → returns `{matched: false}` (not a failure, falls through to probabilistic). |

---

#### C-09: Probabilistic Scorer

| Attribute | Detail |
|---|---|
| **Responsibility** | Score candidate profiles using weighted weak signals (device_id: 0.60, cookie_id: 0.30, name: 0.20 via Jaro-Winkler, temporal proximity: 0.10). Return ranked candidates with confidence scores. |
| **Technology** | TypeScript, Jaro-Winkler string similarity |
| **File** | `lib/identity/probabilistic.ts` |
| **Input** | `NormalizedEvent`, list of candidate profile IDs (from weak identifier matches) |
| **Output** | `ProbabilisticCandidate[] { profileId, score, maxPossible, confidence, evidence[] }`, sorted by confidence descending |
| **Dependencies** | Prisma Client, `jaro-winkler` npm package or inline implementation |
| **Failure Modes** | No weak identifiers on the event → returns empty candidate list (new profile will be created). All candidates below 0.70 threshold → returns candidates but resolver creates new profile. |

---

#### C-10: Journey Stitcher

| Attribute | Detail |
|---|---|
| **Responsibility** | Insert the resolved event into the customer's timeline. Update profile metadata (event_count, last_seen_at, channels_used). Compute sessions (30-min gap) and journey boundaries (24-hour gap) on the fly when queried. |
| **Technology** | TypeScript, Prisma |
| **File** | `lib/journey/stitcher.ts` |
| **Input** | Stored event (with profile_id), profile_id |
| **Output** | Updated profile metadata. On query: `JourneyEvent[]` with session_index, journey_index, is_transition. |
| **Dependencies** | Prisma Client |
| **Failure Modes** | Profile metadata update fails → non-fatal (event is already stored). Computed session/journey data is always consistent because it's derived from the stored events at query time. |

---

#### C-11: Pattern Detectors

| Attribute | Detail |
|---|---|
| **Responsibility** | Run all 5 pattern detectors against the customer's event history after each event. Store new patterns. Update profile flags. Create notifications when warranted. |
| **Technology** | TypeScript |
| **Files** | `lib/journey/patterns.ts` (orchestrator), `lib/journey/dropoff.ts`, `lib/journey/escalation.ts`, `lib/journey/repeat.ts`, `lib/journey/unresolved.ts`, `lib/journey/churn.ts` |
| **Input** | Profile ID, newly stitched event, full event history for the profile |
| **Output** | `DetectedPattern[]` (0..N new patterns created in database) |
| **Dependencies** | Prisma Client |
| **Failure Modes** | Individual detector failure → logged, other detectors still run. Pattern detection is best-effort — the event is already stored even if detection fails. |

---

#### C-12: Analytics Aggregator

| Attribute | Detail |
|---|---|
| **Responsibility** | Compute all KPIs and chart data from the database. Apply date range and channel filters. Return structured analytics summary. |
| **Technology** | TypeScript, Prisma aggregate queries |
| **Files** | `lib/analytics/aggregator.ts`, `lib/analytics/queries.ts` |
| **Input** | Optional filters: `{dateFrom?, dateTo?, channel?}` |
| **Output** | `AnalyticsSummary { kpis: {...}, charts: {...} }` |
| **Dependencies** | Prisma Client |
| **Failure Modes** | Database error → throws 500. Empty database → returns all zeros (not an error). |

---

#### C-13: Notification Service

| Attribute | Detail |
|---|---|
| **Responsibility** | Create in-app notifications during pipeline processing (churn risk, identity conflict, escalation threshold). Serve notification list and unread count. Mark notifications as read. |
| **Technology** | TypeScript, Prisma |
| **File** | `lib/shared/notifications.ts` |
| **Input** | Notification data from pattern detectors / identity resolver. Query filters from API routes. |
| **Output** | Created notification rows. Notification list for the dropdown. Unread count for the badge. |
| **Dependencies** | Prisma Client |
| **Failure Modes** | Notification creation failure → logged, non-fatal (processing continues). Notification is a side effect, never a blocker. |

---

### 2.2 Dependency Graph

```
API Route Handlers
  │
  ├── (Ingestion) ──────▶ Pipeline Processor ─────┬──▶ Validator
  │                                                ├──▶ Normalizer
  │                                                ├──▶ Deduplicator
  │                                                ├──▶ Identity Resolver ──┬──▶ Deterministic Matcher
  │                                                │                       ├──▶ Probabilistic Scorer
  │                                                │                       └──▶ Conflict Handler
  │                                                ├──▶ Journey Stitcher
  │                                                ├──▶ Pattern Detectors ──┬──▶ Drop-Off Detector
  │                                                │                       ├──▶ Escalation Detector
  │                                                │                       ├──▶ Repeat Contact Detector
  │                                                │                       ├──▶ Unresolved Issue Detector
  │                                                │                       └──▶ Churn Signal Evaluator
  │                                                └──▶ Notification Service
  │
  └── (Query) ──────────▶ Prisma Client (direct queries)
                         ▶ Analytics Aggregator
                         ▶ Journey Stitcher (for timeline computation)
```

No circular dependencies. All arrows point downward. API routes never call each other. Business logic modules never call API routes. Database access is always through Prisma Client.

---

## 3. Frontend Architecture

### 3.1 Pages

| Page | Route | Rendering | Data Fetching |
|---|---|---|---|
| Dashboard | `/dashboard` | Server Component (initial), Client for interactivity | Server: fetch analytics summary. Client: SWR with 30s refresh for live KPIs. |
| Customer List | `/customers` | Server Component (initial), Client for filters | Server: initial customer list. Client: SWR for filter/sort/pagination changes. |
| Customer Profile | `/customers/[id]` | Server Component | Server: fetch profile, identifiers, pattern summary. |
| Journey Timeline | `/customers/[id]/journey` | Server Component (initial), Client for filters/expand | Server: initial timeline. Client: SWR for filter changes. Client state for card expand/collapse. |
| Identity Graph | `/customers/[id]/identity` | Server Component | Server: fetch identity data + resolution history. |
| Pipeline Health | `/pipeline` | Server Component (initial), Client for refresh | Server: initial pipeline stats. Client: manual refresh button. |

### 3.2 Component Hierarchy

```
RootLayout
├── TopNav
│   ├── Logo + AppName
│   ├── SearchBar (persistent, client component)
│   │   └── SearchDropdown (client, appears on type)
│   └── NotificationBell (client component)
│       └── NotificationDropdown (client, appears on click)
├── Sidebar
│   ├── NavLink: Dashboard
│   ├── NavLink: Customers
│   └── NavLink: Pipeline
└── PageContent (slot)
    │
    ├── DashboardPage
    │   ├── DateRangeFilter (client)
    │   ├── ChannelFilter (client)
    │   ├── KPICardRow
    │   │   └── KPICard × 9
    │   └── ChartGrid
    │       ├── EventsByChannelChart (Recharts Bar)
    │       ├── DropOffsByProcessChart (Recharts Bar)
    │       ├── EscalationsByPairChart (Recharts Bar)
    │       ├── ResolutionMethodChart (Recharts Pie)
    │       ├── ConfidenceDistributionChart (Recharts Histogram)
    │       └── FrictionPointsChart (Recharts Bar)
    │
    ├── CustomerListPage
    │   ├── FilterSidebar (client)
    │   │   ├── PatternCheckboxes
    │   │   ├── ChannelCheckboxes
    │   │   ├── ChurnRiskSelect
    │   │   ├── ConfidenceSlider
    │   │   └── DateRangePicker
    │   ├── CustomerTable
    │   │   └── CustomerRow × N
    │   └── Pagination
    │
    ├── CustomerProfilePage
    │   ├── IdentityCard
    │   ├── JourneyStats
    │   ├── PatternSummaryCards
    │   └── ChurnRiskBadge
    │
    ├── JourneyTimelinePage
    │   ├── TimelineFilterBar (client)
    │   │   ├── ChannelToggle
    │   │   ├── EventTypeFilter
    │   │   ├── PatternFilter
    │   │   └── DateRangePicker
    │   ├── ActiveFilterChips
    │   ├── TimelineHeader
    │   └── Timeline
    │       ├── JourneyBoundary
    │       ├── SessionBoundary
    │       └── EventCard × N (client, expandable)
    │           ├── ChannelColorBar
    │           ├── EventSummary
    │           ├── PatternBadges
    │           └── EventDetail (expanded)
    │               ├── MetadataSection
    │               ├── ResolutionSection
    │               ├── PatternsSection
    │               └── RawDataSection (collapsible)
    │
    ├── IdentityGraphPage
    │   ├── IdentityGraphVisualization
    │   │   ├── ProfileNode (center)
    │   │   ├── IdentifierNode × N
    │   │   └── Edge × N (with confidence label)
    │   ├── ResolutionHistory
    │   │   └── ResolutionEntry × N (expandable)
    │   └── ConflictSection (if any)
    │
    └── PipelineHealthPage
        ├── PipelineStageFlow
        ├── IdentityResolutionStats
        └── RecentErrorsTable
```

### 3.3 State Management

| State Type | Mechanism | What Uses It |
|---|---|---|
| **Server data** | React Server Components + `fetch()` at render time | Initial page loads (dashboard KPIs, customer list, profile data). No client JavaScript needed for first paint. |
| **Client-side cache** | SWR (`stale-while-revalidate`) | Search results, filter changes, pagination, notification badge count, dashboard auto-refresh. SWR handles caching, deduplication, and background revalidation. |
| **URL state** | `useSearchParams` / Next.js URL query parameters | All filters, sort order, pagination, search queries. Persisted in the URL so filtered views are shareable and bookmarkable. |
| **Component state** | React `useState` | Event card expand/collapse, notification dropdown open/close, search dropdown visibility, active tab selection. Local, transient, not shared across components. |

**No global state store.** No Redux, no Zustand, no Context providers for data. The application is read-heavy with minimal cross-component state coordination. Each page fetches its own data. The only shared state is the URL (managed by Next.js routing) and the notification badge count (managed by a SWR hook in the TopNav).

### 3.4 API Layer

All frontend-to-backend communication uses a single `fetcher` function:

```typescript
async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new ApiError(error.error.code, error.error.message, res.status);
  }
  const json = await res.json();
  return json.data;
}
```

SWR hooks wrap every data-fetching concern:

```typescript
function useCustomers(filters: CustomerFilters) {
  const params = buildQueryString(filters);
  return useSWR<CustomerListResponse>(`/api/v1/customers?${params}`, fetcher);
}

function useAnalytics(filters: AnalyticsFilters) {
  return useSWR<AnalyticsSummary>(`/api/v1/analytics/summary?${buildQueryString(filters)}`, fetcher, {
    refreshInterval: 30000,
  });
}

function useNotificationCount() {
  return useSWR<number>('/api/v1/notifications/count', fetcher, {
    refreshInterval: 30000,
  });
}
```

### 3.5 Data Fetching Strategy

| Scenario | Strategy | Why |
|---|---|---|
| Initial page load | Server Component fetches from API route (same process, no network hop) | Fast first paint. No loading skeleton needed for initial content. |
| User applies a filter | Client-side SWR re-fetch with updated URL params | Immediate UI response (SWR shows stale data while refreshing). URL updates for shareability. |
| User expands an event card | Client-side fetch for event detail (`GET /events/:id`) | Load detail on demand. Don't fetch full detail for all events upfront. |
| Dashboard auto-refresh | SWR `refreshInterval: 30000` (30 seconds) | Background refresh without user interaction. Stale data shown instantly, fresh data replaces it silently. |
| Notification badge | SWR `refreshInterval: 30000` | Poll for new notifications. Badge count updates without page reload. |

### 3.6 Caching

| Layer | Cache | TTL | Invalidation |
|---|---|---|---|
| **SWR in-memory** | All GET responses cached by URL key | Until component unmount or manual mutate | Automatic on `refreshInterval`. Manual via `mutate()` after a user action. |
| **Next.js route cache** | Server Component data cached by route | Per-request (no ISR for hackathon — data changes on every event ingestion) | On navigation (fresh fetch on every page visit). |
| **Browser HTTP cache** | API responses not cached (no Cache-Control header set) | None | Every fetch hits the server. Appropriate for dynamic data. |

**No Redis, no CDN, no edge caching.** Data is fully dynamic (changes on every event ingestion). Static caching would serve stale data.

### 3.7 Error Boundaries

```
RootLayout
├── GlobalErrorBoundary (catches unhandled rendering errors)
│   └── Displays: "Something went wrong. Please refresh the page."
│       + "Retry" button
│
├── Each Page has its own error.tsx (Next.js convention):
│   ├── dashboard/error.tsx  → "Unable to load analytics. Retry."
│   ├── customers/error.tsx  → "Unable to load customers. Retry."
│   └── ...
│
└── Component-level error handling:
    ├── SWR `error` state → inline error message with retry button
    ├── EventCard expansion failure → "Unable to load details" inline
    └── Chart rendering failure → "Chart unavailable" placeholder
```

Errors are handled at the most specific level possible. A chart failure doesn't crash the dashboard — it shows a placeholder. A single API call failure doesn't crash the page — it shows an inline error with retry.

---

## 4. Backend Architecture

### 4.1 Route Structure

```
app/api/v1/
├── events/
│   ├── route.ts              POST   /api/v1/events
│   ├── batch/
│   │   └── route.ts          POST   /api/v1/events/batch
│   └── [id]/
│       └── route.ts          GET    /api/v1/events/:id
├── customers/
│   ├── route.ts              GET    /api/v1/customers
│   ├── search/
│   │   └── route.ts          GET    /api/v1/customers/search
│   └── [id]/
│       ├── route.ts          GET    /api/v1/customers/:id
│       ├── journey/
│       │   └── route.ts      GET    /api/v1/customers/:id/journey
│       └── identity/
│           └── route.ts      GET    /api/v1/customers/:id/identity
├── analytics/
│   └── summary/
│       └── route.ts          GET    /api/v1/analytics/summary
├── notifications/
│   ├── route.ts              GET    /api/v1/notifications
│   └── read/
│       └── route.ts          POST   /api/v1/notifications/read
├── pipeline/
│   └── health/
│       └── route.ts          GET    /api/v1/pipeline/health
└── health/
    └── route.ts              GET    /api/v1/health
```

### 4.2 Route Handler Pattern

Every API route follows the same pattern — route handlers are thin controllers that delegate to service functions:

```typescript
// app/api/v1/events/route.ts

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limit check
    const clientIp = getClientIp(request);
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
        { status: 429 }
      );
    }

    // 2. Parse request body
    const body = await request.json();

    // 3. Delegate to service
    const result = await processEvent(body);

    // 4. Return response
    return NextResponse.json({ data: result }, { status: 202 });

  } catch (error) {
    // 5. Error handling
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message, details: error.details } },
        { status: error.statusCode }
      );
    }
    logger.error('Unhandled error in POST /events', { error });
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
```

### 4.3 Service Layer

Services contain the actual business logic. They are called by route handlers but never import from `app/`:

| Service | File | Responsibility |
|---|---|---|
| Pipeline Processor | `lib/pipeline/processor.ts` | Orchestrate the full event pipeline |
| Identity Resolver | `lib/identity/resolver.ts` | Determine profile ownership |
| Journey Stitcher | `lib/journey/stitcher.ts` | Update timeline + compute sessions/journeys |
| Pattern Orchestrator | `lib/journey/patterns.ts` | Run all detectors |
| Analytics Aggregator | `lib/analytics/aggregator.ts` | Compute KPIs + chart data |

### 4.4 Domain Logic Modules

Pure business logic with no database access — these can be unit-tested without a database:

| Module | File | Pure Logic |
|---|---|---|
| Validator | `lib/pipeline/validator.ts` | Zod schema validation, business rule checks |
| Normalizer | `lib/pipeline/normalizer.ts` | Timestamp parsing, identifier normalization, dedup key generation, event type mapping |
| Probabilistic Scorer | `lib/identity/probabilistic.ts` | Signal weight calculation, Jaro-Winkler scoring, confidence computation |
| Drop-Off Detector | `lib/journey/dropoff.ts` | Process definition matching, window expiration check |
| Escalation Detector | `lib/journey/escalation.ts` | Channel tier comparison, time window check |
| Repeat Contact Detector | `lib/journey/repeat.ts` | Support event counting within 7-day window |
| Unresolved Detector | `lib/journey/unresolved.ts` | Resolution window expiration check |
| Churn Evaluator | `lib/journey/churn.ts` | Rule evaluation, risk level aggregation |

### 4.5 Repository Layer

JourneyX does NOT have a separate repository pattern. Prisma Client IS the repository. All database access goes through the Prisma singleton:

```typescript
// lib/shared/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

Service functions call `prisma.customerProfile.findUnique(...)`, `prisma.event.create(...)`, etc. directly. A separate repository abstraction would add indirection without value — Prisma already provides a typed, testable API.

### 4.6 Workers and Event Processors

**There are none.** JourneyX processes events synchronously within the API request handler. No background workers, no job queues, no cron jobs. This is justified by:

1. Processing time is <200ms per event — fast enough for synchronous handling.
2. Data volume is ~15,000 events total — no throughput pressure.
3. Background workers add failure modes (worker crashes, queue starvation, message loss) with zero benefit at hackathon scale.

The only background-like behavior is the SWR polling on the frontend (30-second interval) — but that's a client-side concern, not a backend worker.

---

## 5. Data Architecture

### 5.1 Data Flow Through the System

```
  RAW EVENT (external JSON)
       │
       │  POST /api/v1/events
       ▼
  ┌─────────────┐
  │  VALIDATED   │  Zod schema check. Types verified.
  │  RAW EVENT   │  Still external shape.
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │ NORMALIZED   │  UUID assigned. Timestamp → UTC Date.
  │ EVENT        │  Identifiers → lowercased/trimmed.
  │              │  event_type → event_category mapped.
  │              │  dedup_key → SHA-256 computed.
  │              │  Raw payload preserved.
  └──────┬──────┘
         │
         ├──── Dedup check ──── (if duplicate → stop, return early)
         │
         ▼
  ┌─────────────┐
  │ RESOLVED     │  profile_id assigned.
  │ EVENT        │  resolution_method + confidence set.
  │              │  Identifiers expanded on profile.
  │              │  Resolution log written.
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐
  │ STORED       │  Inserted into `events` table.
  │ EVENT        │  Profile metadata updated.
  │              │  Patterns detected + stored.
  │              │  Notifications created if needed.
  └─────────────┘
         │
         │  GET /api/v1/customers/:id/journey
         ▼
  ┌─────────────┐
  │ JOURNEY      │  Sessions computed (30-min gap).
  │ EVENT        │  Journeys computed (24-hour gap).
  │ (query-time) │  Transitions detected.
  │              │  Patterns annotated on events.
  └─────────────┘
```

### 5.2 Data Entities and Their Lifecycle

| Entity | Created When | Updated When | Queried When |
|---|---|---|---|
| **Customer Profile** | First event for a new identity | Every subsequent event (metadata counters), every pattern detection (flags), churn evaluation (risk level) | Customer list, profile view, search result |
| **Customer Identifier** | First event creates initial identifiers. Subsequent events expand the set. | Never updated — only created (each identifier is immutable once linked to a profile) | Identity resolution (every event), identity graph view, search |
| **Event** | Ingestion (after resolution) | Never updated (events are immutable records of what happened) | Journey timeline, event detail, analytics, pattern detection |
| **Resolution Log** | Ingestion (one per event) | Never updated | Identity graph view (resolution history), audit |
| **Detected Pattern** | Pattern detection (after event stitching) | Never updated (new patterns are new rows, not updates) | Journey timeline (annotations), profile view (counts), dashboard (aggregate KPIs) |
| **Pipeline Metric** | Every pipeline stage (one row per event per stage) | Never updated | Pipeline health dashboard |
| **Notification** | Pattern detection or identity conflict | When analyst marks as read | Notification dropdown, badge count |

### 5.3 Data Immutability

All data except `customer_profiles` and `notifications` is write-once, never updated:

| Table | Mutable? | What Changes |
|---|---|---|
| `customer_profiles` | Yes | `event_count`, `last_seen_at`, `channels_used`, `churn_risk`, `has_*` flags, `avg_confidence`, `updated_at` |
| `customer_identifiers` | No | Created once. Never updated or deleted by application logic. |
| `events` | No | Created once during ingestion. Immutable record. |
| `resolution_logs` | No | Created once per event. Immutable audit entry. |
| `detected_patterns` | No | Created once per detection. Immutable. |
| `pipeline_metrics` | No | Created once per stage. Immutable. |
| `notifications` | Yes | `read` field toggled from `false` to `true`. No other changes. |

This immutability simplifies reasoning about data consistency. The only writable entity (`customer_profiles`) is a denormalized cache that can be recomputed from immutable events and patterns.

---

## 6. Identity Resolution Architecture

### 6.1 Where Identity Resolution Occurs

Identity resolution runs **inline, synchronously, within the event ingestion API request** — between deduplication and event storage:

```
POST /api/v1/events
  │
  ▼
Validate  →  Normalize  →  Dedup  →  ┌────────────────────┐  →  Store  →  Stitch  →  Patterns
                                      │  IDENTITY          │
                                      │  RESOLUTION        │
                                      │  (synchronous,     │
                                      │   in-process,      │
                                      │   <50ms)           │
                                      └────────────────────┘
```

It does NOT run as a background job, a separate service, or a batch process. Every event gets resolved before the API returns a response.

### 6.2 Full Resolution Flow

```
Input: NormalizedEvent with identifiers { email?, phone?, loyalty_id?, device_id?, cookie_id?, name? }

  │
  ▼
┌───────────────────────────────────────────────────┐
│  STEP 1: EXTRACT & CLASSIFY IDENTIFIERS           │
│                                                   │
│  strong[] ← [email, phone, loyalty_id]            │
│             (only non-null values)                │
│  weak[]   ← [device_id, cookie_id, name]          │
│             (only non-null values)                │
│                                                   │
│  If strong is empty AND weak is empty:            │
│    → IMPOSSIBLE (validator requires ≥1 identifier)│
└──────────────────────┬────────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────────┐
│  STEP 2: CANDIDATE GENERATION (Deterministic)     │
│                                                   │
│  For each strong identifier:                      │
│    SELECT profile_id                              │
│    FROM customer_identifiers                      │
│    WHERE identifier_type = :type                  │
│      AND identifier_value = :value                │
│                                                   │
│  Results:                                         │
│    0 matches across all strong → STEP 3           │
│    1 unique profile → STEP 4a (deterministic)     │
│    2+ different profiles → STEP 5 (conflict)      │
└──────────┬─────────────┬──────────────┬───────────┘
           │ 0 matches   │ 1 match     │ 2+ profiles
           ▼             ▼              ▼
        STEP 3        STEP 4a       STEP 5
                                   (conflict)

┌───────────────────────────────────────────────────┐
│  STEP 3: CANDIDATE GENERATION (Probabilistic)     │
│  (only if deterministic found 0 matches)          │
│                                                   │
│  For each weak identifier:                        │
│    Query customer_identifiers for profiles        │
│    that have this (type, value) pair               │
│                                                   │
│  For name: query all 'name' identifiers,          │
│    compute Jaro-Winkler similarity, keep ≥ 0.85   │
│                                                   │
│  Union all candidate profile IDs                  │
│                                                   │
│  If no candidates → STEP 4b (new profile)         │
│  If candidates exist → STEP 3b (scoring)          │
└──────────────────────┬────────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────────┐
│  STEP 3b: SCORING                                 │
│                                                   │
│  For each candidate profile:                      │
│    score = 0.0, max_possible = 0.0                │
│                                                   │
│    device_id present on event?                    │
│      max_possible += 0.60                         │
│      matches profile? → score += 0.60            │
│                                                   │
│    cookie_id present on event?                    │
│      max_possible += 0.30                         │
│      matches profile? → score += 0.30            │
│                                                   │
│    name present on event?                         │
│      max_possible += 0.20                         │
│      Jaro-Winkler ≥ 0.85? → score += 0.20 × sim │
│                                                   │
│    Temporal proximity (event within 2h of         │
│    profile's last event, different channel)?      │
│      max_possible += 0.10                         │
│      proximate? → score += 0.10                   │
│                                                   │
│    confidence = score / max_possible              │
│                                                   │
│  Sort candidates by confidence DESC               │
│  If best confidence ≥ 0.70 → STEP 4a (match)     │
│  If best confidence < 0.70 → STEP 4b (new)       │
└──────────────────────┬────────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────────┐
│  STEP 4a: MATCH (link event to existing profile)  │
│                                                   │
│  Set event.profile_id = matched profile           │
│  Set event.resolution_method = 'deterministic'    │
│    or 'probabilistic'                             │
│  Set event.resolution_confidence = confidence     │
│                                                   │
│  IDENTIFIER EXPANSION:                            │
│    For each non-null identifier on the event:     │
│      If (type, value) not in customer_identifiers │
│        → INSERT new identifier row                │
│        (links this new identifier to the profile) │
│                                                   │
│  UPDATE profile: last_seen_at, event_count,       │
│    channels_used, avg_confidence                  │
│                                                   │
│  → STEP 6 (persist)                               │
└───────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────┐
│  STEP 4b: NEW PROFILE                             │
│                                                   │
│  CREATE new customer_profiles row                 │
│  INSERT all event identifiers into                │
│    customer_identifiers                           │
│  Set event.profile_id = new profile               │
│  Set event.resolution_method = 'new_profile'      │
│  Set event.resolution_confidence = 0.0            │
│                                                   │
│  → STEP 6 (persist)                               │
└───────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────┐
│  STEP 5: CONFLICT RESOLUTION                      │
│  (event's strong identifiers → 2+ profiles)       │
│                                                   │
│  Query event counts for each conflicting profile  │
│  Winner = profile with most events                │
│                                                   │
│  Link event to winner profile                     │
│  Set event.resolution_confidence = 0.75 (fixed)   │
│                                                   │
│  Record conflict in resolution_log:               │
│    conflict: true                                 │
│    conflict_details: both profiles + evidence     │
│                                                   │
│  Create NOTIFICATION:                             │
│    "Identity conflict between profiles A and B"   │
│                                                   │
│  DO NOT merge profiles                            │
│                                                   │
│  → STEP 6 (persist)                               │
└───────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────┐
│  STEP 6: PERSISTENCE                              │
│                                                   │
│  Within a Prisma $transaction:                    │
│    1. Insert/update customer_profiles              │
│    2. Insert customer_identifiers (if expanded)    │
│    3. Insert event                                 │
│    4. Insert resolution_log                        │
│    5. Insert pipeline_metrics                      │
│                                                   │
│  → Event stored. Proceed to stitching + patterns. │
└───────────────────────────────────────────────────┘
```

### 6.3 Resolution Decision Matrix

| Strong IDs Match | Weak IDs Score | Action | Method | Confidence |
|---|---|---|---|---|
| 1 profile | — (skipped) | Link to profile | deterministic | 1.0 |
| 2+ profiles | — (skipped) | Conflict: link to most-established | deterministic | 0.75 |
| 0 profiles | Best ≥ 0.70 | Link to best candidate | probabilistic | `score/max_possible` |
| 0 profiles | All < 0.70 | Create new profile | new_profile | 0.0 |
| 0 profiles | No candidates | Create new profile | new_profile | 0.0 |
| 0 strong on event | — | Skip deterministic, go probabilistic | — | — |

---

## 7. Event Pipeline

### 7.1 Pipeline Architecture

```
Producer                     JourneyX Application
(external system)            (single Next.js process)
                             
  │                          ┌────────────────────────────────────────┐
  │  POST /api/v1/events     │                                        │
  │  (HTTP + JSON)           │  ┌──────────┐                          │
  └─────────────────────────▶│  │ 1. PARSE │  Parse JSON body         │
                             │  └────┬─────┘                          │
                             │       ▼                                │
                             │  ┌──────────┐                          │
                             │  │ 2. RATE  │  Check in-memory         │
                             │  │  LIMIT   │  rate limiter            │
                             │  └────┬─────┘                          │
                             │       ▼                                │
                             │  ┌──────────┐                          │
                             │  │ 3. VALID-│  Zod schema +            │
                             │  │  ATE     │  business rules          │
                             │  └────┬─────┘                          │
                             │       ▼                                │
                             │  ┌──────────┐                          │
                             │  │ 4. NORM- │  UUID, timestamp,        │
                             │  │  ALIZE   │  identifiers, category   │
                             │  └────┬─────┘                          │
                             │       ▼                                │
                             │  ┌──────────┐                          │
                             │  │ 5. DEDUP │  SHA-256 key check       │
                             │  │          │  against recent events   │
                             │  └────┬─────┘                          │
                             │       ▼                                │
                             │  ┌──────────┐                          │
                             │  │ 6. IDENT-│  Deterministic →         │
                             │  │  ITY     │  Probabilistic →         │
                             │  │  RESOLVE │  New Profile / Conflict  │
                             │  └────┬─────┘                          │
                             │       ▼                                │
                             │  ┌──────────┐                          │
                             │  │ 7. STORE │  Prisma $transaction:    │
                             │  │          │  event + profile +       │
                             │  │          │  identifiers + log       │
                             │  └────┬─────┘                          │
                             │       ▼                                │
                             │  ┌──────────┐                          │
                             │  │ 8. STITCH│  Update profile metadata │
                             │  │          │  (counts, channels, etc) │
                             │  └────┬─────┘                          │
                             │       ▼                                │
                             │  ┌──────────┐                          │
                             │  │ 9. DETECT│  Drop-off, Escalation,   │
                             │  │ PATTERNS │  Repeat, Unresolved,     │
                             │  │          │  Churn → store patterns   │
                             │  └────┬─────┘                          │
                             │       ▼                                │
                             │  ┌──────────┐                          │
                             │  │10. NOTIFY│  Create notifications     │
                             │  │          │  if thresholds crossed    │
                             │  └────┬─────┘                          │
                             │       │                                │
                             │  HTTP 202 { event_id, profile_id,      │
                             │    resolution: { method, confidence } } │
                             └────────────────────────────────────────┘
                                     │
                                     ▼
                              ┌────────────┐
                              │ PostgreSQL │
                              │   (Neon)   │
                              └────────────┘
```

### 7.2 Is a Message Broker Needed for the MVP?

**No.** Here is the analysis:

| Criterion | Value | Verdict |
|---|---|---|
| Throughput requirement | ~15,000 events total (not per second — total) | No queue needed |
| Processing time per event | <200ms synchronous | Fits in HTTP request |
| Async required? | No — the caller (seed script or API test) can wait 200ms | Synchronous is fine |
| Failure recovery | Caller retries on 5xx. No messages to replay. | No queue needed |
| Multiple consumers? | No — one pipeline processes the event | No fan-out needed |
| Ordering guarantee? | Yes — events must be processed in order for identity resolution | Synchronous handles this trivially |

A message broker (Kafka, RabbitMQ, Redis Streams, SQS) would add:
- Infrastructure cost (managed broker or self-hosted)
- Configuration complexity (topics, partitions, consumer groups)
- New failure modes (broker unavailable, message loss, consumer lag)
- Eventual consistency (the API can't return the resolved profile_id immediately)
- At least 3 additional files of code

For zero benefit at this scale. The pipeline is synchronous.

### 7.3 Batch Processing

Batch ingestion (`POST /api/v1/events/batch`) processes up to 100 events sequentially in a single API request:

```typescript
async function processBatch(events: RawEvent[]): Promise<BatchResult> {
  const results: BatchResultItem[] = [];

  for (let i = 0; i < events.length; i++) {
    try {
      const result = await processEvent(events[i]);
      results.push({ index: i, status: 'success', event_id: result.event_id, profile_id: result.profile_id });
    } catch (error) {
      results.push({ index: i, status: 'error', error: error.message });
    }
  }

  return {
    processed: results.filter(r => r.status === 'success').length,
    failed: results.filter(r => r.status === 'error').length,
    results,
  };
}
```

Sequential processing ensures that event N sees the profile state from events 0..N-1. This is critical: if two events in the same batch carry different identifiers for the same person, the second event must see the identifier expansion from the first.

---

## 8. Real-Time Layer

### 8.1 Decision: Polling via SWR

**Primary approach: Client-side polling with SWR (`stale-while-revalidate`).**

JourneyX does not push data to the frontend. The frontend pulls data at intervals.

### 8.2 Why Polling, Not WebSockets or SSE

| Approach | Evaluated | Verdict |
|---|---|---|
| **WebSockets** | Persistent bidirectional connection. Server pushes updates when events are ingested. | **Rejected.** Adds WebSocket server setup, connection lifecycle management (open, close, reconnect, heartbeat), state synchronization, and Vercel doesn't support long-lived WebSocket connections on the free tier. The UI doesn't need sub-second updates. |
| **Server-Sent Events (SSE)** | Server pushes updates over HTTP. One-directional. | **Rejected.** Simpler than WebSockets but still requires a long-lived HTTP connection. Vercel serverless functions time out. Railway could support it, but the benefit is marginal — a 30-second polling delay is acceptable for an analytics dashboard. |
| **Polling with SWR** | Client fetches data at 30-second intervals. SWR handles caching, deduplication, and error retry. | **Selected.** Zero infrastructure. Works on all deployment platforms. 30-second latency is acceptable for every JourneyX use case. Simplest to implement and debug. |

### 8.3 Polling Configuration

| Data | Polling Interval | Why |
|---|---|---|
| Dashboard KPIs + charts | 30 seconds | CX Managers scan KPIs periodically. 30s is more than sufficient. |
| Notification badge count | 30 seconds | Analyst needs to know about new notifications, but within seconds (not milliseconds). |
| Customer list | No auto-refresh (fetch on filter change) | List is static until the analyst changes filters. |
| Journey timeline | No auto-refresh | Timeline is a historical view — it doesn't change while the analyst is looking at it. |
| Identity graph | No auto-refresh | Same reasoning. |
| Pipeline health | No auto-refresh (manual refresh button) | Admin checks health on demand, not continuously. |

### 8.4 Production Upgrade Path

If JourneyX needed sub-second push in production:

1. Add a lightweight SSE endpoint that the ingestion pipeline writes to after each event.
2. Frontend subscribes via `EventSource`.
3. SSE replaces SWR polling for the notification badge and dashboard KPIs.
4. Journey timeline and customer list remain fetch-on-demand.

This is documented for the presentation, not implemented.

---

## 9. AI/ML Architecture

### 9.1 Position: AI Assists, Never Decides

JourneyX uses AI/ML techniques in exactly two places, both fully transparent:

| Where | Technique | Purpose | Explainable? |
|---|---|---|---|
| Probabilistic identity resolution | Weighted signal scoring | Compute confidence that two identifiers belong to the same person | **Yes.** Every signal, its weight, its score, and its evidence are stored in `resolution_logs` and displayed in the Identity Graph UI. |
| Name matching | Jaro-Winkler string similarity | Determine if two name strings likely refer to the same person | **Yes.** The similarity score (0.0–1.0) and the threshold (0.85) are visible in the evidence. |

### 9.2 What Is NOT AI/ML

The rest of JourneyX is rule-based logic that happens to detect patterns — it is NOT machine learning:

| Component | Technique | Why It's Not ML |
|---|---|---|
| Drop-off detection | Process definition + time window | Hard-coded rules: "checkout_start without purchase_complete within 2 hours." No training data. No model. |
| Escalation detection | Channel tier comparison | Hard-coded channel tiers: `web=1, chat=2, call_center=3, in_store=4`. No learning. |
| Repeat contact detection | Event counting within a window | Count support events in 7 days. If ≥ 2, flag. No model. |
| Unresolved issue detection | Window expiration check | ticket_created without ticket_resolved in 7 days. Hard-coded rule. |
| Churn signal evaluation | Rule-based risk aggregation | 4 rules, each checking for specific pattern combinations. No training. |

### 9.3 Why No ML for the MVP

| ML Alternative | Why Rejected |
|---|---|
| ML-based identity resolution (entity resolution models) | Requires training data with labeled ground truth (which identifiers belong to the same person). We have no such training data. The weighted scoring approach is interpretable, testable, and sufficient for ~500 customers. |
| Predictive churn model (logistic regression, gradient boosting) | Requires labeled churn events (customers who actually churned). We have synthetic data with no real churn labels. Rule-based churn signals detect the right patterns without a model. |
| Anomaly detection for pattern discovery | Requires historical baseline data and tuning. Adds black-box behavior to a system whose value proposition is explainability. |
| NLP for support ticket analysis | No support ticket text in the event model. Events carry structured metadata (category, disposition), not raw text. |

### 9.4 Explainability Guarantee

Every "AI" decision in JourneyX can be answered with "because":

- "Why is Priya linked to this phone number?" → "Because event evt_007 carried email priya@example.com (deterministic match to her profile) AND phone 9198765432 (identifier expansion)."
- "Why is this a 0.85 confidence match?" → "Because device_id matched (0.60/0.60), name similarity was 92% (0.18/0.20), cookie_id didn't match (0/0.30). Total: 0.78/1.10 = 0.85 after temporal bonus."
- "Why is Priya flagged as high churn risk?" → "Because rule `escalation_abandonment` matched: escalation on Sep 1, no activity for 18 days."

No decision is a black box. Every decision has a paper trail in `resolution_logs` and `detected_patterns.details`.

---

## 10. Security Architecture

### 10.1 Security Layers

```
┌──────────────────────────────────────────────────┐
│  NETWORK LAYER                                    │
│                                                  │
│  HTTPS (enforced by Vercel/Railway)              │
│  CORS (same-origin for MVP)                      │
│  Rate limiting (100 req/s per IP, ingestion only)│
└──────────────────────────┬───────────────────────┘
                           │
┌──────────────────────────▼───────────────────────┐
│  INPUT VALIDATION LAYER                           │
│                                                  │
│  Zod schema validation on all API inputs         │
│  Request body size limit (1MB, Next.js default)  │
│  No raw SQL (Prisma parameterized queries)       │
│  React default escaping (XSS prevention)         │
└──────────────────────────┬───────────────────────┘
                           │
┌──────────────────────────▼───────────────────────┐
│  DATA PROTECTION LAYER                            │
│                                                  │
│  PII masking in API list responses               │
│  PII-free structured logging                     │
│  No PII in URLs or query parameters              │
│  No PII in error responses                       │
│  Synthetic data only (no real customer data)     │
└──────────────────────────┬───────────────────────┘
                           │
┌──────────────────────────▼───────────────────────┐
│  AUDIT LAYER                                      │
│                                                  │
│  resolution_logs: every identity decision        │
│  pipeline_metrics: every processing event        │
│  Structured JSON logs: every API request         │
└──────────────────────────────────────────────────┘
```

### 10.2 Authentication

**Hackathon MVP: None.** No login, no session, no JWT, no API keys. All endpoints are publicly accessible.

**Where authentication would be inserted (documented for presentation):**

```
app/
  middleware.ts    ← NextAuth.js session check on all routes
                     Redirects unauthenticated requests to /login
                     Exempt: /api/v1/health, /login, /_next/*
```

### 10.3 Authorization

**Hackathon MVP: None.** Single implicit user with full access.

**Production RBAC model (documented):**

| Role | Read Data | Write Events | Admin |
|---|---|---|---|
| Analyst | All customers, journeys, analytics | No | No |
| Admin | All | Yes (via API) | Pipeline health, user management |
| Viewer | Dashboard analytics only | No | No |

### 10.4 Secrets Management

| Secret | Storage | Access |
|---|---|---|
| `DATABASE_URL` | `.env.local` (local), Vercel/Railway environment variables (deployed) | Server-side only. Never exposed to client bundle. In `.gitignore`. |

No other secrets exist. No external API keys, no OAuth tokens, no encryption keys for the MVP.

### 10.5 PII Protection

| Context | Treatment |
|---|---|
| **Database** | PII stored in plaintext (hackathon — synthetic data only). Production: encrypt at rest + application-level field encryption. |
| **API list endpoints** | Identifiers masked: `j***@example.com`, `***-4567`. |
| **API detail endpoints** | Full PII returned (analyst needs it for investigation). |
| **Logs** | PII never logged. Identifiers logged as `identifier_type + hash(value)`. |
| **Error responses** | No PII in error messages or details. |
| **URLs** | No PII in URL paths or query params. Customers referenced by UUID. |

### 10.6 Rate Limiting

In-memory token bucket on event ingestion endpoints only:

- 100 requests per second per client IP.
- Resets every 1-second window.
- Returns `429 Too Many Requests` when exceeded.
- Query endpoints (GET) are NOT rate-limited — they serve the frontend.

### 10.7 Input Sanitization

- All user input parameterized through Prisma (no SQL injection).
- Event metadata (JSONB) accepted as-is but never rendered as raw HTML (React escaping prevents XSS).
- Search query parameterized — `WHERE identifier_value ILIKE $1`, not string concatenation.

---

## 11. Deployment Architecture

### 11.1 Primary: Vercel + Neon

```
┌─────────────────────────────────────────────────────────────┐
│                     INTERNET                                 │
│                                                             │
│   User's browser                                            │
│     │                                                       │
│     │  HTTPS                                                │
│     ▼                                                       │
│  ┌──────────────────────────────┐                           │
│  │       Vercel Edge Network    │                           │
│  │       (CDN, TLS, routing)    │                           │
│  └─────────────┬────────────────┘                           │
│                │                                            │
│                ▼                                            │
│  ┌──────────────────────────────┐                           │
│  │     Vercel Serverless        │                           │
│  │     Functions                │                           │
│  │                              │                           │
│  │  Next.js Application        │                           │
│  │  ├── Server Components      │                           │
│  │  │   (SSR at the edge)      │                           │
│  │  └── API Routes             │                           │
│  │      (serverless functions)  │                           │
│  │                              │  DATABASE_URL             │
│  └─────────────┬────────────────┘  (env var)                │
│                │                                            │
│                ▼                                            │
│  ┌──────────────────────────────┐                           │
│  │     Neon Serverless          │                           │
│  │     PostgreSQL               │                           │
│  │                              │                           │
│  │  7 tables, 19 indexes        │                           │
│  │  Free tier: 0.5 GiB storage  │                           │
│  │  Auto-scaling compute        │                           │
│  └──────────────────────────────┘                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Why Vercel + Neon:**

| Factor | Vercel | Neon |
|---|---|---|
| **Cost** | Free tier: 100GB bandwidth, serverless functions | Free tier: 0.5 GiB storage, auto-suspend compute |
| **Deployment** | Git push → automatic deploy. Zero config for Next.js. | Connection string in env var. Prisma handles migrations. |
| **Reliability** | CDN, auto-scaling, global edge network | Managed PostgreSQL with automatic backups |
| **Demo UX** | Fast global response times via CDN | Serverless PostgreSQL — scales to zero when idle, wakes in <1s |

**Vercel timeout risk:** Vercel's free tier has a 10-second function timeout. Single event processing (<200ms) is fine. Batch processing (100 events × 200ms = 20s) may exceed the limit. Mitigation: reduce batch size to 50, or switch to Railway.

### 11.2 Fallback: Railway (Full Stack)

```
┌─────────────────────────────────────────────────────────────┐
│                      Railway                                 │
│                                                             │
│  ┌──────────────────────────────┐                           │
│  │  Next.js Application         │                           │
│  │  (long-running Node process) │                           │
│  │                              │                           │
│  │  No serverless timeout       │                           │
│  │  Persistent process          │                           │
│  │  Port: 3000                  │                           │
│  └─────────────┬────────────────┘                           │
│                │ localhost                                   │
│                ▼                                            │
│  ┌──────────────────────────────┐                           │
│  │  PostgreSQL 16               │                           │
│  │  (Railway add-on)            │                           │
│  │                              │                           │
│  │  Always running (no suspend) │                           │
│  └──────────────────────────────┘                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**When to use Railway instead:**
- Batch ingestion exceeds Vercel's 10s timeout.
- Need persistent process for long-running seed script.
- Want both app and database on the same platform.

### 11.3 Deployment Workflow

```
Developer workstation                 Deployment platform
  │                                     │
  │  git push origin main               │
  │ ─────────────────────────────────▶  │
  │                                     │  1. Detect push
  │                                     │  2. Install dependencies (npm ci)
  │                                     │  3. Run Prisma generate
  │                                     │  4. Build Next.js (next build)
  │                                     │  5. Deploy
  │                                     │
  │                                     │  (on first deploy or schema change)
  │  npx prisma migrate deploy          │
  │ ─────────────────────────────────▶  │  6. Run database migrations
  │                                     │
  │  npx prisma db seed                 │
  │ ─────────────────────────────────▶  │  7. Seed synthetic data
  │                                     │
  │                              ◀──────│  8. Application live
```

### 11.4 Environment Variables

| Variable | Local (.env.local) | Deployed (platform env vars) |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/journeyx` | Platform-provided connection string |
| `NODE_ENV` | `development` | `production` |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://journeyx.vercel.app` |

Three environment variables. Nothing else.

---

## 12. Failure Handling

### 12.1 Failure Matrix

| Failure | Trigger | Detection | Response | Side Effects | Recovery |
|---|---|---|---|---|---|
| **Invalid event** | Malformed JSON, missing fields, invalid enum values | Zod validation in `validator.ts` | HTTP 400 with field-level error details | `pipeline_metrics` row with `stage='error'` and error message | Caller fixes event and resubmits. No partial writes. |
| **Duplicate event** | Same event submitted within 5-minute dedup window | SHA-256 dedup_key match in `deduplicator.ts` | HTTP 202 with `{duplicate: true, event_id: existing_id}` | `pipeline_metrics` row with `stage='deduplicated'` | No action needed — idempotent by design. |
| **Unknown identity** | Event's identifiers don't match any existing profile (deterministic or probabilistic) | Identity resolver returns `{matched: false}` for both phases | New customer profile created. All event identifiers added. `resolution_method = 'new_profile'`, `confidence = 0.0` | New profile + identifiers + event + resolution log written | No error — this is normal for first-time customers. |
| **Conflicting identity** | Event's strong identifiers match 2+ different existing profiles | `DeterministicResult.uniqueProfiles.length >= 2` | Event linked to profile with more events. Conflict recorded with full evidence. Notification created. Profiles NOT merged. | `resolution_logs` with `conflict=true`, `notifications` row created | Analyst reviews the conflict in the Identity Graph UI. Manual merge (production feature) or accepts the system's choice. |
| **Database failure** | PostgreSQL connection lost, query timeout, constraint violation | Prisma throws `PrismaClientKnownRequestError` or `PrismaClientUnknownRequestError` | HTTP 500 with `{code: 'INTERNAL_ERROR', message: 'Internal server error'}`. No internal details exposed. | Error logged (structured JSON). `pipeline_metrics` error row (if DB is reachable). Transaction rolled back — no partial writes. | Automatic reconnection via Prisma connection pool. Caller retries. If persistent, check `DATABASE_URL` and database status. |
| **Processing failure** | Unexpected runtime error in normalizer, scorer, stitcher, or pattern detector | Unhandled exception caught by route handler's catch block | HTTP 500 with generic error. | Error logged with full stack trace (server-side only, never returned to client). Pipeline error metric recorded. | Investigate logs. Fix bug. Resubmit event. |
| **Pattern detector failure** | One of the 5 detectors throws during execution | try/catch around each detector in `patterns.ts` | Event is still stored (steps 1–7 completed). Failed detector is logged. Other detectors still run. HTTP 202 returned. | The missed pattern can be detected later by re-running detection on the profile. | Non-fatal. Log the error. Fix the detector. Re-run patterns on affected profiles (manual or script). |
| **API query failure** | Database error on a GET endpoint (customer list, timeline, analytics) | Prisma error caught by route handler | HTTP 500 with generic error message. | Error logged. | User retries (manually or SWR auto-retry). No data mutation occurred. |
| **Frontend rendering failure** | React component throws during render | React Error Boundary (page-level error.tsx) | Error boundary renders fallback UI: "Something went wrong. Retry." | Error logged to browser console. | User clicks Retry or navigates away and back. |

### 12.2 Error Propagation

```
Pattern Detector fails
  → Caught by patterns.ts (logged, continues)
  → Event is stored, 202 returned

Identity Resolver fails (DB error)
  → Caught by processor.ts (propagated)
  → Caught by API route handler
  → 500 returned, error logged
  → Transaction rolled back (no partial writes)

Validator rejects event
  → AppError thrown with field details
  → Caught by API route handler
  → 400 returned with details
  → pipeline_metrics error row written
```

### 12.3 Non-Recoverable Failures

| Failure | Impact | Response |
|---|---|---|
| Database permanently unreachable | All reads and writes fail | Application returns 500 on every request. Health check returns 503. Redeploy or fix DATABASE_URL. |
| Corrupted database | Data integrity violations | Restore from backup. Re-seed synthetic data. |
| Deployment fails | Application not accessible | Roll back to previous deployment (Vercel auto-rollback, Railway revision history). |

---

## 13. Scalability

### 13.1 Hackathon MVP (Current)

| Dimension | Current | Sufficient? |
|---|---|---|
| Data volume | ~500 customers, ~15,000 events | Yes — PostgreSQL handles this trivially |
| Throughput | <10 events/second (seed script) | Yes — synchronous processing in <200ms |
| Concurrent users | 1–5 (demo judges) | Yes — Next.js handles concurrent reads |
| Storage | <50MB total | Yes — within free tier of all providers |
| Compute | Single serverless function / process | Yes — no CPU-intensive operations |

### 13.2 Pilot (~10,000 Customers, ~300,000 Events)

Changes needed to support a pilot deployment:

| Component | Current | Pilot Change | Effort |
|---|---|---|---|
| Database | Same PostgreSQL | Add connection pooling (PgBouncer or Neon's built-in). Add read replica for query endpoints. | Low |
| Analytics | Live queries | Add materialized views for dashboard KPIs. Refresh on schedule (every 5 minutes). | Medium |
| Event ingestion | Synchronous in API | Still synchronous — 200ms × 100 batch = 20s is acceptable with Railway (no serverless timeout). | None |
| Identity resolution | In-process | Still in-process — indexed queries on ~30K identifiers are fast. | None |
| Search | Prisma ILIKE query | Add `pg_trgm` extension for trigram-based fuzzy search. Or add a `tsvector` column. | Low |
| Caching | SWR client-only | Add server-side Redis cache for analytics summary (TTL: 5 minutes). | Low |
| Monitoring | Structured logs to stdout | Add Sentry for error tracking. Add basic uptime monitoring. | Low |

### 13.3 Production (~1M Customers, ~50M Events)

Changes needed for production-scale:

| Component | Pilot | Production Change | Effort |
|---|---|---|---|
| Event ingestion | Synchronous | **Async pipeline** with message queue (SQS, Redis Streams, or Kafka). API returns immediately after queuing. Background workers consume and process. | High |
| Identity resolution | In-process | **Dedicated identity service** with in-memory index of strong identifiers. Serves resolution requests from the pipeline workers. | High |
| Storage | PostgreSQL | **Event store** for raw events (append-only, partitioned by date). PostgreSQL for profiles, identifiers, patterns. TimescaleDB or ClickHouse for analytics. | High |
| Search | pg_trgm | **Elasticsearch** for full-text customer search across identifiers. | Medium |
| Analytics | Materialized views + Redis | **Pre-computed analytics** via stream processing (Flink, or scheduled batch jobs). Served from a dedicated analytics store. | High |
| Real-time | SWR polling | **SSE or WebSockets** for live dashboard updates and push notifications. | Medium |
| Authentication | None | **Auth service** (Auth0, Clerk, or NextAuth.js) with JWT tokens. API middleware for session validation. | Medium |
| Deployment | Single app | **Container orchestration** (Kubernetes or Railway services). Separate deployables for frontend, API, pipeline workers. | High |

### 13.4 Module Boundaries = Service Boundaries

The `lib/` module structure is designed so that each module maps to a potential future service:

```
Hackathon MVP (monolith)          Production (decomposed)
─────────────────────────          ──────────────────────────
lib/pipeline/*                →   Event Ingestion Service
lib/identity/*                →   Identity Resolution Service
lib/journey/*                 →   Journey Engine Service
lib/analytics/*               →   Analytics Service
app/api/*                     →   API Gateway
app/* (frontend)              →   Frontend Application (SPA)
```

This decomposition is documented for the hackathon presentation but NOT implemented. The module boundaries exist in the code as import barriers — `lib/identity` never imports from `lib/journey`, `lib/analytics` never imports from `lib/pipeline`. This discipline makes future decomposition possible without rewriting.

---

## 14. Final Architecture Diagrams

### 14.1 Diagram A: System Architecture

```mermaid
graph TB
    subgraph Sources["Data Sources"]
        WEB[Web Events]
        MOB[Mobile Events]
        CC[Call Center Events]
        EM[Email Events]
        CH[Chat Events]
        IS[In-Store Events]
    end

    subgraph NextApp["Next.js Application"]
        subgraph API["API Layer"]
            ING[POST /events<br>POST /events/batch]
            QRY[GET /customers<br>GET /journey<br>GET /identity<br>GET /analytics]
        end

        subgraph Pipeline["Event Pipeline (lib/pipeline)"]
            VAL[Validator]
            NRM[Normalizer]
            DDP[Deduplicator]
        end

        subgraph Identity["Identity Engine (lib/identity)"]
            DET[Deterministic<br>Matcher]
            PRB[Probabilistic<br>Scorer]
            CNF[Conflict<br>Handler]
        end

        subgraph Journey["Journey Engine (lib/journey)"]
            STI[Stitcher]
            PAT[Pattern<br>Detectors]
        end

        subgraph Analytics["Analytics (lib/analytics)"]
            AGG[Aggregator]
        end

        subgraph Frontend["Frontend (React)"]
            DASH[Dashboard]
            LIST[Customer List]
            PROF[Profile]
            TIME[Timeline]
            IDGR[Identity Graph]
        end
    end

    subgraph DB["PostgreSQL 16"]
        PRF[(customer_profiles)]
        IDN[(customer_identifiers)]
        EVT[(events)]
        RES[(resolution_logs)]
        PTN[(detected_patterns)]
        MET[(pipeline_metrics)]
        NOT[(notifications)]
    end

    Sources --> ING
    ING --> VAL --> NRM --> DDP
    DDP --> DET --> PRB --> CNF
    CNF --> STI --> PAT

    PAT --> PRF
    PAT --> EVT
    PAT --> PTN
    PAT --> RES
    PAT --> NOT
    PAT --> MET

    QRY --> AGG
    AGG --> DB

    Frontend --> QRY
```

### 14.2 Diagram B: Data Flow

```mermaid
flowchart LR
    RAW["Raw Event<br>(external JSON)"]
    VAL["Validated Event<br>(typed, checked)"]
    NRM["Normalized Event<br>(UUID, UTC, trimmed)"]
    DDP{"Duplicate?"}
    RES["Resolved Event<br>(profile_id assigned)"]
    STO["Stored Event<br>(in PostgreSQL)"]
    PTN["Pattern Annotations<br>(badges on timeline)"]
    JRN["Journey View<br>(sessions, journeys<br>computed at query)"]

    RAW -->|"POST /events"| VAL
    VAL -->|"normalize"| NRM
    NRM --> DDP
    DDP -->|"no"| RES
    DDP -->|"yes"| DUP["202 duplicate:true"]
    RES -->|"$transaction"| STO
    STO -->|"detect patterns"| PTN
    STO -->|"GET /journey"| JRN
```

### 14.3 Diagram C: Identity Resolution Flow

```mermaid
flowchart TD
    EVT["Incoming Event<br>with identifiers"]
    EXT["Extract & classify<br>strong vs weak"]
    DET{"Deterministic<br>match on strong<br>identifiers?"}
    ONE["1 profile matched"]
    MULTI["2+ profiles matched"]
    PROB["Probabilistic scoring<br>on weak identifiers"]
    THRESH{"Best confidence<br>≥ 0.70?"}
    MATCH["MATCH<br>Link to profile<br>Expand identifiers"]
    NEW["NEW PROFILE<br>Create profile<br>Add all identifiers"]
    CONFLICT["CONFLICT<br>Link to most-established<br>Record conflict<br>Create notification"]
    LOG["Write resolution_log<br>(method, confidence,<br>evidence, candidates)"]

    EVT --> EXT
    EXT --> DET
    DET -->|"0 matches"| PROB
    DET -->|"1 match"| ONE
    DET -->|"2+ matches"| MULTI
    ONE -->|"confidence: 1.0"| MATCH
    MULTI -->|"confidence: 0.75"| CONFLICT
    PROB --> THRESH
    THRESH -->|"yes"| MATCH
    THRESH -->|"no"| NEW
    MATCH --> LOG
    NEW --> LOG
    CONFLICT --> LOG
```

### 14.4 Diagram D: Event Processing Flow

```mermaid
sequenceDiagram
    participant Src as External Source
    participant API as API Route
    participant Val as Validator
    participant Nrm as Normalizer
    participant Dup as Deduplicator
    participant Idn as Identity Resolver
    participant Stc as Stitcher
    participant Pat as Pattern Detectors
    participant DB as PostgreSQL

    Src->>API: POST /api/v1/events (JSON)
    API->>Val: validate(rawEvent)
    Val-->>API: ValidatedEvent (or 400 error)
    API->>Nrm: normalize(validatedEvent)
    Nrm-->>API: NormalizedEvent (UUID, UTC, dedup_key)
    API->>Dup: checkDuplicate(normalizedEvent)
    Dup->>DB: SELECT WHERE dedup_key = ?
    DB-->>Dup: result
    alt Duplicate found
        Dup-->>API: {isDuplicate: true}
        API-->>Src: 202 {duplicate: true}
    else Not duplicate
        Dup-->>API: {isDuplicate: false}
        API->>Idn: resolve(normalizedEvent)
        Idn->>DB: Query customer_identifiers (deterministic)
        DB-->>Idn: matches
        alt Deterministic match
            Idn->>DB: Update profile + expand identifiers
        else No deterministic match
            Idn->>DB: Query weak identifier candidates
            Idn->>Idn: Score candidates (probabilistic)
            alt Best score ≥ 0.70
                Idn->>DB: Link to matched profile
            else Below threshold
                Idn->>DB: Create new profile + identifiers
            end
        end
        Idn->>DB: INSERT resolution_log
        Idn-->>API: {profileId, method, confidence}
        API->>DB: INSERT event (within $transaction)
        API->>Stc: updateProfileMetadata(profileId)
        Stc->>DB: UPDATE customer_profiles (counts, channels)
        API->>Pat: detectPatterns(profileId, event)
        Pat->>DB: Query profile events
        Pat->>Pat: Run 5 detectors
        Pat->>DB: INSERT detected_patterns (0..N)
        Pat->>DB: UPDATE profile flags
        Pat->>DB: INSERT notifications (if warranted)
        API->>DB: INSERT pipeline_metrics
        API-->>Src: 202 {event_id, profile_id, resolution}
    end
```

### 14.5 Diagram E: Deployment Architecture

```mermaid
graph TB
    subgraph Browser["User's Browser"]
        UI["JourneyX Frontend<br>(React SPA)"]
    end

    subgraph Vercel["Vercel (Primary)"]
        EDGE["Edge Network<br>(CDN, TLS, routing)"]
        SSR["Server Components<br>(SSR at edge)"]
        FN["Serverless Functions<br>(API routes)"]
    end

    subgraph Neon["Neon (Database)"]
        PG["PostgreSQL 16<br>(serverless, auto-suspend)"]
    end

    subgraph Railway["Railway (Fallback)"]
        APP["Next.js Process<br>(long-running)"]
        PGDB["PostgreSQL 16<br>(Railway add-on)"]
    end

    UI <-->|HTTPS| EDGE
    EDGE --> SSR
    EDGE --> FN
    FN <-->|DATABASE_URL| PG

    APP <--> PGDB

    style Railway stroke-dasharray: 5 5
```

### 14.6 Contradictions Identified

I reviewed the PRD, TRD, App Flow, and Data Model for technical contradictions with this architecture. **One minor inconsistency found:**

| Document | States | Architecture Impact | Resolution |
|---|---|---|---|
| TRD Section 14.5 | Rate limit: "100 requests per second per client" | TRD Section 2.4 (TR-021) says: "100 requests/second per client" | **No contradiction.** Both say 100/sec. Consistent. |
| Data Model Section 3.7 | `notifications` table has `severity` and `deep_link` columns | TRD Section 3.2 schema omits these columns | **Minor gap, already documented in Data Model Section 15.3.** The Data Model added two columns (`severity`, `deep_link`) that the TRD didn't include. Both are additive, nullable/default, backward-compatible. **Correction: use the Data Model's expanded schema** — it implements the notification system from the App Flow spec, which the TRD schema predated. |

No structural contradictions found. All documents agree on: monolithic architecture, synchronous pipeline, 7 database tables, no WebSockets, no message broker, no authentication, SWR polling, Vercel+Neon or Railway deployment.

---

*End of System Architecture*
