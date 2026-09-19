# JourneyX — Technical Requirements Document

**Version:** 1.0
**Date:** 2026-09-19
**Companion:** [PRD v1.0](PRD.md)
**Hackathon:** BIT N BUILD'26 — Gujarat Round
**Problem Statement:** PS-4 — Cross-Channel Journey Stitching

---

## Table of Contents

1. [Technical Overview](#1-technical-overview)
2. [System Requirements](#2-system-requirements)
3. [System Architecture](#3-system-architecture)
4. [Frontend Requirements](#4-frontend-requirements)
5. [Backend Requirements](#5-backend-requirements)
6. [Event Ingestion](#6-event-ingestion)
7. [Identity Resolution Engine](#7-identity-resolution-engine)
8. [Event Stitching Engine](#8-event-stitching-engine)
9. [Journey Engine](#9-journey-engine)
10. [Analytics Engine](#10-analytics-engine)
11. [AI/ML Layer](#11-aiml-layer)
12. [API Specification](#12-api-specification)
13. [Real-Time Communication](#13-real-time-communication)
14. [Security](#14-security)
15. [Observability](#15-observability)
16. [Testing](#16-testing)
17. [Performance](#17-performance)
18. [Deployment](#18-deployment)
19. [Technical Risks](#19-technical-risks)
20. [Final Technical Specification](#20-final-technical-specification)

---

## 1. Technical Overview

### 1.1 System Purpose

JourneyX is a web application that ingests customer interaction events from multiple channels, resolves fragmented identities into unified customer profiles, stitches events into chronological journeys, detects friction patterns (drop-offs, escalations, repeat contacts, unresolved issues, churn signals), and presents the results through an analyst-facing interface with search, timeline visualization, and analytics.

### 1.2 System Boundaries

**What the system does:**

- Accepts raw events via REST API (the ingestion boundary).
- Processes events through a synchronous pipeline: validate → normalize → deduplicate → resolve identity → stitch → detect patterns → store.
- Stores unified customer profiles, stitched journeys, pattern detections, and identity resolution audit logs.
- Serves a web UI for customer search, profile viewing, journey timeline exploration, filtering, and analytics.

**What the system does not do:**

- Does not collect events from source systems (no SDKs, no connectors, no scrapers).
- Does not push data to external systems (no reverse ETL, no webhooks, no email).
- Does not stream events in real time to the frontend (batch/poll model — see Section 13).
- Does not perform predictive modeling (rule-based pattern detection only — see Section 11).
- Does not manage user authentication (single-user hackathon demo — see Section 14).

### 1.3 Technology Stack

| Layer | Technology | Justification |
|---|---|---|
| **Frontend** | Next.js 14+ (React, TypeScript) | Server-side rendering for initial load performance. App Router for layout/nested routes. React for component-based UI. TypeScript for type safety across the stack. |
| **UI Components** | shadcn/ui + Tailwind CSS | Pre-built, accessible components (tables, cards, badges, dialogs). Tailwind for rapid styling without CSS overhead. No runtime CSS-in-JS cost. |
| **Charts** | Recharts | React-native charting. Sufficient for bar charts, pie charts, histograms, and heatmaps required by PRD Section 12. |
| **Backend** | Next.js API Routes (TypeScript) | Co-located with frontend — single deployment. TypeScript shared types between API and UI. No inter-service network latency for a monolith. |
| **Database** | PostgreSQL 16 | Relational model fits the identity graph (profiles → identifiers, profiles → events). JSONB for flexible event metadata. Full-text search for customer search. GIN indexes for array/JSONB queries. Mature, reliable, free. |
| **ORM** | Prisma | Type-safe database client generated from schema. Migration management. Works with PostgreSQL and Next.js. |
| **Identity Resolution** | Custom TypeScript (in-process) | The core algorithm — must be built, not imported. Deterministic matching via indexed SQL queries. Probabilistic scoring via in-process computation. |
| **Synthetic Data** | Custom TypeScript seed script | Generates realistic multi-channel customer journeys with known ground truth for testing and demo. |
| **Deployment** | Vercel (frontend) + Neon/Supabase (PostgreSQL) or Railway (full stack) | Zero-config deployment. Free tier sufficient for hackathon. PostgreSQL managed service eliminates ops burden. |

### 1.4 Architecture Style

**Monolithic, modular.** The entire system is a single Next.js application with:

- `/app` — Frontend pages and layouts (App Router).
- `/app/api` — Backend API routes.
- `/lib` — Shared business logic organized by domain (pipeline, identity, journey, analytics).
- `/prisma` — Database schema and migrations.

The module boundaries (`lib/pipeline`, `lib/identity`, `lib/journey`, `lib/analytics`) are where the monolith would decompose into services in a production architecture. This is documented for the presentation but not implemented.

### 1.5 Data Flow Summary

```
External Systems
  │
  │  POST /api/v1/events  (or /events/batch)
  │
  ▼
┌──────────────────────────────────────────────────┐
│  INGESTION LAYER                                 │
│  ┌──────────┐  ┌────────────┐  ┌──────────────┐ │
│  │ Validate │→ │ Normalize  │→ │ Deduplicate  │ │
│  └──────────┘  └────────────┘  └──────────────┘ │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│  IDENTITY LAYER                                  │
│  ┌─────────────────┐  ┌───────────────────────┐  │
│  │  Deterministic   │→ │  Probabilistic        │  │
│  │  Matching        │  │  Scoring (if needed)  │  │
│  └─────────────────┘  └───────────────────────┘  │
│            │                                      │
│            ▼                                      │
│  ┌──────────────────────────────┐                │
│  │  Profile Update / Create     │                │
│  │  (identifier expansion,     │                │
│  │   conflict detection)       │                │
│  └──────────────────────────────┘                │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│  JOURNEY LAYER                                   │
│  ┌──────────────┐  ┌────────────────────────┐    │
│  │ Stitch Event │→ │ Detect Patterns        │    │
│  │ into Timeline│  │ (drop-off, escalation, │    │
│  │              │  │  repeat, unresolved,   │    │
│  │              │  │  churn)                │    │
│  └──────────────┘  └────────────────────────┘    │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│  STORAGE LAYER (PostgreSQL)                      │
│  ┌──────────┐ ┌─────────┐ ┌──────────────────┐  │
│  │ Profiles │ │ Events  │ │ Patterns /       │  │
│  │ + Identi-│ │ (norma- │ │ Resolution Logs  │  │
│  │   fiers  │ │  lized) │ │ / Analytics      │  │
│  └──────────┘ └─────────┘ └──────────────────┘  │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│  API LAYER (Next.js API Routes)                  │
│  GET /api/v1/customers, /search, /journey, etc.  │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│  FRONTEND (Next.js React)                        │
│  Dashboard │ Search │ Profile │ Timeline │ Analytics │
└──────────────────────────────────────────────────┘
```

---

## 2. System Requirements

### 2.1 Functional Technical Requirements

| ID | Requirement | Maps to PRD |
|---|---|---|
| TR-001 | System shall expose a REST API on `/api/v1/*` for all data operations. | FR-001 through FR-004 |
| TR-002 | All API endpoints shall accept and return `application/json`. | — |
| TR-003 | Event ingestion shall process events synchronously through the full pipeline (validate → normalize → deduplicate → resolve → stitch → detect) before returning a response. | FR-001, Section 10 |
| TR-004 | The database shall enforce referential integrity between profiles, identifiers, events, and patterns. | — |
| TR-005 | All timestamps stored in the database shall be UTC. | FR-005 |
| TR-006 | The frontend shall be a single-page application with client-side navigation after initial server render. | FR-027–FR-033 |
| TR-007 | All business logic (identity resolution, pattern detection, analytics) shall reside in `lib/` modules, not in API route handlers or React components. | — |

### 2.2 Non-Functional Requirements

| ID | Requirement | Category |
|---|---|---|
| TR-008 | The entire system shall deploy as a single application (monolith). | Simplicity |
| TR-009 | The codebase shall use TypeScript with strict mode enabled. | Correctness |
| TR-010 | Database queries shall use parameterized statements via Prisma — no raw string concatenation. | Security |
| TR-011 | API error responses shall use a consistent format: `{ error: { code: string, message: string, details?: object } }`. | Usability |
| TR-012 | The frontend shall render a meaningful first paint within 2 seconds on a broadband connection. | Performance |

### 2.3 Performance Requirements

| ID | Target | Scope | Notes |
|---|---|---|---|
| TR-013 | < 200ms | Single event ingestion (API response time) | Includes full pipeline processing. |
| TR-014 | < 500ms | Customer search | For up to 10,000 profiles (demo scale). |
| TR-015 | < 1s | Journey timeline load | For journeys up to 200 events. |
| TR-016 | < 2s | Analytics dashboard load | All KPIs and charts. |
| TR-017 | < 5s | Batch ingestion of 100 events | Full pipeline for each event. |

These are hackathon-scale targets measured against synthetic demo data (hundreds to low thousands of customers, tens of thousands of events). They are not production SLAs.

### 2.4 Security Requirements

| ID | Requirement |
|---|---|
| TR-018 | No raw PII in server logs or API error responses. |
| TR-019 | All database queries parameterized (Prisma enforces this). |
| TR-020 | JSON request bodies validated against schema before processing. |
| TR-021 | API rate limiting: 100 requests/second per client (to prevent accidental load during demo). |
| TR-022 | CORS configured to allow only the frontend origin. |

Full authentication and authorization are not implemented for the hackathon MVP. See Section 14 for where they would be inserted.

### 2.5 Reliability Requirements

| ID | Requirement |
|---|---|
| TR-023 | Every event entering the pipeline shall either succeed (stored in database with resolution) or fail (logged with error details). No silent drops. |
| TR-024 | Database transactions shall be used for operations that modify multiple tables (profile creation + identifier insertion + event storage). |
| TR-025 | Identity conflicts shall be explicitly recorded, never silently resolved. |
| TR-026 | Application shall recover from individual event processing failures without stopping the pipeline for subsequent events (batch mode). |

---

## 3. System Architecture

### 3.1 Component Inventory

```
┌─────────────────────────────────────────────────────────────┐
│                    NEXT.JS APPLICATION                      │
│                                                             │
│  ┌─── FRONTEND (app/) ──────────────────────────────────┐  │
│  │                                                       │  │
│  │  /dashboard        → Analytics Dashboard              │  │
│  │  /customers        → Customer List + Filtering        │  │
│  │  /customers/:id    → Customer Profile                 │  │
│  │  /customers/:id/   → Journey Timeline                 │  │
│  │     journey                                           │  │
│  │  /customers/:id/   → Identity Graph                   │  │
│  │     identity                                          │  │
│  │  /pipeline         → Pipeline Health (P2)             │  │
│  │                                                       │  │
│  │  Components:                                          │  │
│  │    SearchBar, CustomerCard, TimelineView,             │  │
│  │    EventCard, PatternBadge, KPICard,                  │  │
│  │    ChannelIcon, ConfidenceMeter, FilterPanel,         │  │
│  │    IdentityGraph, AnalyticsCharts                     │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─── API ROUTES (app/api/) ────────────────────────────┐  │
│  │                                                       │  │
│  │  POST /api/v1/events          → Single event ingest   │  │
│  │  POST /api/v1/events/batch    → Batch event ingest    │  │
│  │  GET  /api/v1/customers       → Customer list         │  │
│  │  GET  /api/v1/customers/      → Customer search       │  │
│  │       search                                          │  │
│  │  GET  /api/v1/customers/:id   → Customer profile      │  │
│  │  GET  /api/v1/customers/:id/  → Journey timeline      │  │
│  │       journey                                         │  │
│  │  GET  /api/v1/customers/:id/  → Identity evidence     │  │
│  │       identity                                        │  │
│  │  GET  /api/v1/events/:id      → Event detail          │  │
│  │  GET  /api/v1/analytics/      → Analytics summary     │  │
│  │       summary                                         │  │
│  │  GET  /api/v1/pipeline/health → Pipeline health       │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─── BUSINESS LOGIC (lib/) ────────────────────────────┐  │
│  │                                                       │  │
│  │  lib/pipeline/                                        │  │
│  │    validator.ts    → Schema validation                │  │
│  │    normalizer.ts   → Field normalization              │  │
│  │    deduplicator.ts → Composite key dedup              │  │
│  │    processor.ts    → Pipeline orchestrator            │  │
│  │                                                       │  │
│  │  lib/identity/                                        │  │
│  │    resolver.ts     → Identity resolution orchestrator │  │
│  │    deterministic.ts→ Exact matching                   │  │
│  │    probabilistic.ts→ Weighted scoring                 │  │
│  │    confidence.ts   → Confidence calculation           │  │
│  │    conflicts.ts    → Conflict detection               │  │
│  │    explainability.ts→ Evidence recording              │  │
│  │                                                       │  │
│  │  lib/journey/                                         │  │
│  │    stitcher.ts     → Event ordering + session detect  │  │
│  │    patterns.ts     → Pattern detection orchestrator   │  │
│  │    dropoff.ts      → Drop-off detection               │  │
│  │    escalation.ts   → Escalation detection             │  │
│  │    repeat.ts       → Repeat contact detection         │  │
│  │    unresolved.ts   → Unresolved issue detection       │  │
│  │    churn.ts        → Churn signal evaluation          │  │
│  │                                                       │  │
│  │  lib/analytics/                                       │  │
│  │    aggregator.ts   → KPI computation                  │  │
│  │    queries.ts      → Analytics-specific DB queries    │  │
│  │                                                       │  │
│  │  lib/shared/                                          │  │
│  │    types.ts        → Shared TypeScript types          │  │
│  │    constants.ts    → Channel tiers, thresholds, etc.  │  │
│  │    errors.ts       → Error types and formatting       │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─── DATABASE (prisma/) ───────────────────────────────┐  │
│  │                                                       │  │
│  │  schema.prisma     → Database schema                  │  │
│  │  migrations/       → Migration history                │  │
│  │  seed.ts           → Synthetic data generator         │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│                    POSTGRESQL DATABASE                       │
│                                                             │
│  Tables:                                                    │
│    customer_profiles                                        │
│    customer_identifiers                                     │
│    events                                                   │
│    resolution_logs                                          │
│    detected_patterns                                        │
│    pipeline_metrics                                         │
│    notifications                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Database Schema

```sql
-- Unified customer profiles
CREATE TABLE customer_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name    TEXT,
  first_seen_at   TIMESTAMPTZ NOT NULL,
  last_seen_at    TIMESTAMPTZ NOT NULL,
  event_count     INTEGER NOT NULL DEFAULT 0,
  channel_count   INTEGER NOT NULL DEFAULT 0,
  channels_used   TEXT[] NOT NULL DEFAULT '{}',
  churn_risk      TEXT CHECK (churn_risk IN ('high', 'medium', 'low', 'none')) DEFAULT 'none',
  has_drop_off    BOOLEAN NOT NULL DEFAULT FALSE,
  has_escalation  BOOLEAN NOT NULL DEFAULT FALSE,
  has_repeat_contact BOOLEAN NOT NULL DEFAULT FALSE,
  has_unresolved  BOOLEAN NOT NULL DEFAULT FALSE,
  avg_confidence  REAL NOT NULL DEFAULT 0.0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Identifiers linked to profiles (the identity graph edges)
CREATE TABLE customer_identifiers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  identifier_type TEXT NOT NULL CHECK (identifier_type IN (
    'email', 'phone', 'device_id', 'cookie_id', 'loyalty_id', 'name'
  )),
  identifier_value TEXT NOT NULL,
  source_channel  TEXT NOT NULL,
  confidence      REAL NOT NULL DEFAULT 1.0,
  first_seen_at   TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (identifier_type, identifier_value)
);

CREATE INDEX idx_identifiers_type_value ON customer_identifiers(identifier_type, identifier_value);
CREATE INDEX idx_identifiers_profile ON customer_identifiers(profile_id);

-- Normalized, resolved events
CREATE TABLE events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  channel         TEXT NOT NULL CHECK (channel IN (
    'web', 'mobile', 'call_center', 'email', 'chat', 'in_store'
  )),
  event_type      TEXT NOT NULL,
  event_category  TEXT NOT NULL CHECK (event_category IN (
    'browse', 'commerce', 'account', 'support', 'engagement', 'in_store'
  )),
  timestamp       TIMESTAMPTZ NOT NULL,
  session_id      TEXT,
  journey_id      TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  identifiers     JSONB NOT NULL DEFAULT '{}',
  resolution_method TEXT CHECK (resolution_method IN (
    'deterministic', 'probabilistic', 'new_profile'
  )),
  resolution_confidence REAL NOT NULL DEFAULT 0.0,
  dedup_key       TEXT NOT NULL,
  raw_data        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_profile_time ON events(profile_id, timestamp);
CREATE INDEX idx_events_channel ON events(channel);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_dedup ON events(dedup_key);
CREATE INDEX idx_events_timestamp ON events(timestamp);

-- Identity resolution audit log
CREATE TABLE resolution_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  profile_id      UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  method          TEXT NOT NULL CHECK (method IN (
    'deterministic', 'probabilistic', 'new_profile'
  )),
  confidence      REAL NOT NULL,
  evidence        JSONB NOT NULL DEFAULT '[]',
  candidates      JSONB DEFAULT '[]',
  conflict        BOOLEAN NOT NULL DEFAULT FALSE,
  conflict_details JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_resolution_profile ON resolution_logs(profile_id);
CREATE INDEX idx_resolution_event ON resolution_logs(event_id);

-- Detected patterns
CREATE TABLE detected_patterns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  pattern_type    TEXT NOT NULL CHECK (pattern_type IN (
    'drop_off', 'escalation', 'repeat_contact', 'unresolved_issue', 'churn_signal'
  )),
  event_id        UUID REFERENCES events(id) ON DELETE SET NULL,
  details         JSONB NOT NULL DEFAULT '{}',
  detected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patterns_profile ON detected_patterns(profile_id);
CREATE INDEX idx_patterns_type ON detected_patterns(pattern_type);

-- Pipeline telemetry
CREATE TABLE pipeline_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage           TEXT NOT NULL CHECK (stage IN (
    'ingested', 'validated', 'normalized', 'deduplicated',
    'resolved', 'stitched', 'patterns_detected', 'error'
  )),
  channel         TEXT,
  count           INTEGER NOT NULL DEFAULT 1,
  error_message   TEXT,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_metrics_stage ON pipeline_metrics(stage);
CREATE INDEX idx_metrics_time ON pipeline_metrics(recorded_at);

-- In-app notifications
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL,
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  profile_id      UUID REFERENCES customer_profiles(id) ON DELETE SET NULL,
  read            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_read ON notifications(read, created_at);
```

### 3.3 Component Interactions

**Event Ingestion Flow (synchronous, within a single API request):**

1. API route receives POST request → passes raw event to `lib/pipeline/processor.ts`.
2. `processor.ts` orchestrates: `validator.validate(raw)` → `normalizer.normalize(validated)` → `deduplicator.check(normalized)` → `resolver.resolve(normalized)` → `stitcher.stitch(resolved)` → `patterns.detect(profile)`.
3. Each step returns a result or throws a typed error.
4. On success: event stored, profile updated, patterns stored, pipeline metric recorded.
5. On failure: error logged, pipeline error metric recorded, error returned to caller.
6. API route returns `202 Accepted` (success) or `400 Bad Request` (validation failure).

**Frontend Data Flow:**

1. User navigates to a page → Next.js server component fetches data from API routes (same process, no network hop).
2. Interactive operations (search, filter changes) use client-side `fetch()` to API routes.
3. State management via React context and URL search parameters (see Section 4).

---

## 4. Frontend Requirements

### 4.1 Framework

**Next.js 14+ with App Router and TypeScript.**

- Server Components for initial page loads (dashboard, customer list, profile, timeline).
- Client Components for interactive elements (search, filters, expandable event cards, chart interactions).
- No separate frontend build — the frontend is part of the Next.js application.

### 4.2 State Management

| State Type | Mechanism | Rationale |
|---|---|---|
| **Server data** | React Server Components + `fetch()` in server components | Data fetched at render time, no client state needed for initial load. |
| **Client cache** | SWR (stale-while-revalidate) or TanStack Query | Client-side data fetching for search results, filter changes, pagination. Caching avoids redundant API calls. |
| **URL state** | `useSearchParams` / URL query parameters | Filters, search queries, pagination — persisted in URL so the user can share or bookmark a filtered view. |
| **UI state** | React `useState` / `useReducer` | Expanded/collapsed event cards, active tab, modal open/close. Component-local, not global. |

No global state management library (Redux, Zustand) is needed. The application is read-heavy with minimal cross-component state coordination.

### 4.3 API Integration

All frontend-to-backend communication uses `fetch()` to internal API routes (`/api/v1/*`).

**Patterns:**

- **Server Components:** Call API routes directly via `fetch()` during server-side rendering.
- **Client Components:** Use SWR hooks wrapping `fetch()` for data that changes based on user interaction (search, filter, pagination).
- **Mutations (rare — only event ingestion for demo):** Direct `fetch()` with `POST` method.

**Shared Types:** API request and response types are defined in `lib/shared/types.ts` and imported by both API routes and frontend components. No type drift.

### 4.4 Authentication

None for hackathon MVP. All routes and API endpoints are publicly accessible. See Section 14 for where auth middleware would be inserted in a production version.

### 4.5 Routing

| Route | Page | Type | Purpose |
|---|---|---|---|
| `/` | Redirect to `/dashboard` | Server | — |
| `/dashboard` | Analytics Dashboard | Server + Client | KPI cards, charts, date filter. |
| `/customers` | Customer List | Server + Client | Paginated list with filter sidebar. |
| `/customers/[id]` | Customer Profile | Server | Profile summary, pattern badges, navigation to timeline/identity. |
| `/customers/[id]/journey` | Journey Timeline | Server + Client | Vertical timeline with channel filtering and expandable events. |
| `/customers/[id]/identity` | Identity Graph | Server + Client | Linked identifiers, resolution evidence. |
| `/pipeline` | Pipeline Health (P2) | Server | Pipeline stage counters, error log. |

### 4.6 Error Handling

| Error Type | Frontend Behavior |
|---|---|
| API returns 400 | Display validation error message in context (e.g., search yields no results → "No customers found"). |
| API returns 404 | Display "not found" message with navigation back. |
| API returns 500 | Display generic error message: "Something went wrong. Please try again." Log error to console. |
| Network failure | Display "Unable to connect. Check your connection." |
| Page-level error | Next.js `error.tsx` boundary catches and displays recovery UI. |

### 4.7 Loading States

| Context | Loading Indicator |
|---|---|
| Initial page load | Skeleton screens matching the page layout (skeleton cards, skeleton timeline). |
| Search | Spinner in search bar. Results dropdown shows "Searching..." |
| Filter change | Skeleton overlay on the filtered area. Previous data remains visible until new data arrives. |
| Event card expansion | Inline spinner in the card while fetching full event detail. |
| Chart rendering | Skeleton rectangles matching chart dimensions. |

### 4.8 Visualization Components

| Component | Purpose | Implementation |
|---|---|---|
| `TimelineView` | Vertical chronological event timeline | Custom React component. CSS-based vertical timeline with channel-colored left border. Session/journey boundaries as horizontal dividers. Pattern annotations as badges. |
| `EventCard` | Individual event in the timeline | Expandable card showing summary (collapsed) and full metadata (expanded). Channel icon + color. |
| `PatternBadge` | Drop-off, escalation, repeat contact, churn signal indicators | Color-coded badges with icon: red (drop-off), orange (escalation), yellow (repeat contact), purple (churn risk). |
| `ConfidenceMeter` | Identity resolution confidence display | Segmented progress bar: green (high), yellow (medium), red (low). Numeric value displayed. |
| `IdentityGraph` | Linked identifiers visualization | Simple node-link diagram. Profile at center, identifier nodes around it. Edges labeled with match method and confidence. CSS/SVG — no heavy graph library needed for the demo. |
| `ChannelIcon` | Channel identifier in timeline and cards | Icon set: Globe (web), Smartphone (mobile), Phone (call center), Mail (email), MessageSquare (chat), MapPin (in-store). From Lucide icons (bundled with shadcn/ui). |
| `KPICard` | Analytics metric display | Card with large number, label, and optional trend indicator. |
| `AnalyticsCharts` | Bar chart, pie chart, histogram, heatmap | Recharts components. Responsive. Consistent color scheme. |
| `FilterPanel` | Filter sidebar for customer list | Checkbox groups, date range picker, slider. Updates URL search params on change. |

### 4.9 Design Tokens

Channel colors (used consistently across timeline, charts, and badges):

| Channel | Color | Hex |
|---|---|---|
| Web | Blue | `#3B82F6` |
| Mobile | Purple | `#8B5CF6` |
| Call Center | Green | `#10B981` |
| Email | Amber | `#F59E0B` |
| Chat | Teal | `#14B8A6` |
| In-Store | Rose | `#F43F5E` |

Pattern colors:

| Pattern | Color | Hex |
|---|---|---|
| Drop-off | Red | `#EF4444` |
| Escalation | Orange | `#F97316` |
| Repeat Contact | Yellow | `#EAB308` |
| Unresolved Issue | Indigo | `#6366F1` |
| Churn Risk | Rose | `#E11D48` |

Dark mode support via Tailwind's `dark:` variant and CSS custom properties.

---

## 5. Backend Requirements

### 5.1 API Framework

**Next.js API Routes** (App Router, Route Handlers).

Each route is a file in `app/api/v1/` exporting HTTP method handlers:

```
app/api/v1/
  events/
    route.ts          → POST (single event ingestion)
    batch/
      route.ts        → POST (batch ingestion)
  customers/
    route.ts          → GET (customer list with filters)
    search/
      route.ts        → GET (customer search)
    [id]/
      route.ts        → GET (customer profile)
      journey/
        route.ts      → GET (journey timeline)
      identity/
        route.ts      → GET (identity evidence)
  events/
    [id]/
      route.ts        → GET (event detail)
  analytics/
    summary/
      route.ts        → GET (analytics summary)
  pipeline/
    health/
      route.ts        → GET (pipeline health)
```

### 5.2 Service Architecture

API routes are thin — they parse requests, call service functions, and format responses. Business logic lives in `lib/` services:

| Service Module | Responsibility |
|---|---|
| `lib/pipeline/processor.ts` | Orchestrates the full event processing pipeline. Entry point for event ingestion. |
| `lib/pipeline/validator.ts` | Validates raw event against schema. Returns validated event or validation errors. |
| `lib/pipeline/normalizer.ts` | Normalizes timestamps, identifiers, event types. |
| `lib/pipeline/deduplicator.ts` | Checks composite dedup key against recent events. |
| `lib/identity/resolver.ts` | Orchestrates identity resolution (deterministic → probabilistic → create/update). |
| `lib/identity/deterministic.ts` | Exact-match queries on strong identifiers. |
| `lib/identity/probabilistic.ts` | Weighted scoring on weak signals. |
| `lib/identity/confidence.ts` | Computes and categorizes confidence scores. |
| `lib/identity/conflicts.ts` | Detects and records multi-profile matches. |
| `lib/identity/explainability.ts` | Builds resolution evidence records. |
| `lib/journey/stitcher.ts` | Inserts event into customer timeline, detects session/journey boundaries. |
| `lib/journey/patterns.ts` | Orchestrates all pattern detectors. |
| `lib/journey/dropoff.ts` | Drop-off detection logic. |
| `lib/journey/escalation.ts` | Escalation detection logic. |
| `lib/journey/repeat.ts` | Repeat contact detection logic. |
| `lib/journey/unresolved.ts` | Unresolved issue detection logic. |
| `lib/journey/churn.ts` | Churn signal evaluation. |
| `lib/analytics/aggregator.ts` | Computes KPIs and chart data from stored data. |
| `lib/analytics/queries.ts` | Database queries for analytics (counts, distributions, rates). |

### 5.3 Validation

**Input validation** is performed at two levels:

1. **Schema validation** (`validator.ts`): Checks that the raw event JSON has the required structure and field types. Uses Zod for runtime type checking (Zod schemas mirror the TypeScript types in `lib/shared/types.ts`).
2. **Business rule validation** (`validator.ts`): Checks that channel values are from the supported set, event types are recognized (or mapped to `unknown`), and at least one identifier is present.

**Zod schema for raw event input:**

```typescript
const RawEventSchema = z.object({
  channel: z.enum(['web', 'mobile', 'call_center', 'email', 'chat', 'in_store']),
  event_type: z.string().min(1).max(100),
  timestamp: z.string().min(1),  // validated as parseable datetime in normalizer
  identifiers: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    device_id: z.string().optional(),
    cookie_id: z.string().optional(),
    loyalty_id: z.string().optional(),
    name: z.string().optional(),
  }).refine(obj => Object.values(obj).some(v => v !== undefined && v !== null && v !== ''), {
    message: 'At least one identifier is required',
  }),
  metadata: z.record(z.unknown()).optional(),
});
```

### 5.4 Error Handling

All errors are typed and follow a consistent structure:

```typescript
class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
  }
}

// Usage:
throw new AppError('VALIDATION_ERROR', 400, 'Invalid event', { fields: [...] });
throw new AppError('NOT_FOUND', 404, 'Customer not found');
throw new AppError('CONFLICT', 409, 'Identity conflict detected', { profiles: [...] });
```

API routes catch `AppError` and return structured JSON:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid event",
    "details": { "fields": ["timestamp: invalid format"] }
  }
}
```

Unhandled errors return `500` with a generic message (no stack trace or internal details).

### 5.5 Logging

Structured JSON logging using `console.log` with a lightweight wrapper that adds:

- `timestamp` (ISO 8601)
- `level` (info, warn, error)
- `module` (pipeline, identity, journey, analytics)
- `event_id` (when processing an event)
- `profile_id` (when relevant)
- `message`
- `data` (additional context, PII-free)

No external logging service for the hackathon. Logs go to stdout (visible in deployment platform logs).

**PII filtering:** The logger never logs raw email, phone, or name values. It logs identifier types and hashed values only.

### 5.6 Database Access

All database access goes through Prisma Client. No raw SQL strings.

**Connection management:** Prisma Client is instantiated once (singleton pattern in `lib/db.ts`) and reused across requests. In development, the singleton prevents connection exhaustion from hot reloading.

```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

---

## 6. Event Ingestion

### 6.1 Event Schema

**Raw input event (what the API accepts):**

```typescript
interface RawEvent {
  channel: 'web' | 'mobile' | 'call_center' | 'email' | 'chat' | 'in_store';
  event_type: string;
  timestamp: string;  // any parseable datetime string
  identifiers: {
    email?: string;
    phone?: string;
    device_id?: string;
    cookie_id?: string;
    loyalty_id?: string;
    name?: string;
  };
  metadata?: Record<string, unknown>;
}
```

**Normalized event (internal, after normalization):**

```typescript
interface NormalizedEvent {
  event_id: string;      // UUID, assigned during normalization
  channel: Channel;
  event_type: string;    // mapped to canonical taxonomy
  event_category: EventCategory;
  timestamp: Date;       // parsed, UTC
  identifiers: {
    email: string | null;     // lowercased, trimmed
    phone: string | null;     // digits only
    device_id: string | null;
    cookie_id: string | null;
    loyalty_id: string | null; // lowercased
    name: string | null;       // trimmed
  };
  metadata: Record<string, unknown>;
  dedup_key: string;     // composite key for deduplication
  raw: RawEvent;         // original input preserved
}
```

### 6.2 Ingestion Endpoints

**Single event:**

```
POST /api/v1/events
Content-Type: application/json

Body: RawEvent

Response 202:
{
  "event_id": "uuid",
  "profile_id": "uuid",
  "resolution": {
    "method": "deterministic",
    "confidence": 1.0
  }
}

Response 400:
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Event validation failed",
    "details": { "fields": ["identifiers: at least one identifier required"] }
  }
}
```

**Batch:**

```
POST /api/v1/events/batch
Content-Type: application/json

Body: { "events": RawEvent[] }  // max 100

Response 202:
{
  "processed": 98,
  "failed": 2,
  "results": [
    { "index": 0, "event_id": "uuid", "status": "success" },
    { "index": 5, "event_id": null, "status": "error", "error": "..." },
    ...
  ]
}
```

Batch processing is sequential (not parallel) to maintain deterministic identity resolution order. Each event in the batch sees the profile state from all preceding events.

### 6.3 Validation Rules

| Field | Rule | Error |
|---|---|---|
| `channel` | Must be one of the 6 supported channels | "Invalid channel: {value}" |
| `event_type` | Non-empty string, max 100 chars | "event_type is required" |
| `timestamp` | Must be parseable as a datetime | "Invalid timestamp format" |
| `identifiers` | At least one non-empty identifier | "At least one identifier is required" |
| `identifiers.email` | If present, must be valid email format | "Invalid email format" |
| `metadata` | If present, must be an object | "metadata must be an object" |
| Overall | JSON body must be valid JSON | "Invalid JSON" |
| Overall | Content-Type must be application/json | "Content-Type must be application/json" |

### 6.4 Deduplication

**Composite key generation:**

```typescript
function generateDedupKey(event: NormalizedEvent): string {
  const primaryIdentifier =
    event.identifiers.email ||
    event.identifiers.phone ||
    event.identifiers.loyalty_id ||
    event.identifiers.device_id ||
    event.identifiers.cookie_id ||
    '';

  const components = [
    event.channel,
    event.event_type,
    event.timestamp.toISOString().substring(0, 16), // minute precision
    primaryIdentifier,
  ];

  return createHash('sha256').update(components.join('|')).digest('hex');
}
```

**Dedup check:** Query the `events` table for a matching `dedup_key` where `created_at` is within the last 5 minutes (configurable). If found, the event is a duplicate — log it, increment the pipeline duplicate counter, and skip downstream processing.

**Why minute-precision timestamp in the key:** Events that arrive with timestamps different by seconds but otherwise identical are likely the same event with clock skew. Minute precision catches these without being so coarse that it suppresses distinct events.

### 6.5 Idempotency

The deduplication mechanism provides idempotency for event ingestion. Submitting the same event multiple times within the 5-minute window returns `202 Accepted` on the first submission and logs a duplicate on subsequent submissions. The response on a duplicate includes a flag:

```json
{
  "event_id": "existing-event-uuid",
  "duplicate": true
}
```

### 6.6 Timestamp Handling

**Parsing:** The `normalizer.ts` attempts to parse the raw timestamp string using `new Date(string)`. If parsing fails (result is `Invalid Date`), the event is rejected.

**Normalization:** All parsed timestamps are stored in UTC. If the input timestamp includes a timezone offset, it is converted to UTC. If no timezone information is present, the timestamp is assumed to be UTC.

**Late events:** Events with timestamps in the past are accepted and inserted into the correct chronological position in the customer's timeline. The stitcher handles out-of-order insertion (see Section 8). There is no "late event window" — all valid timestamps are accepted.

**Future events:** Events with timestamps more than 1 hour in the future are rejected (likely a clock error).

### 6.7 Invalid Events

Invalid events receive a `400` response with specific error details. They are also recorded in the `pipeline_metrics` table with `stage = 'error'` and the error message, so the pipeline health dashboard can display ingestion failures.

Invalid events are never partially processed. If validation fails, no database writes occur for that event.

---

## 7. Identity Resolution Engine

### 7.1 Overview

The identity resolution engine is the technical core of JourneyX. It answers: given a normalized event with one or more identifiers, which existing customer profile (if any) does this event belong to?

The engine uses a two-phase approach:

1. **Deterministic matching:** Exact match on strong identifiers (email, phone, loyalty_id). Fast, high confidence, no ambiguity.
2. **Probabilistic matching:** Weighted scoring on weaker signals (device_id, cookie_id, name similarity, temporal proximity). Slower, variable confidence, requires a threshold.

If neither phase produces a match above the confidence threshold, a new customer profile is created.

### 7.2 Input Signals

| Signal | Source | Strength | Used In |
|---|---|---|---|
| Email | `identifiers.email` | Strong | Deterministic |
| Phone | `identifiers.phone` | Strong | Deterministic |
| Loyalty ID | `identifiers.loyalty_id` | Strong | Deterministic |
| Device ID | `identifiers.device_id` | Medium | Probabilistic |
| Cookie ID | `identifiers.cookie_id` | Weak | Probabilistic |
| Name | `identifiers.name` | Weak | Probabilistic |
| Timestamp | `timestamp` | Contextual | Probabilistic (temporal proximity) |
| Channel | `channel` | Contextual | Probabilistic (channel transition pattern) |

### 7.3 Processing Pipeline

```
Incoming Normalized Event
  │
  ▼
┌──────────────────────────────────────────────────┐
│ STEP 1: Extract Identifiers                      │
│                                                  │
│ From the event, collect all non-null identifiers.│
│ Categorize as strong (email, phone, loyalty_id)  │
│ or weak (device_id, cookie_id, name).            │
│                                                  │
│ Output: strong_ids[], weak_ids[]                 │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│ STEP 2: Deterministic Matching                   │
│                                                  │
│ For each strong identifier:                      │
│   Query customer_identifiers table:              │
│     SELECT profile_id                            │
│     FROM customer_identifiers                    │
│     WHERE identifier_type = :type                │
│       AND identifier_value = :value              │
│                                                  │
│ Collect all matching profile IDs.                │
│                                                  │
│ Cases:                                           │
│   0 matches → go to STEP 3 (probabilistic)      │
│   1 unique profile → MATCH (confidence = 1.0)   │
│   2+ different profiles → CONFLICT (step 5)     │
└──────────────────────┬───────────────────────────┘
                       │
          ┌────────────┼────────────┐
          │ 0 matches  │ 1 match   │ 2+ matches
          ▼            ▼            ▼
      STEP 3       STEP 4       STEP 5
                                (conflict)
┌──────────────────────────────────────────────────┐
│ STEP 3: Probabilistic Matching                   │
│ (only if deterministic found 0 matches)          │
│                                                  │
│ For each weak identifier on the event:           │
│   Query customer_identifiers for matching        │
│   profiles. Score each candidate profile.        │
│                                                  │
│ Scoring per candidate profile:                   │
│                                                  │
│   score = 0.0                                    │
│   max_possible = 0.0                             │
│                                                  │
│   If device_id matches:                          │
│     score += 0.60                                │
│     max_possible += 0.60                         │
│   Else if event has device_id:                   │
│     max_possible += 0.60                         │
│                                                  │
│   If cookie_id matches:                          │
│     score += 0.30                                │
│     max_possible += 0.30                         │
│   Else if event has cookie_id:                   │
│     max_possible += 0.30                         │
│                                                  │
│   If name similar (Jaro-Winkler ≥ 0.85):        │
│     similarity = jaro_winkler(event.name,        │
│                               profile.name)      │
│     score += 0.20 * similarity                   │
│     max_possible += 0.20                         │
│   Else if event has name:                        │
│     max_possible += 0.20                         │
│                                                  │
│   If temporal proximity (event within 2h of      │
│   profile's last event, different channel):      │
│     score += 0.10                                │
│     max_possible += 0.10                         │
│   Else:                                          │
│     max_possible += 0.10                         │
│                                                  │
│   confidence = score / max_possible              │
│     (normalized to 0.0–1.0)                      │
│                                                  │
│ Select candidate with highest confidence.        │
│                                                  │
│ If highest confidence ≥ 0.70 → MATCH            │
│ If highest confidence < 0.70 → NEW PROFILE      │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────┐
│ STEP 4: Profile Update                           │
│                                                  │
│ If MATCH (deterministic or probabilistic):       │
│   - Link event to existing profile               │
│   - For each identifier on the event that is     │
│     NOT already on the profile:                  │
│     → Add it to customer_identifiers             │
│       (identifier expansion)                     │
│   - Update profile: last_seen_at, event_count,   │
│     channels_used, channel_count                 │
│                                                  │
│ If NEW PROFILE:                                  │
│   - Create new customer_profiles row             │
│   - Insert all event identifiers into            │
│     customer_identifiers                         │
│   - Link event to new profile                    │
│                                                  │
│ In both cases:                                   │
│   - Write resolution_logs entry                  │
│   - Record pipeline metric                       │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│ STEP 5: Conflict Resolution                      │
│ (deterministic matched 2+ different profiles)    │
│                                                  │
│ This means the event has identifiers that each   │
│ match different existing profiles. Example:      │
│   Event has email → Profile A                    │
│   Event has phone → Profile B                    │
│                                                  │
│ MVP behavior:                                    │
│   1. Select the profile with the most events     │
│      (most established profile).                 │
│   2. Link the event to that profile.             │
│   3. Record a conflict in resolution_logs with:  │
│      - conflict: true                            │
│      - conflict_details: both profile IDs,       │
│        which identifiers matched each,           │
│        event counts for each profile             │
│   4. Flag both profiles for analyst review       │
│      (set a flag on customer_profiles or         │
│       create a notification).                    │
│   5. DO NOT auto-merge the profiles.             │
│                                                  │
│ Confidence for conflict resolution = 0.75        │
│ (lower than deterministic to reflect             │
│  uncertainty from the conflict).                 │
└──────────────────────────────────────────────────┘
```

### 7.4 Deterministic Matching Implementation

```typescript
interface DeterministicResult {
  matched: boolean;
  profiles: { profileId: string; matchedField: string; matchedValue: string }[];
  uniqueProfiles: string[];
}

async function findDeterministicMatches(
  identifiers: NormalizedIdentifiers
): Promise<DeterministicResult> {
  const strongFields = [
    { type: 'email', value: identifiers.email },
    { type: 'phone', value: identifiers.phone },
    { type: 'loyalty_id', value: identifiers.loyalty_id },
  ].filter(f => f.value !== null);

  if (strongFields.length === 0) {
    return { matched: false, profiles: [], uniqueProfiles: [] };
  }

  const matches = await prisma.customerIdentifier.findMany({
    where: {
      OR: strongFields.map(f => ({
        identifier_type: f.type,
        identifier_value: f.value!,
      })),
    },
    select: {
      profile_id: true,
      identifier_type: true,
      identifier_value: true,
    },
  });

  const uniqueProfiles = [...new Set(matches.map(m => m.profile_id))];

  return {
    matched: matches.length > 0,
    profiles: matches.map(m => ({
      profileId: m.profile_id,
      matchedField: m.identifier_type,
      matchedValue: m.identifier_value,
    })),
    uniqueProfiles,
  };
}
```

### 7.5 Probabilistic Matching Implementation

```typescript
interface ProbabilisticCandidate {
  profileId: string;
  score: number;
  maxPossible: number;
  confidence: number;
  evidence: SignalEvidence[];
}

interface SignalEvidence {
  signal: string;
  weight: number;
  matched: boolean;
  score: number;
  detail: string;
}

const SIGNAL_WEIGHTS = {
  device_id: 0.60,
  cookie_id: 0.30,
  name: 0.20,
  temporal_proximity: 0.10,
} as const;

const CONFIDENCE_THRESHOLD = 0.70;

async function findProbabilisticMatches(
  event: NormalizedEvent
): Promise<ProbabilisticCandidate[]> {
  // Collect candidate profiles from weak identifier matches
  const weakQueries = [
    event.identifiers.device_id
      ? { type: 'device_id', value: event.identifiers.device_id }
      : null,
    event.identifiers.cookie_id
      ? { type: 'cookie_id', value: event.identifiers.cookie_id }
      : null,
  ].filter(Boolean);

  if (weakQueries.length === 0 && !event.identifiers.name) {
    return []; // no weak signals to match on
  }

  // Find profiles that share any weak identifier
  const identifierMatches = weakQueries.length > 0
    ? await prisma.customerIdentifier.findMany({
        where: {
          OR: weakQueries.map(q => ({
            identifier_type: q!.type,
            identifier_value: q!.value,
          })),
        },
        include: { profile: true },
      })
    : [];

  // Also find profiles with similar names if name is provided
  // (Simplified: exact prefix match for MVP, Jaro-Winkler for stretch goal)
  let nameMatches: typeof identifierMatches = [];
  if (event.identifiers.name) {
    nameMatches = await prisma.customerIdentifier.findMany({
      where: {
        identifier_type: 'name',
        identifier_value: {
          startsWith: event.identifiers.name.substring(0, 3),
          mode: 'insensitive',
        },
      },
      include: { profile: true },
    });
  }

  // Build unique candidate set
  const candidateProfileIds = new Set([
    ...identifierMatches.map(m => m.profile_id),
    ...nameMatches.map(m => m.profile_id),
  ]);

  // Score each candidate
  const candidates: ProbabilisticCandidate[] = [];

  for (const profileId of candidateProfileIds) {
    const profileIdentifiers = await prisma.customerIdentifier.findMany({
      where: { profile_id: profileId },
    });
    const profileLastEvent = await prisma.event.findFirst({
      where: { profile_id: profileId },
      orderBy: { timestamp: 'desc' },
    });

    const evidence: SignalEvidence[] = [];
    let score = 0;
    let maxPossible = 0;

    // Device ID
    if (event.identifiers.device_id) {
      maxPossible += SIGNAL_WEIGHTS.device_id;
      const deviceMatch = profileIdentifiers.some(
        i => i.identifier_type === 'device_id'
          && i.identifier_value === event.identifiers.device_id
      );
      if (deviceMatch) {
        score += SIGNAL_WEIGHTS.device_id;
      }
      evidence.push({
        signal: 'device_id',
        weight: SIGNAL_WEIGHTS.device_id,
        matched: deviceMatch,
        score: deviceMatch ? SIGNAL_WEIGHTS.device_id : 0,
        detail: deviceMatch ? 'Exact device ID match' : 'No device ID match',
      });
    }

    // Cookie ID
    if (event.identifiers.cookie_id) {
      maxPossible += SIGNAL_WEIGHTS.cookie_id;
      const cookieMatch = profileIdentifiers.some(
        i => i.identifier_type === 'cookie_id'
          && i.identifier_value === event.identifiers.cookie_id
      );
      if (cookieMatch) {
        score += SIGNAL_WEIGHTS.cookie_id;
      }
      evidence.push({
        signal: 'cookie_id',
        weight: SIGNAL_WEIGHTS.cookie_id,
        matched: cookieMatch,
        score: cookieMatch ? SIGNAL_WEIGHTS.cookie_id : 0,
        detail: cookieMatch ? 'Exact cookie ID match' : 'No cookie ID match',
      });
    }

    // Name similarity
    if (event.identifiers.name) {
      maxPossible += SIGNAL_WEIGHTS.name;
      const profileName = profileIdentifiers.find(
        i => i.identifier_type === 'name'
      );
      if (profileName) {
        const similarity = jaroWinkler(
          event.identifiers.name.toLowerCase(),
          profileName.identifier_value.toLowerCase()
        );
        if (similarity >= 0.85) {
          score += SIGNAL_WEIGHTS.name * similarity;
          evidence.push({
            signal: 'name',
            weight: SIGNAL_WEIGHTS.name,
            matched: true,
            score: SIGNAL_WEIGHTS.name * similarity,
            detail: `Name similarity: ${(similarity * 100).toFixed(0)}%`,
          });
        } else {
          evidence.push({
            signal: 'name',
            weight: SIGNAL_WEIGHTS.name,
            matched: false,
            score: 0,
            detail: `Name similarity too low: ${(similarity * 100).toFixed(0)}%`,
          });
        }
      }
    }

    // Temporal proximity
    if (profileLastEvent) {
      maxPossible += SIGNAL_WEIGHTS.temporal_proximity;
      const timeDiff = Math.abs(
        event.timestamp.getTime() - profileLastEvent.timestamp.getTime()
      );
      const twoHoursMs = 2 * 60 * 60 * 1000;
      const isProximate = timeDiff <= twoHoursMs
        && profileLastEvent.channel !== event.channel;
      if (isProximate) {
        score += SIGNAL_WEIGHTS.temporal_proximity;
      }
      evidence.push({
        signal: 'temporal_proximity',
        weight: SIGNAL_WEIGHTS.temporal_proximity,
        matched: isProximate,
        score: isProximate ? SIGNAL_WEIGHTS.temporal_proximity : 0,
        detail: isProximate
          ? `Events within ${Math.round(timeDiff / 60000)} minutes, different channels`
          : 'Not temporally proximate',
      });
    }

    const confidence = maxPossible > 0 ? score / maxPossible : 0;

    candidates.push({
      profileId,
      score,
      maxPossible,
      confidence,
      evidence,
    });
  }

  return candidates.sort((a, b) => b.confidence - a.confidence);
}
```

### 7.6 Confidence Calculation

Deterministic match: `confidence = 1.0` (always).

Probabilistic match: `confidence = score / max_possible`, where:

- `score` = sum of weights for signals that matched.
- `max_possible` = sum of weights for signals that were present on the event (whether they matched or not).

This normalization ensures that an event with only `device_id` (and no other weak signals) that matches gets `0.6 / 0.6 = 1.0`, not `0.6 / 1.2 = 0.5`. The confidence reflects "of the signals we could check, how many matched?" — not "of all possible signals, how many matched?"

Conflict resolution: `confidence = 0.75` (fixed, to indicate uncertainty).

New profile: `confidence = 0.0` (no match found).

### 7.7 Name Similarity: Jaro-Winkler

The Jaro-Winkler distance algorithm is used for name comparison. It is a standard string similarity metric with these properties:

- Returns a value between 0.0 (completely different) and 1.0 (identical).
- Gives higher scores to strings that match from the beginning (prefix bonus) — useful for names where first name variations ("Bob" vs. "Robert") differ but last names match.
- Computationally inexpensive (no ML model needed).
- Well-understood behavior — no black box.

**Threshold:** A Jaro-Winkler score ≥ 0.85 is considered a name match. This is conservative — it catches "John Smith" vs. "John Smith" (1.0) and "Jon Smith" vs. "John Smith" (~0.93) but rejects "Jane Smith" vs. "John Smith" (~0.78).

**Implementation:** Use the `jaro-winkler` npm package or implement the algorithm directly (it is ~30 lines of code).

### 7.8 Identity Conflict Handling

A conflict occurs when an event's strong identifiers match two or more different profiles:

```
Event: { email: "a@b.com", phone: "555-1234" }
  email → Profile A
  phone → Profile B
```

**MVP behavior:**

1. Query both profiles for event counts.
2. Link the event to the profile with more events (the more established identity).
3. Record a `resolution_log` entry with `conflict: true` and `conflict_details` containing both profile IDs, the matching identifiers, and event counts.
4. Create a `notification` entry: "Identity conflict detected between profiles {A} and {B}."
5. Do NOT merge Profile A and Profile B. The analyst must decide whether these are truly the same customer or whether a shared phone number is coincidental (e.g., household phone).

**Why not auto-merge:** In real-world data, identity conflicts can be genuine (two family members sharing a phone) or errors (data entry mistakes). Auto-merging could combine two different customers into one, corrupting all downstream analysis. The cost of a false merge is higher than the cost of leaving a conflict for review.

### 7.9 Identifier Expansion

When an event is resolved to an existing profile and the event carries identifiers that the profile does not yet have, those identifiers are added to the profile:

```
Before: Profile has email="a@b.com"
Event:  { email: "a@b.com", phone: "555-1234" }
After:  Profile has email="a@b.com", phone="555-1234"
```

This is critical for cross-channel resolution. A customer may first appear on the web with only a cookie_id. When they log in, their email becomes associated. When they call support, their phone is linked through the email match. Each interaction expands the profile's identifier set, making future matching more likely.

**Implementation:** After resolving the event to a profile, iterate over the event's non-null identifiers. For each, check if a `customer_identifiers` row already exists for that `(type, value)` pair. If not, insert it with `profile_id = matched profile`, `source_channel = event.channel`, `confidence = resolution confidence`.

### 7.10 Explainability

Every identity resolution produces an evidence record stored in `resolution_logs`:

```json
{
  "event_id": "evt_abc",
  "profile_id": "cust_123",
  "method": "deterministic",
  "confidence": 1.0,
  "evidence": [
    {
      "field": "email",
      "match_type": "exact",
      "contributing_weight": null,
      "detail": "Exact email match on existing profile"
    }
  ],
  "candidates": [],
  "conflict": false,
  "conflict_details": null
}
```

For probabilistic matches, the evidence includes all scored signals:

```json
{
  "event_id": "evt_def",
  "profile_id": "cust_456",
  "method": "probabilistic",
  "confidence": 0.82,
  "evidence": [
    {
      "field": "device_id",
      "match_type": "exact",
      "contributing_weight": 0.60,
      "detail": "Exact device ID match"
    },
    {
      "field": "name",
      "match_type": "fuzzy",
      "contributing_weight": 0.18,
      "detail": "Name similarity: 92% (Jaro-Winkler)"
    },
    {
      "field": "cookie_id",
      "match_type": "none",
      "contributing_weight": 0,
      "detail": "No cookie ID match"
    }
  ],
  "candidates": [
    { "profile_id": "cust_456", "confidence": 0.82 },
    { "profile_id": "cust_789", "confidence": 0.35 }
  ],
  "conflict": false
}
```

This evidence is served by `GET /api/v1/customers/:id/identity` and displayed in the Identity Explainability view.

---

## 8. Event Stitching Engine

### 8.1 Purpose

After identity resolution links an event to a customer profile, the stitching engine inserts the event into the customer's chronological timeline and detects session/journey boundaries. Stitching transforms a bag of resolved events into an ordered, structured journey.

### 8.2 Chronological Ordering

Events are stored in the `events` table with a `timestamp` column and a `profile_id` foreign key. The timeline is reconstructed by querying:

```sql
SELECT * FROM events
WHERE profile_id = :id
ORDER BY timestamp ASC;
```

**Out-of-order insertion:** Events may arrive out of chronological order (e.g., a call center event from yesterday arrives after a web event from today). The stitching engine does not maintain a separate ordering structure — it relies on the database `ORDER BY timestamp`. Inserting a late event is simply an `INSERT` into the `events` table; the `ORDER BY` handles placement.

### 8.3 Sessionization

A **session** is a sequence of events from the same channel with no gap longer than 30 minutes.

**Implementation:** Sessions are not stored as separate entities. They are computed on the fly when the journey timeline is queried:

```typescript
function assignSessions(events: Event[]): EventWithSession[] {
  const SESSION_GAP_MS = 30 * 60 * 1000; // 30 minutes
  let sessionCounter = 0;
  let currentChannel: string | null = null;
  let lastTimestamp: Date | null = null;

  return events.map(event => {
    const channelChanged = event.channel !== currentChannel;
    const gapExceeded = lastTimestamp
      && (event.timestamp.getTime() - lastTimestamp.getTime()) > SESSION_GAP_MS;

    if (channelChanged || gapExceeded) {
      sessionCounter++;
      currentChannel = event.channel;
    }

    lastTimestamp = event.timestamp;

    return { ...event, sessionIndex: sessionCounter };
  });
}
```

**Why compute on the fly:** Session boundaries depend on the complete timeline. If a late event arrives between two existing events, it could split or merge sessions. Re-computing on query avoids stale session data.

### 8.4 Journey Boundaries

A **journey** is a sequence of events across all channels with no cross-channel gap longer than 24 hours.

```typescript
function assignJourneys(events: Event[]): EventWithJourney[] {
  const JOURNEY_GAP_MS = 24 * 60 * 60 * 1000; // 24 hours
  let journeyCounter = 0;
  let lastTimestamp: Date | null = null;

  return events.map(event => {
    const gapExceeded = lastTimestamp
      && (event.timestamp.getTime() - lastTimestamp.getTime()) > JOURNEY_GAP_MS;

    if (gapExceeded || lastTimestamp === null) {
      journeyCounter++;
    }

    lastTimestamp = event.timestamp;

    return { ...event, journeyIndex: journeyCounter };
  });
}
```

### 8.5 Cross-Channel Transition Detection

A channel transition occurs when consecutive events in the timeline are from different channels. These transitions are significant — they indicate the customer moved from one channel to another.

```typescript
interface Transition {
  fromEvent: Event;
  toEvent: Event;
  fromChannel: string;
  toChannel: string;
  timeBetweenMs: number;
}

function detectTransitions(events: Event[]): Transition[] {
  const transitions: Transition[] = [];
  for (let i = 1; i < events.length; i++) {
    if (events[i].channel !== events[i - 1].channel) {
      transitions.push({
        fromEvent: events[i - 1],
        toEvent: events[i],
        fromChannel: events[i - 1].channel,
        toChannel: events[i].channel,
        timeBetweenMs: events[i].timestamp.getTime() - events[i - 1].timestamp.getTime(),
      });
    }
  }
  return transitions;
}
```

Transitions are used by the escalation detector (Section 9) and displayed visually in the timeline (Section 4).

### 8.6 Journey Metadata Update

After stitching an event, the customer profile's summary metadata is updated:

```typescript
async function updateProfileMetadata(profileId: string): Promise<void> {
  const stats = await prisma.event.aggregate({
    where: { profile_id: profileId },
    _count: true,
    _min: { timestamp: true },
    _max: { timestamp: true },
  });

  const channels = await prisma.event.findMany({
    where: { profile_id: profileId },
    distinct: ['channel'],
    select: { channel: true },
  });

  await prisma.customerProfile.update({
    where: { id: profileId },
    data: {
      event_count: stats._count,
      first_seen_at: stats._min.timestamp!,
      last_seen_at: stats._max.timestamp!,
      channels_used: channels.map(c => c.channel),
      channel_count: channels.length,
      updated_at: new Date(),
    },
  });
}
```

---

## 9. Journey Engine

### 9.1 Overview

The journey engine constructs the complete customer journey from stitched events and runs pattern detection. It is called after every event is stitched, so patterns are detected incrementally.

### 9.2 Pattern Detection Orchestration

After an event is stitched, the pattern detector runs all detectors against the updated journey:

```typescript
async function detectPatterns(profileId: string, newEvent: Event): Promise<DetectedPattern[]> {
  const events = await prisma.event.findMany({
    where: { profile_id: profileId },
    orderBy: { timestamp: 'asc' },
  });

  const patterns: DetectedPattern[] = [];

  patterns.push(...detectDropOffs(events, newEvent));
  patterns.push(...detectEscalations(events, newEvent));
  patterns.push(...detectRepeatContacts(events, newEvent));
  patterns.push(...detectUnresolvedIssues(events, newEvent));

  // Churn signals depend on other patterns
  const existingPatterns = await prisma.detectedPattern.findMany({
    where: { profile_id: profileId },
  });
  const allPatterns = [...existingPatterns.map(p => p.pattern_type), ...patterns.map(p => p.pattern_type)];
  patterns.push(...evaluateChurnSignals(profileId, events, allPatterns));

  // Store new patterns
  for (const pattern of patterns) {
    await prisma.detectedPattern.create({ data: pattern });
  }

  // Update profile flags
  await updateProfileFlags(profileId);

  return patterns;
}
```

### 9.3 Drop-Off Detection

```typescript
const PROCESS_DEFINITIONS = [
  {
    name: 'checkout',
    initiationEvents: ['checkout_start'],
    completionEvents: ['purchase_complete'],
    windowMs: 2 * 60 * 60 * 1000, // 2 hours
  },
  {
    name: 'onboarding',
    initiationEvents: ['signup'],
    completionEvents: ['page_view', 'product_view', 'search', 'add_to_cart'],
    windowMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  {
    name: 'support_resolution',
    initiationEvents: ['ticket_created'],
    completionEvents: ['ticket_resolved', 'ticket_closed'],
    windowMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
];

function detectDropOffs(events: Event[], newEvent: Event): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  for (const process of PROCESS_DEFINITIONS) {
    // Find initiation events that don't have a completion
    const initiations = events.filter(e =>
      process.initiationEvents.includes(e.event_type)
    );

    for (const initiation of initiations) {
      const windowEnd = new Date(initiation.timestamp.getTime() + process.windowMs);

      // Only evaluate if the window has expired
      if (new Date() < windowEnd) continue;

      const hasCompletion = events.some(e =>
        process.completionEvents.includes(e.event_type)
        && e.timestamp > initiation.timestamp
        && e.timestamp <= windowEnd
      );

      if (!hasCompletion) {
        // Check if this drop-off was already detected
        const lastEventInProcess = events
          .filter(e => e.timestamp >= initiation.timestamp && e.timestamp <= windowEnd)
          .slice(-1)[0];

        patterns.push({
          profile_id: initiation.profile_id,
          pattern_type: 'drop_off',
          event_id: lastEventInProcess?.id || initiation.id,
          details: {
            process: process.name,
            initiated_event_id: initiation.id,
            initiated_at: initiation.timestamp.toISOString(),
            last_event_id: lastEventInProcess?.id,
            last_event_at: lastEventInProcess?.timestamp.toISOString(),
            channel: initiation.channel,
            window_expired_at: windowEnd.toISOString(),
          },
        });
      }
    }
  }

  return patterns;
}
```

### 9.4 Escalation Detection

```typescript
const CHANNEL_TIERS: Record<string, number> = {
  web: 1,
  mobile: 1,
  chat: 2,
  email: 2,
  call_center: 3,
  in_store: 4,
};

const ESCALATION_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours

function detectEscalations(events: Event[], newEvent: Event): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  // Check if the new event represents an escalation from a recent lower-tier event
  const newTier = CHANNEL_TIERS[newEvent.channel] || 0;

  const recentEvents = events.filter(e =>
    e.id !== newEvent.id
    && e.timestamp < newEvent.timestamp
    && (newEvent.timestamp.getTime() - e.timestamp.getTime()) <= ESCALATION_WINDOW_MS
  );

  for (const priorEvent of recentEvents.reverse()) {
    const priorTier = CHANNEL_TIERS[priorEvent.channel] || 0;

    if (newTier > priorTier) {
      patterns.push({
        profile_id: newEvent.profile_id,
        pattern_type: 'escalation',
        event_id: newEvent.id,
        details: {
          source_channel: priorEvent.channel,
          source_tier: priorTier,
          source_event_id: priorEvent.id,
          destination_channel: newEvent.channel,
          destination_tier: newTier,
          destination_event_id: newEvent.id,
          tier_increase: newTier - priorTier,
          time_between_seconds: Math.round(
            (newEvent.timestamp.getTime() - priorEvent.timestamp.getTime()) / 1000
          ),
        },
      });
      break; // only flag the first (most recent) escalation source
    }
  }

  return patterns;
}
```

### 9.5 Repeat Contact Detection

```typescript
const SUPPORT_EVENT_TYPES = [
  'ticket_created', 'call_started', 'chat_started',
  'email_sent', 'complaint_filed',
];

const REPEAT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function detectRepeatContacts(events: Event[], newEvent: Event): DetectedPattern[] {
  if (!SUPPORT_EVENT_TYPES.includes(newEvent.event_type)) {
    return [];
  }

  const windowStart = new Date(newEvent.timestamp.getTime() - REPEAT_WINDOW_MS);

  const recentSupportContacts = events.filter(e =>
    SUPPORT_EVENT_TYPES.includes(e.event_type)
    && e.timestamp >= windowStart
    && e.timestamp <= newEvent.timestamp
  );

  if (recentSupportContacts.length >= 2) { // includes the new event
    return [{
      profile_id: newEvent.profile_id,
      pattern_type: 'repeat_contact',
      event_id: newEvent.id,
      details: {
        contact_count: recentSupportContacts.length,
        window_days: 7,
        first_contact_event_id: recentSupportContacts[0].id,
        contacts: recentSupportContacts.map(e => ({
          event_id: e.id,
          channel: e.channel,
          event_type: e.event_type,
          timestamp: e.timestamp.toISOString(),
        })),
      },
    }];
  }

  return [];
}
```

### 9.6 Unresolved Issue Detection

```typescript
const SUPPORT_INITIATION_TYPES = ['ticket_created', 'complaint_filed'];
const RESOLUTION_TYPES = ['ticket_resolved', 'ticket_closed'];
const RESOLUTION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function detectUnresolvedIssues(events: Event[], newEvent: Event): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  const initiations = events.filter(e =>
    SUPPORT_INITIATION_TYPES.includes(e.event_type)
  );

  for (const initiation of initiations) {
    const windowEnd = new Date(initiation.timestamp.getTime() + RESOLUTION_WINDOW_MS);

    if (new Date() < windowEnd) continue; // window hasn't expired yet

    const hasResolution = events.some(e =>
      RESOLUTION_TYPES.includes(e.event_type)
      && e.timestamp > initiation.timestamp
      && e.timestamp <= windowEnd
    );

    if (!hasResolution) {
      patterns.push({
        profile_id: initiation.profile_id,
        pattern_type: 'unresolved_issue',
        event_id: initiation.id,
        details: {
          initiation_event_id: initiation.id,
          initiation_type: initiation.event_type,
          initiated_at: initiation.timestamp.toISOString(),
          window_expired_at: windowEnd.toISOString(),
        },
      });
    }
  }

  return patterns;
}
```

### 9.7 Churn Signal Evaluation

```typescript
const CHURN_RULES = [
  {
    name: 'repeated_frustration',
    riskWeight: 'high' as const,
    evaluate: (events: Event[], patterns: string[]) => {
      const repeatCount = patterns.filter(p => p === 'repeat_contact').length;
      if (repeatCount >= 3) {
        return { matched: true, evidence: `${repeatCount} repeat contact patterns in 30 days` };
      }
      return { matched: false };
    },
  },
  {
    name: 'escalation_abandonment',
    riskWeight: 'high' as const,
    evaluate: (events: Event[], patterns: string[]) => {
      if (!patterns.includes('escalation')) return { matched: false };

      const lastEvent = events[events.length - 1];
      const daysSinceLastEvent = (Date.now() - lastEvent.timestamp.getTime())
        / (24 * 60 * 60 * 1000);

      if (daysSinceLastEvent >= 14) {
        return {
          matched: true,
          evidence: `Escalation followed by ${Math.round(daysSinceLastEvent)} days of inactivity`,
        };
      }
      return { matched: false };
    },
  },
  {
    name: 'process_abandonment',
    riskWeight: 'medium' as const,
    evaluate: (events: Event[], patterns: string[]) => {
      if (!patterns.includes('drop_off')) return { matched: false };

      const lastEvent = events[events.length - 1];
      const daysSinceLastEvent = (Date.now() - lastEvent.timestamp.getTime())
        / (24 * 60 * 60 * 1000);

      if (daysSinceLastEvent >= 7) {
        return {
          matched: true,
          evidence: `Drop-off followed by ${Math.round(daysSinceLastEvent)} days with no return`,
        };
      }
      return { matched: false };
    },
  },
  {
    name: 'unresolved_complaint',
    riskWeight: 'medium' as const,
    evaluate: (events: Event[], patterns: string[]) => {
      if (patterns.includes('unresolved_issue')) {
        return { matched: true, evidence: 'Support issue unresolved past 7-day window' };
      }
      return { matched: false };
    },
  },
];

function evaluateChurnSignals(
  profileId: string,
  events: Event[],
  allPatternTypes: string[]
): DetectedPattern[] {
  const matchedRules = CHURN_RULES
    .map(rule => ({ ...rule, result: rule.evaluate(events, allPatternTypes) }))
    .filter(r => r.result.matched);

  if (matchedRules.length === 0) return [];

  const highestRisk = matchedRules.some(r => r.riskWeight === 'high')
    ? 'high'
    : matchedRules.some(r => r.riskWeight === 'medium')
      ? 'medium'
      : 'low';

  return [{
    profile_id: profileId,
    pattern_type: 'churn_signal',
    event_id: null,
    details: {
      churn_risk: highestRisk,
      signals: matchedRules.map(r => ({
        rule: r.name,
        risk_weight: r.riskWeight,
        evidence: r.result.evidence,
      })),
    },
  }];
}
```

---

## 10. Analytics Engine

### 10.1 KPI Computation

All analytics are computed on-demand from the database. No pre-materialized views for the hackathon MVP (data volume is small enough for real-time queries).

```typescript
interface AnalyticsSummary {
  totalCustomers: number;
  totalEvents: number;
  identityResolutionRate: number;  // 0.0–1.0
  averageConfidence: number;       // 0.0–1.0
  dropOffCount: number;
  escalationCount: number;
  repeatContactRate: number;       // 0.0–1.0
  churnRiskCount: number;
  unresolvedIssueCount: number;
  eventsByChannel: Record<string, number>;
  resolutionMethodDistribution: {
    deterministic: number;
    probabilistic: number;
    new_profile: number;
  };
}

async function computeAnalytics(
  dateFrom?: Date,
  dateTo?: Date,
  channel?: string
): Promise<AnalyticsSummary> {
  const dateFilter = {
    ...(dateFrom && { gte: dateFrom }),
    ...(dateTo && { lte: dateTo }),
  };
  const channelFilter = channel ? { channel } : {};

  const totalCustomers = await prisma.customerProfile.count();
  const totalEvents = await prisma.event.count({
    where: { timestamp: dateFilter, ...channelFilter },
  });

  // Identity resolution rate: % of events matched to existing profile
  const resolutionCounts = await prisma.event.groupBy({
    by: ['resolution_method'],
    _count: true,
    where: { timestamp: dateFilter, ...channelFilter },
  });

  const deterministicCount = resolutionCounts
    .find(r => r.resolution_method === 'deterministic')?._count || 0;
  const probabilisticCount = resolutionCounts
    .find(r => r.resolution_method === 'probabilistic')?._count || 0;
  const newProfileCount = resolutionCounts
    .find(r => r.resolution_method === 'new_profile')?._count || 0;

  const identityResolutionRate = totalEvents > 0
    ? (deterministicCount + probabilisticCount) / totalEvents
    : 0;

  // Average confidence
  const avgConfidence = await prisma.event.aggregate({
    _avg: { resolution_confidence: true },
    where: { timestamp: dateFilter, ...channelFilter },
  });

  // Pattern counts
  const patternCounts = await prisma.detectedPattern.groupBy({
    by: ['pattern_type'],
    _count: true,
    where: { detected_at: dateFilter },
  });

  const getPatternCount = (type: string) =>
    patternCounts.find(p => p.pattern_type === type)?._count || 0;

  // Repeat contact rate
  const customersWithRepeat = await prisma.customerProfile.count({
    where: { has_repeat_contact: true },
  });

  // Churn risk
  const churnRiskCount = await prisma.customerProfile.count({
    where: { churn_risk: { in: ['high', 'medium'] } },
  });

  // Events by channel
  const channelCounts = await prisma.event.groupBy({
    by: ['channel'],
    _count: true,
    where: { timestamp: dateFilter },
  });

  return {
    totalCustomers,
    totalEvents,
    identityResolutionRate,
    averageConfidence: avgConfidence._avg.resolution_confidence || 0,
    dropOffCount: getPatternCount('drop_off'),
    escalationCount: getPatternCount('escalation'),
    repeatContactRate: totalCustomers > 0 ? customersWithRepeat / totalCustomers : 0,
    churnRiskCount,
    unresolvedIssueCount: getPatternCount('unresolved_issue'),
    eventsByChannel: Object.fromEntries(
      channelCounts.map(c => [c.channel, c._count])
    ),
    resolutionMethodDistribution: {
      deterministic: deterministicCount,
      probabilistic: probabilisticCount,
      new_profile: newProfileCount,
    },
  };
}
```

### 10.2 Chart Data Endpoints

| Chart | Query |
|---|---|
| Events by Channel | `GROUP BY channel, COUNT(*)` on events table |
| Drop-Offs by Process | `GROUP BY details->>'process', COUNT(*)` on detected_patterns where type = 'drop_off' |
| Escalations by Channel Pair | `GROUP BY details->>'source_channel', details->>'destination_channel', COUNT(*)` on detected_patterns where type = 'escalation' |
| Identity Resolution Method | `GROUP BY resolution_method, COUNT(*)` on events table |
| Confidence Distribution | Bucket `resolution_confidence` into 10 bins (0.0–0.1, 0.1–0.2, ..., 0.9–1.0), count per bin |
| Friction Points | `GROUP BY event_type, channel, COUNT(*)` on events joined with detected_patterns |

### 10.3 Filtering

All analytics queries accept optional parameters:

- `dateFrom` / `dateTo` — ISO 8601 timestamps, filter on `events.timestamp` or `detected_patterns.detected_at`.
- `channel` — filter on `events.channel`.

Filters are passed as query parameters on `GET /api/v1/analytics/summary`.

---

## 11. AI/ML Layer

### 11.1 Philosophy

JourneyX uses AI/ML only where it provides genuine technical value that rule-based approaches cannot deliver. For the hackathon MVP, there is exactly **one** area where a lightweight ML technique is justified:

### 11.2 Probabilistic Identity Matching — Weighted Scoring

| Attribute | Detail |
|---|---|
| **Purpose** | Match events to customer profiles when no deterministic (exact) match exists, by scoring similarity across multiple weak signals. |
| **Input** | Event identifiers (device_id, cookie_id, name), event metadata (timestamp, channel). Candidate profile identifiers and last-event context. |
| **Output** | Confidence score (0.0–1.0) per candidate profile, with per-signal evidence. |
| **Model type** | Weighted linear scoring (not a trained model). Weights are hand-tuned starting values, evaluated against synthetic data. |
| **Training data** | None (weights are manually set). Evaluated against synthetic data with known ground truth. |
| **Inference process** | For each candidate profile, compute weighted sum of matching signals, normalize by max possible score. |
| **Evaluation** | Precision and recall measured against synthetic data ground truth. Adjust weights if precision < 90% on test set. |
| **Fallback** | If all probabilistic signals are absent, create a new profile (safe fallback). |
| **Explainability** | Every scored signal is recorded with its weight, match/no-match status, and contributing score. The analyst can see exactly why the system linked (or didn't link) two identifiers. |

### 11.3 Name Similarity — Jaro-Winkler Distance

| Attribute | Detail |
|---|---|
| **Purpose** | Compare customer names across channels where exact match fails due to variations (nicknames, typos, transliteration). |
| **Input** | Two name strings. |
| **Output** | Similarity score (0.0–1.0). |
| **Model type** | Jaro-Winkler string distance algorithm (deterministic, not ML). |
| **Training data** | None (algorithmic). |
| **Inference process** | Compute Jaro distance → apply Winkler prefix bonus → return score. |
| **Evaluation** | Tested against known name pairs in synthetic data (same person with variations, different people with similar names). |
| **Fallback** | If similarity < 0.85, the name signal does not contribute to the probabilistic score. |
| **Explainability** | The exact similarity percentage is recorded and displayed. |

### 11.4 What Is NOT Included

| Technique | Why Not |
|---|---|
| **Trained ML model for identity resolution** | No production training data exists. A trained model would require labeled pairs of (same customer, different customer) across channels — this data does not exist for the hackathon. Weighted scoring achieves the same goal with transparency. |
| **NLP for support ticket analysis** | Would require embedding models, inference infrastructure, and meaningful text data. The PRD specifies rule-based pattern detection. Adds complexity without proportional demo value. |
| **Predictive churn model** | Requires historical churn labels for training. Synthetic data cannot provide meaningful churn training signal. Rule-based churn signals (PRD Section 11.6) are sufficient and more explainable. |
| **LLM-based natural language querying** | Not in the problem statement. Adds latency, cost, and a dependency on external API. The analyst UI provides structured search and filtering. |
| **Anomaly detection** | Requires baseline behavioral data that does not exist for a demo with synthetic data. |

---

## 12. API Specification

### 12.1 Base Path

All API endpoints are under `/api/v1/`.

### 12.2 Common Response Formats

**Success (single item):**
```json
{ "data": { ... } }
```

**Success (list):**
```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

**Error:**
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { ... }
  }
}
```

### 12.3 Endpoints

---

#### POST /api/v1/events

**Purpose:** Ingest a single customer event.

**Auth:** None (hackathon MVP).

**Request:**
```json
{
  "channel": "web",
  "event_type": "checkout_start",
  "timestamp": "2026-09-15T10:00:00Z",
  "identifiers": {
    "email": "john@example.com",
    "cookie_id": "ck_abc123"
  },
  "metadata": {
    "page_url": "/checkout",
    "product_id": "prod_456",
    "amount": 99.99,
    "currency": "USD"
  }
}
```

**Response (202 Accepted):**
```json
{
  "data": {
    "event_id": "evt_uuid",
    "profile_id": "cust_uuid",
    "duplicate": false,
    "resolution": {
      "method": "deterministic",
      "confidence": 1.0,
      "matched_fields": ["email"]
    }
  }
}
```

**Response (400 Bad Request):**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Event validation failed",
    "details": {
      "fields": [
        "identifiers: at least one identifier is required",
        "timestamp: invalid format"
      ]
    }
  }
}
```

---

#### POST /api/v1/events/batch

**Purpose:** Ingest up to 100 events in a single request.

**Auth:** None.

**Request:**
```json
{
  "events": [
    { "channel": "web", "event_type": "page_view", "timestamp": "...", "identifiers": { ... } },
    { "channel": "mobile", "event_type": "login", "timestamp": "...", "identifiers": { ... } }
  ]
}
```

**Response (202 Accepted):**
```json
{
  "data": {
    "processed": 98,
    "failed": 2,
    "results": [
      { "index": 0, "event_id": "evt_uuid", "status": "success", "profile_id": "cust_uuid" },
      { "index": 3, "event_id": null, "status": "error", "error": "Invalid timestamp" }
    ]
  }
}
```

**Errors:** 400 if the body is not valid JSON or `events` is not an array. Individual event errors are reported in the `results` array, not as a top-level error (partial success is allowed).

---

#### GET /api/v1/customers

**Purpose:** List customer profiles with filtering and pagination.

**Auth:** None.

**Query Parameters:**
| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer | 1 | Page number |
| `pageSize` | integer | 20 | Items per page (max 100) |
| `pattern` | string (comma-separated) | — | Filter by pattern type(s): `drop_off,escalation,repeat_contact,unresolved_issue,churn_signal` |
| `channel` | string (comma-separated) | — | Filter by channel(s) used |
| `churnRisk` | string | — | Filter by churn risk level: `high,medium,low,none` |
| `minConfidence` | number | — | Minimum average identity confidence |
| `dateFrom` | ISO 8601 | — | Activity after this date |
| `dateTo` | ISO 8601 | — | Activity before this date |
| `sortBy` | string | `last_seen_at` | Sort field: `last_seen_at,event_count,churn_risk,avg_confidence` |
| `sortOrder` | string | `desc` | Sort direction: `asc,desc` |

**Response (200):**
```json
{
  "data": [
    {
      "id": "cust_uuid",
      "display_name": "John Doe",
      "email_masked": "j***@example.com",
      "event_count": 15,
      "channel_count": 3,
      "channels_used": ["web", "mobile", "call_center"],
      "first_seen_at": "2026-09-01T00:00:00Z",
      "last_seen_at": "2026-09-15T14:30:00Z",
      "churn_risk": "high",
      "has_drop_off": true,
      "has_escalation": true,
      "has_repeat_contact": true,
      "has_unresolved": false,
      "avg_confidence": 0.95
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 150, "totalPages": 8 }
}
```

---

#### GET /api/v1/customers/search

**Purpose:** Search for customers by any identifier.

**Auth:** None.

**Query Parameters:**
| Param | Type | Description |
|---|---|---|
| `q` | string (required) | Search query — matched against email, phone, name, loyalty_id, device_id, cookie_id, profile ID |

**Response (200):**
```json
{
  "data": [
    {
      "id": "cust_uuid",
      "display_name": "John Doe",
      "identifiers": [
        { "type": "email", "value_masked": "j***@example.com" },
        { "type": "phone", "value_masked": "***-1234" }
      ],
      "event_count": 15,
      "channel_count": 3,
      "churn_risk": "high",
      "match_field": "email",
      "match_quality": "exact"
    }
  ]
}
```

---

#### GET /api/v1/customers/:id

**Purpose:** Get a customer's unified profile.

**Auth:** None.

**Response (200):**
```json
{
  "data": {
    "id": "cust_uuid",
    "display_name": "John Doe",
    "identifiers": [
      { "type": "email", "value": "john@example.com", "source_channel": "web", "confidence": 1.0, "first_seen_at": "..." },
      { "type": "phone", "value": "555-123-4567", "source_channel": "call_center", "confidence": 1.0, "first_seen_at": "..." },
      { "type": "cookie_id", "value": "ck_abc123", "source_channel": "web", "confidence": 0.85, "first_seen_at": "..." }
    ],
    "statistics": {
      "event_count": 15,
      "channel_count": 3,
      "channels_used": ["web", "mobile", "call_center"],
      "first_seen_at": "2026-09-01T00:00:00Z",
      "last_seen_at": "2026-09-15T14:30:00Z",
      "active_days": 15
    },
    "patterns": {
      "drop_off_count": 1,
      "escalation_count": 1,
      "repeat_contact_count": 2,
      "unresolved_issue_count": 0,
      "churn_risk": "high",
      "churn_signals": [
        { "rule": "repeated_frustration", "evidence": "3 repeat contacts in 14 days" }
      ]
    },
    "avg_confidence": 0.95
  }
}
```

**Response (404):** Customer not found.

---

#### GET /api/v1/customers/:id/journey

**Purpose:** Get a customer's stitched journey timeline.

**Auth:** None.

**Query Parameters:**
| Param | Type | Description |
|---|---|---|
| `channel` | string (comma-separated) | Filter events by channel |
| `eventType` | string (comma-separated) | Filter events by type |
| `dateFrom` | ISO 8601 | Events after this date |
| `dateTo` | ISO 8601 | Events before this date |
| `pattern` | string (comma-separated) | Show only events with detected patterns |

**Response (200):**
```json
{
  "data": {
    "profile_id": "cust_uuid",
    "total_events": 15,
    "filtered_events": 15,
    "events": [
      {
        "id": "evt_uuid",
        "channel": "web",
        "event_type": "page_view",
        "event_category": "browse",
        "timestamp": "2026-09-01T10:00:00Z",
        "metadata": { "page_url": "/products/shoes" },
        "session_index": 1,
        "journey_index": 1,
        "is_channel_transition": false,
        "patterns": [],
        "resolution": {
          "method": "deterministic",
          "confidence": 1.0
        }
      },
      {
        "id": "evt_uuid2",
        "channel": "call_center",
        "event_type": "call_started",
        "event_category": "support",
        "timestamp": "2026-09-01T12:00:00Z",
        "metadata": { "agent_id": "agent_42", "duration_seconds": 300 },
        "session_index": 2,
        "journey_index": 1,
        "is_channel_transition": true,
        "patterns": [
          {
            "type": "escalation",
            "details": {
              "source_channel": "web",
              "destination_channel": "call_center",
              "tier_increase": 2
            }
          }
        ],
        "resolution": {
          "method": "deterministic",
          "confidence": 1.0
        }
      }
    ]
  }
}
```

---

#### GET /api/v1/customers/:id/identity

**Purpose:** Get identity resolution evidence for a customer.

**Auth:** None.

**Response (200):**
```json
{
  "data": {
    "profile_id": "cust_uuid",
    "identifiers": [
      { "type": "email", "value": "john@example.com", "source_channel": "web", "confidence": 1.0 },
      { "type": "phone", "value": "555-123-4567", "source_channel": "call_center", "confidence": 1.0 },
      { "type": "cookie_id", "value": "ck_abc123", "source_channel": "web", "confidence": 0.85 }
    ],
    "resolution_history": [
      {
        "event_id": "evt_1",
        "timestamp": "2026-09-01T10:00:00Z",
        "method": "new_profile",
        "confidence": 0.0,
        "evidence": [],
        "identifiers_added": ["cookie_id:ck_abc123"]
      },
      {
        "event_id": "evt_2",
        "timestamp": "2026-09-01T10:30:00Z",
        "method": "deterministic",
        "confidence": 1.0,
        "evidence": [
          { "field": "email", "match_type": "exact", "detail": "Login linked cookie to email" }
        ],
        "identifiers_added": ["email:john@example.com"]
      },
      {
        "event_id": "evt_5",
        "timestamp": "2026-09-01T12:00:00Z",
        "method": "deterministic",
        "confidence": 1.0,
        "evidence": [
          { "field": "email", "match_type": "exact", "detail": "CRM lookup matched email" }
        ],
        "identifiers_added": ["phone:555-123-4567"]
      }
    ],
    "conflicts": []
  }
}
```

---

#### GET /api/v1/events/:id

**Purpose:** Get full detail for a single event.

**Auth:** None.

**Response (200):**
```json
{
  "data": {
    "id": "evt_uuid",
    "profile_id": "cust_uuid",
    "channel": "web",
    "event_type": "checkout_start",
    "event_category": "commerce",
    "timestamp": "2026-09-15T10:00:00Z",
    "metadata": {
      "page_url": "/checkout",
      "product_id": "prod_456",
      "amount": 99.99,
      "currency": "USD"
    },
    "identifiers": {
      "email": "john@example.com",
      "cookie_id": "ck_abc123"
    },
    "resolution": {
      "method": "deterministic",
      "confidence": 1.0,
      "evidence": [
        { "field": "email", "match_type": "exact" }
      ]
    },
    "patterns": [
      { "type": "drop_off", "details": { "process": "checkout", ... } }
    ],
    "raw_data": { ... }
  }
}
```

---

#### GET /api/v1/analytics/summary

**Purpose:** Get aggregate analytics KPIs and chart data.

**Auth:** None.

**Query Parameters:**
| Param | Type | Description |
|---|---|---|
| `dateFrom` | ISO 8601 | Analytics period start |
| `dateTo` | ISO 8601 | Analytics period end |
| `channel` | string | Filter by channel |

**Response (200):**
```json
{
  "data": {
    "kpis": {
      "total_customers": 1500,
      "total_events": 45000,
      "identity_resolution_rate": 0.87,
      "average_confidence": 0.92,
      "drop_off_count": 230,
      "escalation_count": 85,
      "repeat_contact_rate": 0.12,
      "churn_risk_count": 45,
      "unresolved_issue_count": 67
    },
    "charts": {
      "events_by_channel": [
        { "channel": "web", "count": 18000 },
        { "channel": "mobile", "count": 12000 },
        ...
      ],
      "drop_offs_by_process": [
        { "process": "checkout", "count": 150 },
        { "process": "onboarding", "count": 50 },
        { "process": "support_resolution", "count": 30 }
      ],
      "escalations_by_pair": [
        { "source": "web", "destination": "call_center", "count": 45 },
        { "source": "chat", "destination": "call_center", "count": 25 },
        ...
      ],
      "resolution_method_distribution": {
        "deterministic": 35000,
        "probabilistic": 4200,
        "new_profile": 5800
      },
      "confidence_distribution": [
        { "range": "0.0-0.1", "count": 5800 },
        { "range": "0.9-1.0", "count": 35000 },
        ...
      ],
      "friction_points": [
        { "event_type": "checkout_start", "channel": "web", "pattern_count": 120 },
        { "event_type": "call_started", "channel": "call_center", "pattern_count": 85 },
        ...
      ]
    }
  }
}
```

---

#### GET /api/v1/pipeline/health

**Purpose:** Get pipeline health metrics (P2).

**Auth:** None.

**Response (200):**
```json
{
  "data": {
    "stages": {
      "ingested": 46000,
      "validated": 45500,
      "normalized": 45500,
      "deduplicated": 45000,
      "resolved": 45000,
      "stitched": 45000,
      "patterns_detected": 45000,
      "error": 500
    },
    "recent_errors": [
      {
        "timestamp": "2026-09-19T10:30:00Z",
        "stage": "validated",
        "error": "Invalid timestamp format",
        "event_snippet": { "channel": "web", "event_type": "page_view" }
      }
    ],
    "identity_stats": {
      "total_profiles": 1500,
      "avg_confidence": 0.92,
      "conflict_count": 3,
      "identifiers_per_profile_avg": 2.8
    }
  }
}
```

---

## 13. Real-Time Communication

### 13.1 Decision: Polling, Not WebSockets

JourneyX does **not** need real-time push communication for the hackathon MVP.

**Justification:**

| Requirement | Real-Time Needed? | Rationale |
|---|---|---|
| Event ingestion feedback | No | The API response to POST already confirms processing. |
| Dashboard updates | No | Analysts check the dashboard periodically, not in real-time. A manual refresh or 30-second polling is sufficient. |
| Notification delivery | No | In-app notifications are checked when the analyst navigates to the page. A badge counter fetched on page load is sufficient. |
| Pipeline health | No | Administrators check health manually. Not a real-time monitoring console. |
| Journey timeline updates | No | Analysts view a customer's journey after it has been stitched. They are not watching a live event feed. |

**Implementation:** The analytics dashboard and notification badge use client-side polling with SWR's `refreshInterval` option:

```typescript
const { data } = useSWR('/api/v1/analytics/summary', fetcher, {
  refreshInterval: 30000, // 30 seconds
});
```

This adds zero infrastructure complexity (no WebSocket server, no connection management, no reconnection logic).

### 13.2 Production Consideration

In a production system, WebSockets or Server-Sent Events (SSE) would be appropriate for:

- Live event feed on a monitoring dashboard.
- Push notifications for high-priority alerts (churn risk detected).
- Real-time pipeline health indicators.

This is documented for the presentation but not implemented.

---

## 14. Security

### 14.1 Authentication

**Hackathon MVP: None.** The application does not authenticate users. All endpoints are publicly accessible.

**Production design (documented, not implemented):** NextAuth.js with email/password or OAuth providers. JWT session tokens. API routes protected by auth middleware that checks the session.

**Where auth would be inserted:** A `middleware.ts` at the project root (Next.js middleware) would check for a valid session on all `/api/v1/*` and page routes, redirecting unauthenticated requests to a login page.

### 14.2 Authorization

**Hackathon MVP: None.** All authenticated users (there are none) have full access.

**Production design:** Role-based access control (RBAC) with the following roles:

| Role | Permissions |
|---|---|
| Admin | All operations. Configure event sources. View pipeline health. Manage users. |
| Analyst | Search customers. View profiles and journeys. View analytics. Cannot modify data. |
| Viewer | View analytics dashboard only. Cannot search customers or view individual journeys. |

### 14.3 PII Handling

| Context | PII Treatment |
|---|---|
| **Storage** | PII (email, phone, name) stored in plaintext in PostgreSQL. In production, these would be encrypted at rest (database-level encryption) and specific fields would be application-level encrypted. |
| **API list views** | Customer list endpoint returns masked identifiers: `j***@example.com`, `***-1234`. Full values only in the detail endpoint. |
| **API detail views** | Full PII returned (the analyst needs it for investigation). |
| **Logs** | PII never logged. Logs use identifier types and hashed values only. |
| **Error responses** | PII never included in error messages or details. |
| **Synthetic data** | All demo data uses fictional names and addresses. Clearly marked as synthetic. |

### 14.4 Input Sanitization

- All user input (search queries, filter values) is parameterized through Prisma — no string concatenation into queries.
- Event metadata (JSONB) is accepted as-is but never rendered as raw HTML in the frontend — React's default escaping prevents XSS.
- API request body size limited to 1MB (Next.js default, sufficient for batch events).

### 14.5 Rate Limiting

A simple in-memory rate limiter on event ingestion endpoints:

```typescript
const RATE_LIMIT = 100; // requests per second
const rateLimiter = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(clientIp: string): boolean {
  const now = Date.now();
  const entry = rateLimiter.get(clientIp);

  if (!entry || entry.resetAt < now) {
    rateLimiter.set(clientIp, { count: 1, resetAt: now + 1000 });
    return true;
  }

  if (entry.count >= RATE_LIMIT) {
    return false; // rate limited
  }

  entry.count++;
  return true;
}
```

Returns `429 Too Many Requests` when exceeded.

### 14.6 Secrets Management

No external API keys or secrets are needed for the hackathon MVP. The only secret is the `DATABASE_URL` connection string, stored in a `.env` file (excluded from version control via `.gitignore`).

### 14.7 Audit Logging

The `resolution_logs` table serves as an audit log for all identity resolution decisions. Each entry records:

- Which event triggered the resolution.
- Which profile was matched or created.
- What method was used.
- What evidence contributed.
- Whether a conflict occurred.
- Timestamp.

This is the only audit log in the MVP. In production, a broader audit log would track all data access (who searched for which customer, when).

---

## 15. Observability

### 15.1 Logs

**Format:** Structured JSON to stdout.

**Log levels:**

| Level | Usage |
|---|---|
| `info` | Event processed successfully. Profile created/updated. Pattern detected. |
| `warn` | Unknown event type (mapped to 'unknown'). Deduplication index miss (event accepted). Low-confidence resolution. |
| `error` | Validation failure. Database error. Identity resolution failure. Unhandled exception. |

**Structured fields:**

```json
{
  "timestamp": "2026-09-19T10:30:00Z",
  "level": "info",
  "module": "identity",
  "action": "resolve",
  "event_id": "evt_abc",
  "profile_id": "cust_123",
  "method": "deterministic",
  "confidence": 1.0,
  "message": "Event resolved to existing profile via email match"
}
```

### 15.2 Metrics

Pipeline metrics are stored in the `pipeline_metrics` table. Each event processing records one row per stage:

```typescript
async function recordMetric(
  stage: PipelineStage,
  channel?: string,
  errorMessage?: string
): Promise<void> {
  await prisma.pipelineMetric.create({
    data: {
      stage,
      channel,
      error_message: errorMessage,
      recorded_at: new Date(),
    },
  });
}
```

Metrics are queried by the pipeline health endpoint (`GET /api/v1/pipeline/health`), grouped by stage and counted.

### 15.3 Error Tracking

Errors from the pipeline are:

1. Logged to stdout (structured JSON).
2. Recorded in `pipeline_metrics` with `stage = 'error'` and the error message.
3. Surfaced in the pipeline health dashboard (P2).

No external error tracking service (Sentry, etc.) for the hackathon. In production, Sentry or similar would be added.

### 15.4 Health Checks

**Endpoint:** `GET /api/v1/health`

**Response:**
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-09-19T10:30:00Z"
}
```

Checks database connectivity. Returns `503 Service Unavailable` if the database is unreachable.

---

## 16. Testing

### 16.1 Testing Strategy

| Test Type | Tool | Coverage |
|---|---|---|
| **Unit tests** | Vitest | All `lib/` modules: validator, normalizer, deduplicator, identity resolution, stitcher, pattern detectors, analytics queries. |
| **Integration tests** | Vitest + Prisma (test database) | Full pipeline: raw event → stored event + resolved profile + detected patterns. |
| **API tests** | Vitest + supertest (or Next.js test client) | All API endpoints: request/response format, status codes, error handling. |
| **Frontend tests** | Vitest + React Testing Library | Key components: TimelineView, EventCard, SearchBar, FilterPanel, KPICard. |
| **Identity resolution tests** | Vitest | Deterministic matching (exact match, multi-match, conflict). Probabilistic scoring (single signal, multi-signal, threshold boundary). Identifier expansion. |
| **Pattern detection tests** | Vitest | Each detector tested with synthetic event sequences that should and should not trigger detection. |

### 16.2 Identity Resolution Test Cases

| Test Case | Input | Expected |
|---|---|---|
| **Deterministic: email match** | Event with email matching existing profile | Match with confidence 1.0, method = deterministic |
| **Deterministic: phone match** | Event with phone matching existing profile | Match with confidence 1.0 |
| **Deterministic: no match** | Event with email not in any profile | Falls through to probabilistic |
| **Deterministic: conflict** | Event with email → Profile A, phone → Profile B | Conflict recorded, linked to profile with more events |
| **Probabilistic: device_id only** | Event with device_id matching a profile | Match with confidence based on device_id weight |
| **Probabilistic: device_id + name** | Event matching on both | Confidence = (0.6 + 0.2*similarity) / (0.6 + 0.2) |
| **Probabilistic: below threshold** | Event with weak cookie_id match only | New profile created (confidence < 0.70) |
| **Identifier expansion** | Event with new phone resolved to existing email-only profile | Phone added to profile identifiers |
| **New profile** | Event with no matching identifiers anywhere | New profile created with all event identifiers |

### 16.3 Pipeline Test Cases

| Test Case | Input | Expected |
|---|---|---|
| **Valid event** | Well-formed event JSON | 202 response, event in database, profile created/updated |
| **Missing channel** | Event without channel field | 400 with field error |
| **Missing identifiers** | Event with empty identifiers | 400 with identifier error |
| **Duplicate event** | Same event submitted twice within 5 minutes | First accepted, second flagged as duplicate |
| **Batch with mixed validity** | 100 events, 3 invalid | 202 response, 97 processed, 3 failed in results |
| **Invalid timestamp** | Event with unparseable timestamp | 400 with timestamp error |
| **Unknown event type** | Event with event_type not in taxonomy | Accepted, mapped to 'unknown', warning logged |
| **Late event** | Event with timestamp before existing events | Accepted, inserted in correct chronological position |

### 16.4 End-to-End Test: Demo Scenario

An E2E test that replicates the demo "Frustrated Shopper" scenario:

1. Ingest web browsing events (cookie_id only) → new profile created.
2. Ingest mobile login event (email + device_id) → new profile created.
3. Ingest web login event (email + cookie_id) → deterministic match on email links cookie profile to email profile... verify: identifier expansion adds cookie_id.
4. Ingest checkout_start event → verify event stitched to profile.
5. Wait for checkout drop-off window to expire → verify drop-off detected.
6. Ingest call_center event (phone + email from CRM) → verify deterministic match on email, phone added to profile.
7. Verify escalation detected (web → call_center).
8. Ingest second call_center event 3 days later → verify repeat contact detected.
9. Verify churn signals evaluated.

This test validates the complete pipeline and all detectors with a realistic scenario.

---

## 17. Performance

### 17.1 MVP Targets (Hackathon Scale)

| Operation | Target | Data Scale | Notes |
|---|---|---|---|
| Single event ingestion | < 200ms | — | Full pipeline including DB writes |
| Batch ingestion (100 events) | < 5s | — | Sequential processing |
| Customer search | < 500ms | 10K profiles | Database index-backed query |
| Journey timeline load | < 1s | 200 events per customer | Single query + in-memory session/journey computation |
| Analytics dashboard | < 2s | 50K events, 5K profiles | On-demand aggregation queries |
| Customer list with filters | < 1s | 10K profiles | Indexed filter queries |
| Event detail | < 100ms | — | Single-row lookup by primary key |
| Identity resolution (deterministic) | < 50ms | 10K profiles, 30K identifiers | Indexed lookup on identifier_type + identifier_value |
| Identity resolution (probabilistic) | < 200ms | 10K profiles | Query + in-memory scoring |

### 17.2 Production Targets (Documented, Not Implemented)

| Operation | Target | Data Scale | How |
|---|---|---|---|
| Single event ingestion | < 100ms | — | Async pipeline via message queue. API returns immediately after queue insertion. |
| Batch ingestion (1000 events) | < 2s | — | Parallel pipeline workers consuming from queue. |
| Customer search | < 200ms | 10M profiles | Elasticsearch for full-text search. |
| Journey timeline | < 500ms | 5000 events | Pre-materialized journey documents in document store. |
| Analytics dashboard | < 1s | 100M events | Pre-computed materialized views, refreshed on schedule. |
| Identity resolution | < 50ms | 10M profiles | Dedicated identity service with in-memory index of strong identifiers. |

### 17.3 Optimization Strategy for MVP

| Optimization | Applied |
|---|---|
| **Database indexes** | Indexes on all query-path columns (identifier lookup, profile events, pattern type). See schema in Section 3.2. |
| **Prisma query batching** | Use `prisma.$transaction()` for multi-table writes (profile + identifiers + event + resolution log). |
| **Pagination** | All list endpoints paginated (default 20, max 100). |
| **Selective fetching** | Journey timeline returns only columns needed for display (not raw_data). Full event detail fetched on expand. |
| **Dedup index** | In-memory Map for the 5-minute deduplication window (faster than DB query for recent events). |

---

## 18. Deployment

### 18.1 Hackathon Deployment Architecture

```
┌──────────────────────────────────┐
│           Vercel                 │
│  ┌────────────────────────────┐  │
│  │  Next.js Application      │  │
│  │  (frontend + API routes)  │  │
│  └─────────────┬──────────────┘  │
│                │                 │
└────────────────┼─────────────────┘
                 │ DATABASE_URL
                 ▼
┌──────────────────────────────────┐
│  Neon / Supabase / Railway      │
│  ┌────────────────────────────┐  │
│  │  PostgreSQL 16             │  │
│  │  (managed, serverless)     │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

**Alternative: Railway (full stack)**

If Vercel's serverless function timeout (10s on free tier) is too short for batch event processing, deploy the entire application on Railway:

```
┌──────────────────────────────────┐
│           Railway                │
│  ┌────────────────────────────┐  │
│  │  Next.js Application      │  │
│  │  (long-running process)   │  │
│  ├────────────────────────────┤  │
│  │  PostgreSQL 16             │  │
│  │  (Railway add-on)         │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

Railway runs the application as a persistent process (not serverless functions), so there is no execution timeout.

### 18.2 Deployment Process

1. Push code to GitHub (public repository — hackathon requirement).
2. Connect repository to Vercel or Railway.
3. Set environment variable: `DATABASE_URL`.
4. Run Prisma migrations: `npx prisma migrate deploy`.
5. Seed database with synthetic data: `npx prisma db seed`.
6. Application is live.

### 18.3 Environment Variables

| Variable | Purpose | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/journeyx` |
| `NODE_ENV` | Runtime environment | `production` |
| `NEXT_PUBLIC_APP_URL` | Public URL of the application | `https://journeyx.vercel.app` |

No API keys, no external service credentials. The `.env` file is in `.gitignore`.

### 18.4 Synthetic Data Seeding

The seed script (`prisma/seed.ts`) generates:

| Data | Volume | Purpose |
|---|---|---|
| Customer profiles | ~500 (synthetic) | Demo-scale dataset |
| Customer identifiers | ~1,500 (3 per customer avg) | Cross-channel identity data |
| Events | ~15,000 (30 per customer avg) | Multi-channel interaction history |
| Resolution logs | ~15,000 (1 per event) | Identity resolution audit trail |
| Detected patterns | ~1,000 | Pre-detected drop-offs, escalations, repeats, churn signals |

**Two demo scenarios** (from PRD Section 18.2) are seeded as specific customers with crafted journeys, guaranteed to demonstrate all pattern types and identity resolution.

---

## 19. Technical Risks

### 19.1 Critical Risks

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| **Identity resolution incorrectly links unrelated customers** | Demo shows wrong data, undermines core value proposition | Medium | Comprehensive unit tests for all matching paths. Conservative probabilistic threshold (0.70). Test with demo scenarios before presenting. |
| **Full pipeline integration failure** | Events enter but don't produce visible journeys/patterns | Medium | Build the pipeline skeleton (processor.ts orchestrating all steps) first. Integration test the full path early. Don't build UI until the pipeline works end-to-end. |
| **Database performance degrades with synthetic data volume** | Demo is slow, dashboard takes too long | Low | Index all query-path columns. Test with full synthetic data load. Keep demo data at hundreds of customers, not millions. |
| **Vercel serverless timeout on batch ingestion** | Batch API returns timeout error | Medium | If batch processing exceeds 10s, switch to Railway (persistent process). Or reduce batch size to 50 events. |

### 19.2 Moderate Risks

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| **Probabilistic matching produces false positives** | Unrelated customers merged, analyst sees incorrect data | Medium | Set conservative threshold (0.70). Require at least 2 matching signals for probabilistic match. Prefer precision over recall. |
| **Synthetic data doesn't look realistic** | Demo feels contrived, judges not convinced | Medium | Generate realistic interaction patterns: browsing → cart → checkout, support tickets with realistic timing, multi-channel transitions that follow real-world patterns. |
| **Pattern detection misses cases or over-detects** | Demo shows wrong pattern counts | Low | Unit test every detector with positive and negative cases. Run full E2E test with demo scenarios. |
| **Next.js build/deployment issues** | Cannot deploy for demo | Low | Test deployment to target platform early (day 1). Have local `next start` as backup. |

### 19.3 Low Risks

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| **Prisma migration conflicts** | Database schema changes break deployment | Low | Run migrations in sequence. Don't modify existing migrations. |
| **Frontend rendering issues** | Timeline or charts don't display correctly | Low | Test with realistic data volumes. Use browser DevTools to debug rendering. |
| **CORS or request issues** | API calls fail from frontend | Low | Configure CORS in Next.js config. Test API calls in browser (not just CLI). |

---

## 20. Final Technical Specification

### The System

JourneyX is a single Next.js 14+ application (TypeScript) backed by PostgreSQL 16, deployed as a monolith. It ingests customer interaction events via REST API, processes them through a synchronous pipeline (validate → normalize → deduplicate → resolve identity → stitch → detect patterns), stores the results in a relational database, and serves an analyst-facing web interface with customer search, profile viewing, journey timeline visualization, pattern detection, and aggregate analytics.

### Technology Stack (Definitive)

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | 20 LTS |
| Framework | Next.js (App Router) | 14+ |
| Language | TypeScript | 5.x (strict mode) |
| UI Components | shadcn/ui | latest |
| Styling | Tailwind CSS | 3.x |
| Charts | Recharts | 2.x |
| Database | PostgreSQL | 16 |
| ORM | Prisma | 5.x |
| Validation | Zod | 3.x |
| Data Fetching | SWR | 2.x |
| Testing | Vitest + React Testing Library | latest |
| Deployment | Vercel (primary) or Railway (fallback) | — |
| Database Hosting | Neon or Supabase or Railway PostgreSQL | — |

### Architecture (Definitive)

Single deployable application. No microservices. No message queues. No external AI/ML services. No WebSockets.

```
Next.js App
├── Frontend (React, Server + Client Components)
├── API Routes (REST, /api/v1/*)
├── Business Logic (lib/pipeline, lib/identity, lib/journey, lib/analytics)
└── Database (PostgreSQL via Prisma)
```

Module boundaries in `lib/` show where decomposition would happen in production. This is documented for the presentation, not implemented.

### What Gets Built (Engineering Scope)

| Component | Implementation |
|---|---|
| **Event ingestion API** | 2 endpoints (single + batch), Zod validation, normalization, deduplication |
| **Identity resolution** | Deterministic matching (indexed SQL on strong identifiers), probabilistic scoring (weighted signals, Jaro-Winkler for names), confidence 0.0–1.0, conflict detection, identifier expansion, explainability records |
| **Journey stitching** | Chronological ordering (DB ORDER BY), on-the-fly sessionization (30-min gap), journey boundaries (24-hour gap), transition detection |
| **Pattern detection** | Drop-off (3 defined processes), escalation (4-tier channel hierarchy, 48-hour window), repeat contact (7-day window), unresolved issue (7-day window), churn signals (4 rule-based evaluators) |
| **Storage** | 7 PostgreSQL tables with indexes for all query paths |
| **API** | 9 REST endpoints for frontend consumption |
| **Frontend** | 6 pages, ~15 components, channel-colored timeline, expandable event cards, analytics charts, search, filtering |
| **Synthetic data** | Seed script generating ~500 customers with ~15,000 events, 2 crafted demo scenarios |
| **Tests** | Unit tests for all lib/ modules, integration test for full pipeline, E2E test for demo scenarios |

### What Does NOT Get Built

No authentication, no authorization, no WebSockets, no message queues, no microservices, no Kafka, no Elasticsearch, no Redis, no Docker, no Kubernetes, no CI/CD pipeline, no external AI APIs, no predictive ML models, no data collection SDKs.

### Single Technical Direction

There is one stack. There is one architecture. There is one deployment target. Every technology in the list has a specific reason for its inclusion. Nothing is optional, aspirational, or "nice to have." Build this.

---

*End of Technical Requirements Document*
