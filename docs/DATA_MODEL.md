# JourneyX — Backend Data Model & Database Schema

**Version:** 1.0
**Date:** 2026-09-19
**Companions:** [PRD v1.0](PRD.md) · [TRD v1.0](TRD.md) · [App Flow v1.0](APP_FLOW.md)
**Hackathon:** BIT N BUILD'26 — Gujarat Round

---

## Table of Contents

1. [Data Model](#1-data-model)
2. [Entity Relationships](#2-entity-relationships)
3. [Database Schema](#3-database-schema)
4. [Identity Model](#4-identity-model)
5. [Event Model](#5-event-model)
6. [Event Lifecycle](#6-event-lifecycle)
7. [Journey Model](#7-journey-model)
8. [Identity Resolution Storage](#8-identity-resolution-storage)
9. [Analytics Data](#9-analytics-data)
10. [Indexing](#10-indexing)
11. [Data Retention](#11-data-retention)
12. [Security](#12-security)
13. [Sample Data](#13-sample-data)
14. [Migrations](#14-migrations)
15. [Final Schema](#15-final-schema)

---

## 1. Data Model

### 1.1 Entity Evaluation

JourneyX is an **Event + Identity + Journey** system. Every entity must earn its place by serving one of three functions: storing customer interactions, resolving fragmented identities, or enabling pattern detection on stitched journeys. Entities that exist only for organizational taxonomy (without query or processing value) are excluded.

| Proposed Entity | Keep? | Reason |
|---|---|---|
| **Customer (Unified Profile)** | **Yes** | The canonical, resolved customer. The anchor for identifiers, events, and patterns. |
| **Customer Identifier** | **Yes** | The edges of the identity graph. Maps fragmented identifiers (email, phone, device_id, etc.) to the canonical customer profile. |
| **Event** | **Yes** | The atomic unit of the system. Every customer interaction is stored as a normalized event. |
| **Resolution Log** | **Yes** | The audit trail for identity decisions. Stores method, confidence, evidence, candidates, and conflicts for every resolution. Makes identity decisions explainable. |
| **Detected Pattern** | **Yes** | Stores the output of pattern detection: drop-offs, escalations, repeat contacts, unresolved issues, churn signals. |
| **Pipeline Metric** | **Yes** | Stores per-stage processing counts and errors for pipeline health monitoring. |
| **Notification** | **Yes** | In-app alerts for identity conflicts, churn risk, escalations. |
| Identity Evidence (separate) | **No — merged into Resolution Log** | Evidence is stored as a JSONB array within `resolution_logs.evidence`. A separate table adds JOINs without query benefit — evidence is always read alongside its resolution log entry, never queried independently. |
| Identity Match (separate) | **No — merged into Resolution Log** | Candidate matches are stored as `resolution_logs.candidates` JSONB. Same reasoning: candidates are never queried without their parent resolution. |
| Channel (entity) | **No** | Channels are a constrained enumeration (`web`, `mobile`, `call_center`, `email`, `chat`, `in_store`), enforced as a CHECK constraint on the `events.channel` column. A lookup table adds a JOIN for zero value — there are exactly 6 channels and they don't change at runtime. |
| Device (entity) | **No** | Device IDs are stored as identifiers in `customer_identifiers`. A device entity would imply we track device metadata (model, OS, browser) — we don't. We only store the opaque device_id string. |
| Session (entity) | **No** | Sessions are computed on-the-fly from event timestamps using a 30-minute inactivity gap. Materializing sessions would create stale data when late events arrive. The computation is O(n) on the customer's event count, which is small (~30 events per customer in the MVP). |
| Journey (entity) | **No** | Same reasoning as Session. Journeys are computed using a 24-hour gap boundary. Materializing would require re-computation on late events. Computed journeys are annotated in the API response, not stored. |
| Journey Stage (entity) | **No** | JourneyX does not define formalized stages (awareness → consideration → purchase). It detects patterns (drop-off, escalation) on raw event sequences. Stages would impose a marketing-funnel model that doesn't match the problem statement's focus on friction detection. |
| Event Type (lookup) | **No** | Event types are free-form strings mapped to a category enum (`browse`, `commerce`, `account`, `support`, `engagement`, `in_store`). A lookup table would require maintenance and wouldn't support arbitrary event types from external systems. |
| Event Attribute (EAV) | **No** | Event attributes are stored as `events.metadata` JSONB. An Entity-Attribute-Value table would explode row count (30 attributes × 15,000 events = 450,000 rows) and make queries slower. JSONB with GIN indexing is the correct approach for semi-structured event data. |
| Issue (entity) | **No** | Issues are detected as `detected_patterns` with `pattern_type = 'unresolved_issue'`. A separate entity adds nothing — the pattern detail JSONB contains the initiation event, timestamps, and window info. |
| Support Interaction (entity) | **No** | Support interactions are events with `event_category = 'support'`. Filtering `WHERE event_category = 'support'` is sufficient. |
| Escalation (entity) | **No** | Escalations are `detected_patterns` with `pattern_type = 'escalation'`. The detail JSONB stores source/destination channels, tiers, and timing. |
| Resolution (entity) | **No** | Resolution logs serve this purpose. |
| Churn Signal (entity) | **No** | Churn signals are `detected_patterns` with `pattern_type = 'churn_signal'`. Risk level and contributing signals are stored in `details` JSONB. The profile-level `churn_risk` column provides fast filtering. |
| Alert (entity) | **No — covered by Notification** | "Alert" and "Notification" would be redundant. The `notifications` table covers all in-app alerts. |
| Analyst/User (entity) | **No** | Hackathon MVP has no authentication. There is one implicit user. Adding a users table would be dead code. |
| Audit Log (entity) | **No — covered by Resolution Log + Pipeline Metrics** | Resolution logs audit identity decisions. Pipeline metrics audit processing. There is no user-initiated action to audit (no auth, no manual merge/split). |

### 1.2 Final Entity Set

Seven entities, no more:

```
┌─────────────────────────┐
│   customer_profiles     │  The canonical, resolved customer
├─────────────────────────┤
│   customer_identifiers  │  Identity graph edges (email, phone, device...)
├─────────────────────────┤
│   events                │  Normalized, resolved customer interactions
├─────────────────────────┤
│   resolution_logs       │  Identity decision audit trail
├─────────────────────────┤
│   detected_patterns     │  Friction patterns (drop-off, escalation, ...)
├─────────────────────────┤
│   pipeline_metrics      │  Processing stage telemetry
├─────────────────────────┤
│   notifications         │  In-app alerts
└─────────────────────────┘
```

---

## 2. Entity Relationships

### 2.1 Relationship Diagram

```
                        ┌──────────────────┐
                        │ pipeline_metrics  │  (standalone — no FK)
                        └──────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  ┌───────────────────┐     1:N      ┌────────────────────────┐       │
│  │ customer_profiles  │─────────────▶│  customer_identifiers  │       │
│  │                    │              └────────────────────────┘       │
│  │  id (PK)           │                                              │
│  │  display_name      │     1:N      ┌────────────────────────┐      │
│  │  churn_risk        │─────────────▶│  events                │      │
│  │  has_drop_off      │              │                        │      │
│  │  has_escalation    │              │  id (PK)               │      │
│  │  ...               │              │  profile_id (FK)       │      │
│  └───────┬────────────┘              └──────┬─────────────────┘      │
│          │                                  │                        │
│          │ 1:N                              │ 1:1                    │
│          │                                  │                        │
│          │     ┌────────────────────┐       │                        │
│          ├────▶│  resolution_logs   │◀──────┘                        │
│          │     │                    │   event_id (FK)                 │
│          │     │  profile_id (FK)   │                                │
│          │     └────────────────────┘                                │
│          │                                                           │
│          │ 1:N  ┌────────────────────┐                               │
│          ├─────▶│  detected_patterns │                               │
│          │      │                    │   event_id (FK, nullable)      │
│          │      │  profile_id (FK)   │───────────▶ events.id          │
│          │      └────────────────────┘                               │
│          │                                                           │
│          │ 1:N  ┌────────────────────┐                               │
│          └─────▶│  notifications     │                               │
│                 │                    │                                │
│                 │  profile_id (FK,   │                                │
│                 │    nullable)       │                                │
│                 └────────────────────┘                                │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.2 Relationship Details

#### 1-to-Many Relationships

| Parent | Child | FK Column | ON DELETE | Cardinality | Why |
|---|---|---|---|---|---|
| `customer_profiles` | `customer_identifiers` | `profile_id` | CASCADE | 1 profile → 1..N identifiers | Every profile has at least one identifier (the one that created it). Identifiers are owned by the profile. |
| `customer_profiles` | `events` | `profile_id` | CASCADE | 1 profile → 1..N events | Every profile has at least one event (the one that created it). Deleting a profile deletes its events. |
| `customer_profiles` | `resolution_logs` | `profile_id` | CASCADE | 1 profile → 1..N logs | Every identity resolution produces a log. Logs are meaningless without the profile. |
| `customer_profiles` | `detected_patterns` | `profile_id` | CASCADE | 1 profile → 0..N patterns | Patterns belong to the profile. A new profile has zero patterns. |
| `customer_profiles` | `notifications` | `profile_id` | SET NULL | 1 profile → 0..N notifications | Most notifications reference a profile. SET NULL (not CASCADE) because deleting a profile shouldn't destroy system alert history. |

#### 1-to-1 Relationships

| Parent | Child | FK Column | ON DELETE | Why |
|---|---|---|---|---|
| `events` | `resolution_logs` | `event_id` | CASCADE | Each event ingestion produces exactly one resolution log entry. The log is meaningless without the event. This is logically 1:1, enforced by application logic (not a UNIQUE constraint on event_id, because the FK column is already indexed and the application inserts exactly one log per event). |

#### Many-to-1 Reference (nullable FK)

| Child | Parent | FK Column | Nullable | Why |
|---|---|---|---|---|
| `detected_patterns` | `events` | `event_id` | Yes | Most patterns reference the triggering event. Churn signals (`pattern_type = 'churn_signal'`) are profile-level and don't reference a specific event, so `event_id` is nullable. ON DELETE SET NULL — if an event were deleted, the pattern detection record remains (the pattern was real). |

#### Standalone (No FK)

| Entity | Why No FK |
|---|---|
| `pipeline_metrics` | Telemetry counters for pipeline stages. They record aggregate counts ("12 events validated this second"), not per-event data. They reference no other entity. They're queried independently for the pipeline health dashboard. |

### 2.3 No Many-to-Many Relationships

There are zero many-to-many relationships in this schema. This is intentional:

- **Profiles ↔ Identifiers:** An identifier belongs to exactly one profile (enforced by `UNIQUE(identifier_type, identifier_value)`). If an identifier matches multiple profiles, that's a conflict — handled by the resolution engine, not by a join table.
- **Events ↔ Patterns:** An event can be referenced by multiple patterns (e.g., one event triggers both a drop-off and a churn signal). This is a 1:N relationship from events to patterns — not M:N — because each pattern references at most one event.
- **Profiles ↔ Channels:** The `channels_used` column is a `TEXT[]` array on the profile, not a join table. This denormalization is justified: channel presence is read-only metadata computed from events, queried for filtering, and never updated independently.

---

## 3. Database Schema

### 3.1 Table: `customer_profiles`

The canonical, resolved customer identity. One row per unified customer.

| Column | Type | Nullable | Default | PK | FK | Index | Description |
|---|---|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | Yes | — | PK (btree, unique) | Unique customer profile identifier. |
| `display_name` | TEXT | Yes | `NULL` | — | — | — | Human-readable name. Populated from the `name` identifier if available. NULL for anonymous profiles. |
| `first_seen_at` | TIMESTAMPTZ | No | — | — | — | — | Timestamp of the customer's earliest event. Set on profile creation. Updated if a late event arrives earlier. |
| `last_seen_at` | TIMESTAMPTZ | No | — | — | — | `idx_profiles_last_seen` (btree) | Timestamp of the customer's most recent event. Updated on every new event. Used for sorting "most recently active." |
| `event_count` | INTEGER | No | `0` | — | — | — | Total events linked to this profile. Denormalized counter updated on event ingestion. Avoids `COUNT(*)` on the events table. |
| `channel_count` | INTEGER | No | `0` | — | — | — | Number of distinct channels used. Derived from `channels_used` array length. |
| `channels_used` | TEXT[] | No | `'{}'` | — | — | `idx_profiles_channels` (GIN) | Array of channel names the customer has interacted with. Denormalized for fast filtering (`@>` array containment). |
| `churn_risk` | TEXT | No | `'none'` | — | — | `idx_profiles_churn` (btree) | Current churn risk level. CHECK constraint: `IN ('high', 'medium', 'low', 'none')`. Updated by churn signal evaluator. |
| `has_drop_off` | BOOLEAN | No | `FALSE` | — | — | — | Whether any drop-off pattern exists. Denormalized flag for fast customer list filtering. |
| `has_escalation` | BOOLEAN | No | `FALSE` | — | — | — | Whether any escalation pattern exists. |
| `has_repeat_contact` | BOOLEAN | No | `FALSE` | — | — | — | Whether any repeat contact pattern exists. |
| `has_unresolved` | BOOLEAN | No | `FALSE` | — | — | — | Whether any unresolved issue pattern exists. |
| `avg_confidence` | REAL | No | `0.0` | — | — | — | Average identity resolution confidence across all events for this profile. Used in the customer list and profile display. |
| `created_at` | TIMESTAMPTZ | No | `NOW()` | — | — | — | Row creation timestamp (when the profile was first created). |
| `updated_at` | TIMESTAMPTZ | No | `NOW()` | — | — | — | Row last-modified timestamp. Updated on every event ingestion or pattern detection. |

**CHECK constraints:**
- `churn_risk IN ('high', 'medium', 'low', 'none')`

**Design rationale for denormalized flags (`has_drop_off`, `has_escalation`, etc.):** The customer list page filters by pattern type. Without these flags, filtering requires a `LEFT JOIN` to `detected_patterns` with `DISTINCT` or a subquery. With 500 customers and ~15,000 events, this would be fast enough — but the denormalized flags make the query a simple `WHERE has_escalation = TRUE`, which is trivial, correct, and free. The flags are updated by the `updateProfileFlags()` function after pattern detection.

---

### 3.2 Table: `customer_identifiers`

Maps fragmented identifiers to the canonical customer profile. Each row is one edge in the identity graph.

| Column | Type | Nullable | Default | PK | FK | Index | Description |
|---|---|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | Yes | — | PK (btree, unique) | Unique identifier for this graph edge. |
| `profile_id` | UUID | No | — | — | `customer_profiles(id)` ON DELETE CASCADE | `idx_identifiers_profile` (btree) | The canonical customer this identifier belongs to. |
| `identifier_type` | TEXT | No | — | — | — | Composite: `idx_identifiers_type_value` (btree) | Type of identifier. CHECK constraint: `IN ('email', 'phone', 'device_id', 'cookie_id', 'loyalty_id', 'name')`. |
| `identifier_value` | TEXT | No | — | — | — | Composite: `idx_identifiers_type_value` (btree) | The identifier value. Normalized: emails lowercased + trimmed, phones digits-only, names trimmed. |
| `source_channel` | TEXT | No | — | — | — | — | The channel from which this identifier was first observed. Useful for understanding where identifiers originate. |
| `confidence` | REAL | No | `1.0` | — | — | — | Confidence of the link between this identifier and the profile. 1.0 for deterministic matches, lower for probabilistic. |
| `first_seen_at` | TIMESTAMPTZ | No | — | — | — | — | When this identifier was first observed for this profile. |
| `created_at` | TIMESTAMPTZ | No | `NOW()` | — | — | — | Row creation timestamp. |

**UNIQUE constraint:** `(identifier_type, identifier_value)` — each identifier value belongs to exactly one profile. If the same email appears on two different profiles, that's an identity conflict handled by the resolution engine, not by allowing duplicate rows.

**Design decision — one identifier, one profile:** This UNIQUE constraint is the backbone of deterministic matching. When the resolution engine queries `WHERE identifier_type = 'email' AND identifier_value = 'a@b.com'`, it gets at most one `profile_id`. If a new event matches two profiles via different strong identifiers, the conflict handler selects the most established profile. It does NOT create a second row for the same `(type, value)` pair.

---

### 3.3 Table: `events`

Every customer interaction, normalized and resolved. The atomic unit of the system.

| Column | Type | Nullable | Default | PK | FK | Index | Description |
|---|---|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | Yes | — | PK (btree, unique) | Unique event identifier. Assigned during normalization. |
| `profile_id` | UUID | No | — | — | `customer_profiles(id)` ON DELETE CASCADE | Composite: `idx_events_profile_time` (btree) | The resolved customer profile. Set by the identity resolution engine. |
| `channel` | TEXT | No | — | — | — | `idx_events_channel` (btree) | Source channel. CHECK constraint: `IN ('web', 'mobile', 'call_center', 'email', 'chat', 'in_store')`. |
| `event_type` | TEXT | No | — | — | — | `idx_events_type` (btree) | Canonical event type (e.g., `page_view`, `checkout_start`, `call_started`). Free-form string, mapped to taxonomy during normalization. |
| `event_category` | TEXT | No | — | — | — | — | Category bucket. CHECK constraint: `IN ('browse', 'commerce', 'account', 'support', 'engagement', 'in_store')`. Used for coarse filtering. |
| `timestamp` | TIMESTAMPTZ | No | — | — | — | Composite: `idx_events_profile_time` (btree), `idx_events_timestamp` (btree) | When the interaction occurred (UTC). The ordering key for the journey timeline. |
| `session_id` | TEXT | Yes | `NULL` | — | — | — | Not stored at ingestion. Reserved for future use or external session IDs. Sessions are computed on-the-fly from event timestamps (30-min gap). |
| `journey_id` | TEXT | Yes | `NULL` | — | — | — | Not stored at ingestion. Reserved for future use. Journeys are computed on-the-fly (24-hour gap). |
| `metadata` | JSONB | No | `'{}'` | — | — | `idx_events_metadata` (GIN) | Semi-structured event-specific data. Contents vary by event type: `page_url`, `product_id`, `amount`, `agent_id`, `duration`, `sentiment`, `disposition`, `error_code`, etc. No fixed schema — JSONB handles the variability. |
| `identifiers` | JSONB | No | `'{}'` | — | — | — | The normalized identifiers that arrived with this event. Stored for audit/replay, not for querying (querying goes through `customer_identifiers`). Structure: `{"email": "a@b.com", "phone": "5551234", ...}`. |
| `resolution_method` | TEXT | Yes | `NULL` | — | — | — | How this event was resolved. CHECK: `IN ('deterministic', 'probabilistic', 'new_profile')`. NULL should not occur in practice (every stored event has been resolved). |
| `resolution_confidence` | REAL | No | `0.0` | — | — | — | Identity resolution confidence for this event. 1.0 for deterministic, 0.70–0.99 for probabilistic, 0.0 for new profile. |
| `dedup_key` | TEXT | No | — | — | — | `idx_events_dedup` (btree) | SHA-256 hash of `channel|event_type|timestamp(minute)|primary_identifier`. Used for idempotent ingestion. |
| `raw_data` | JSONB | Yes | `NULL` | — | — | — | The original raw event payload as received by the API. Stored for debugging and replay. May be NULL if raw storage is disabled. |
| `created_at` | TIMESTAMPTZ | No | `NOW()` | — | — | — | Row creation timestamp (when the event was ingested). |

**CHECK constraints:**
- `channel IN ('web', 'mobile', 'call_center', 'email', 'chat', 'in_store')`
- `event_category IN ('browse', 'commerce', 'account', 'support', 'engagement', 'in_store')`
- `resolution_method IN ('deterministic', 'probabilistic', 'new_profile')`

**Why `metadata` is JSONB, not separate columns:** Event metadata is inherently polymorphic. A `page_view` has `page_url` and `referrer`. A `call_started` has `agent_id`, `duration`, and `disposition`. A `purchase_complete` has `amount`, `currency`, and `product_ids`. Separate columns would require either: (a) a wide table with 30+ nullable columns (most NULL for any given event), or (b) an EAV table (450K rows, terrible query performance). JSONB stores exactly what each event has, queries efficiently with GIN indexes, and doesn't require schema changes when new event types are added.

---

### 3.4 Table: `resolution_logs`

Audit trail for every identity resolution decision. One row per event ingestion.

| Column | Type | Nullable | Default | PK | FK | Index | Description |
|---|---|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | Yes | — | PK (btree, unique) | Unique log entry identifier. |
| `event_id` | UUID | No | — | — | `events(id)` ON DELETE CASCADE | `idx_resolution_event` (btree) | The event that triggered this resolution. |
| `profile_id` | UUID | No | — | — | `customer_profiles(id)` ON DELETE CASCADE | `idx_resolution_profile` (btree) | The profile the event was resolved to. |
| `method` | TEXT | No | — | — | — | — | Resolution method used. CHECK: `IN ('deterministic', 'probabilistic', 'new_profile')`. |
| `confidence` | REAL | No | — | — | — | — | Confidence score. 1.0 for deterministic, 0.0–1.0 for probabilistic, 0.0 for new profile, 0.75 for conflict resolution. |
| `evidence` | JSONB | No | `'[]'` | — | — | — | Array of evidence objects describing what matched and why. See Section 8 for structure. |
| `candidates` | JSONB | Yes | `'[]'` | — | — | — | Array of candidate profiles considered during probabilistic matching. Each entry has `profile_id` and `confidence`. Empty for deterministic matches. |
| `conflict` | BOOLEAN | No | `FALSE` | — | — | — | Whether the resolution encountered an identity conflict (event matched 2+ profiles on different strong identifiers). |
| `conflict_details` | JSONB | Yes | `NULL` | — | — | — | If `conflict = TRUE`: both profile IDs, which identifiers matched each, event counts. NULL otherwise. |
| `created_at` | TIMESTAMPTZ | No | `NOW()` | — | — | — | When the resolution occurred. |

---

### 3.5 Table: `detected_patterns`

Output of the pattern detection engine. Each row is one detected pattern instance.

| Column | Type | Nullable | Default | PK | FK | Index | Description |
|---|---|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | Yes | — | PK (btree, unique) | Unique pattern instance identifier. |
| `profile_id` | UUID | No | — | — | `customer_profiles(id)` ON DELETE CASCADE | `idx_patterns_profile` (btree) | The customer profile this pattern belongs to. |
| `pattern_type` | TEXT | No | — | — | — | `idx_patterns_type` (btree) | Pattern classification. CHECK: `IN ('drop_off', 'escalation', 'repeat_contact', 'unresolved_issue', 'churn_signal')`. |
| `event_id` | UUID | Yes | `NULL` | — | `events(id)` ON DELETE SET NULL | — | The triggering event. NULL for profile-level patterns (churn signals). |
| `details` | JSONB | No | `'{}'` | — | — | — | Pattern-specific detail. Structure varies by `pattern_type`. See examples in Section 13. |
| `detected_at` | TIMESTAMPTZ | No | `NOW()` | — | — | — | When the pattern was detected. |

**Why `event_id` is nullable:** Churn signals are evaluated at the profile level (combining multiple patterns over time). They don't have a single triggering event. All other pattern types reference a specific event.

---

### 3.6 Table: `pipeline_metrics`

Per-stage processing telemetry for the pipeline health dashboard.

| Column | Type | Nullable | Default | PK | FK | Index | Description |
|---|---|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | Yes | — | PK (btree, unique) | Unique metric entry identifier. |
| `stage` | TEXT | No | — | — | — | `idx_metrics_stage` (btree) | Pipeline stage. CHECK: `IN ('ingested', 'validated', 'normalized', 'deduplicated', 'resolved', 'stitched', 'patterns_detected', 'error')`. |
| `channel` | TEXT | Yes | `NULL` | — | — | — | Source channel if applicable. NULL for stage-level aggregate metrics. |
| `count` | INTEGER | No | `1` | — | — | — | Number of events at this stage. Usually 1 (one row per event per stage). |
| `error_message` | TEXT | Yes | `NULL` | — | — | — | Error description if `stage = 'error'`. NULL otherwise. |
| `recorded_at` | TIMESTAMPTZ | No | `NOW()` | — | — | `idx_metrics_time` (btree) | When the metric was recorded. |

---

### 3.7 Table: `notifications`

In-app alerts surfaced to the analyst.

| Column | Type | Nullable | Default | PK | FK | Index | Description |
|---|---|---|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | Yes | — | PK (btree, unique) | Unique notification identifier. |
| `notification_type` | TEXT | No | — | — | — | — | Type key from the notification system (e.g., `identity_conflict`, `churn_risk_high`, `churn_risk_medium`, `escalation`, `repeat_contact`, `high_error_rate`). |
| `severity` | TEXT | No | `'info'` | — | — | — | Severity level. CHECK: `IN ('info', 'warning', 'critical')`. Determines visual treatment in the UI. |
| `title` | TEXT | No | — | — | — | — | Short notification title (e.g., "High Churn Risk Detected"). |
| `message` | TEXT | No | — | — | — | — | Notification body (1–2 sentences with specifics). |
| `profile_id` | UUID | Yes | `NULL` | — | `customer_profiles(id)` ON DELETE SET NULL | — | The customer profile this notification concerns. NULL for system-level notifications (pipeline alerts). |
| `deep_link` | TEXT | Yes | `NULL` | — | — | — | The URL path to navigate to when the notification is clicked (e.g., `/customers/uuid/identity`). |
| `read` | BOOLEAN | No | `FALSE` | — | — | Composite: `idx_notifications_read` (btree) | Whether the analyst has read this notification. |
| `created_at` | TIMESTAMPTZ | No | `NOW()` | — | — | Composite: `idx_notifications_read` (btree) | When the notification was created. |

---

## 4. Identity Model

### 4.1 The Canonical Customer

Every customer in JourneyX is represented by a single `customer_profiles` row — the **canonical identity**. Underneath it, any number of fragmented identifiers point to it via `customer_identifiers`.

```
Canonical Customer (customer_profiles.id = cust_abc)
│
├── email: priya@example.com      [source: web,       confidence: 1.0]
├── phone: 9198765432             [source: call_center, confidence: 1.0]
├── device_id: dev_m0b1le_xyz     [source: mobile,    confidence: 0.85]
├── cookie_id: ck_web_session_42  [source: web,       confidence: 1.0]
├── loyalty_id: LYL-2468          [source: in_store,   confidence: 1.0]
└── name: Priya Sharma            [source: web,       confidence: 1.0]
```

### 4.2 Identifier Types

| Type | Strength | Typical Source | Matching Behavior |
|---|---|---|---|
| `email` | Strong | Web login, account creation, email channel | Deterministic. Exact match (lowercased, trimmed). Two events with the same email are the same person. |
| `phone` | Strong | Call center, account profile, SMS verification | Deterministic. Exact match (digits only). |
| `loyalty_id` | Strong | In-store POS, loyalty program | Deterministic. Exact match. |
| `device_id` | Medium | Mobile app, device fingerprinting | Probabilistic. Signal weight: 0.60. Shared devices (family tablets) can cause false matches. |
| `cookie_id` | Weak | Web browser cookies | Probabilistic. Signal weight: 0.30. Cookies clear, expire, differ between browsers. |
| `name` | Weak | Form submissions, call center agent entry | Probabilistic. Signal weight: 0.20. Jaro-Winkler similarity ≥ 0.85. Names are ambiguous (common names, typos, name changes). |

### 4.3 Confidence Scores

| Method | Confidence | Explanation |
|---|---|---|
| Deterministic match | 1.0 (always) | Strong identifier matched exactly. No ambiguity. |
| Probabilistic match | 0.70 – 1.0 (computed) | `score / max_possible` where score = sum of matched signal weights, max_possible = sum of all signal weights present on the event. |
| Conflict resolution | 0.75 (fixed) | Event matched 2+ profiles. Linked to the most established profile but confidence is reduced to reflect uncertainty. |
| New profile | 0.0 | No match found. Event created a new profile. |

### 4.4 Identity Growth Over Time

A customer profile typically grows through **identifier expansion**:

```
Event 1 (web):     cookie_id=ck_42           → New profile created. Identifiers: {cookie_id}
Event 2 (web):     cookie_id=ck_42, email=a  → Deterministic? No (cookie is weak). Probabilistic on cookie → match.
                                                Identifier expansion: {cookie_id, email}
Event 3 (mobile):  email=a, device_id=d1     → Deterministic on email → match.
                                                Identifier expansion: {cookie_id, email, device_id}
Event 4 (call):    email=a, phone=555        → Deterministic on email → match.
                                                Identifier expansion: {cookie_id, email, device_id, phone}
```

After 4 events across 3 channels, the profile has 4 identifiers. Any future event carrying any of these identifiers will match this profile.

### 4.5 Conflict Handling

When a single event carries identifiers that point to two different profiles:

```
Event: { email: "a@b.com", phone: "555-1234" }
  email → Profile A (15 events)
  phone → Profile B (3 events)
```

**Resolution rule:** Link to the profile with more events (Profile A). Record the conflict. Create a notification. Do NOT auto-merge.

**Why no auto-merge:** The phone could be a shared household number. Auto-merging would combine two genuinely different customers. The cost of a false merge (corrupted journey data for two customers) exceeds the cost of a missed merge (one customer has a slightly incomplete profile until an analyst reviews).

---

## 5. Event Model

### 5.1 Canonical Event Schema

Every event in JourneyX, regardless of source channel, is stored in this canonical form:

```typescript
interface StoredEvent {
  id: string;                    // UUID, assigned during normalization
  profile_id: string;            // UUID, set by identity resolution
  channel: Channel;              // 'web' | 'mobile' | 'call_center' | 'email' | 'chat' | 'in_store'
  event_type: string;            // canonical type (e.g., 'page_view', 'checkout_start')
  event_category: EventCategory; // 'browse' | 'commerce' | 'account' | 'support' | 'engagement' | 'in_store'
  timestamp: Date;               // UTC, parsed from raw input
  session_id: string | null;     // computed on-the-fly, not stored at ingestion
  journey_id: string | null;     // computed on-the-fly, not stored at ingestion
  metadata: Record<string, unknown>; // channel/type-specific key-value pairs
  identifiers: {                 // normalized identifiers from the raw event
    email: string | null;
    phone: string | null;
    device_id: string | null;
    cookie_id: string | null;
    loyalty_id: string | null;
    name: string | null;
  };
  resolution_method: 'deterministic' | 'probabilistic' | 'new_profile';
  resolution_confidence: number; // 0.0–1.0
  dedup_key: string;             // SHA-256 composite key
  raw_data: Record<string, unknown> | null; // original raw payload
  created_at: Date;              // ingestion timestamp
}
```

### 5.2 Field Justification

| Field | Why It Exists |
|---|---|
| `id` | Unique reference for event detail views, pattern references, resolution log FK. |
| `profile_id` | Links event to the resolved customer. The core output of identity resolution. |
| `channel` | Determines channel colors on the timeline, escalation tier, and channel-level analytics. |
| `event_type` | Specific interaction type. Used by pattern detectors (e.g., `checkout_start` triggers drop-off detection). |
| `event_category` | Coarse classification for filtering. Avoids pattern-matching on free-form `event_type` strings when a broad filter is needed. |
| `timestamp` | Chronological ordering of the journey. The backbone of stitching. |
| `session_id` | Computed on-the-fly during timeline queries (30-min gap). Not stored — avoids stale data on late event insertion. |
| `journey_id` | Computed on-the-fly (24-hour gap). Same reasoning as session_id. |
| `metadata` | The payload. Everything channel-specific: URLs, amounts, agent IDs, durations, error codes. JSONB because it's polymorphic. |
| `identifiers` | Audit trail. Which identifiers were on the event when it arrived. Not used for querying (that's `customer_identifiers`). |
| `resolution_method` | How the event was resolved. Displayed in event detail view. Used for analytics (resolution method distribution). |
| `resolution_confidence` | How confident the resolution was. Displayed in event detail. Aggregated for `avg_confidence` on the profile. |
| `dedup_key` | Idempotent ingestion. Same event submitted twice within 5 minutes is caught. |
| `raw_data` | Original payload for debugging. "Why does this event have the wrong metadata?" → check raw_data. |
| `created_at` | When we received the event. Distinct from `timestamp` (when the interaction happened). Useful for pipeline latency monitoring. |

### 5.3 Fields NOT on the Event

| Omitted Field | Why |
|---|---|
| `location` / `geo` | JourneyX detects friction patterns, not geographic patterns. No PRD requirement references location. Adding it would be unused data. |
| `user_agent` | No requirement references browser/device metadata beyond the opaque `device_id`. |
| `ip_address` | PII with no processing purpose. Not used for identity resolution or pattern detection. |
| `processing_status` | Events are processed synchronously within a single API request. There is no async queue, so there is no "pending" or "processing" status. An event is either in the database (success) or not (failure returned to the caller). The `pipeline_metrics` table tracks processing flow. |
| `priority` / `severity` | Events don't have priority. Patterns have severity (via notification severity). |
| `source_system` | Not required by the PRD. The `channel` field is sufficient for MVP. A production system might add `source_system` to distinguish "web" from "web_checkout_widget" vs. "web_main_site." |

### 5.4 Event Type Taxonomy

Events are classified by `event_category`, with `event_type` as the specific type within the category:

| Category | Event Types | Typical Channel |
|---|---|---|
| `browse` | `page_view`, `product_view`, `search`, `navigation` | web, mobile |
| `commerce` | `add_to_cart`, `remove_from_cart`, `checkout_start`, `payment_attempt`, `purchase_complete`, `refund_requested`, `refund_processed` | web, mobile, in_store |
| `account` | `signup`, `login`, `logout`, `profile_update`, `password_reset` | web, mobile |
| `support` | `ticket_created`, `ticket_updated`, `ticket_resolved`, `ticket_closed`, `call_started`, `call_ended`, `chat_started`, `chat_ended`, `email_sent`, `email_received`, `complaint_filed` | call_center, email, chat |
| `engagement` | `email_opened`, `email_clicked`, `notification_viewed`, `survey_response`, `feedback_submitted` | email, mobile |
| `in_store` | `store_visit`, `pos_transaction`, `loyalty_scan`, `appointment_booked` | in_store |

---

## 6. Event Lifecycle

### 6.1 Pipeline Stages

Every event passes through 7 stages in a single synchronous API request. There is no async queue.

```
                     ┌─────────────┐
        POST /api/v1/events        │
                     │             │
                     ▼             │
              ┌─────────────┐     │
         ①    │  INGESTED   │     │
              └──────┬──────┘     │
                     │            │
                     ▼            │
              ┌─────────────┐     │
         ②    │  VALIDATED  │─────┤ ✗ → 400 Bad Request
              └──────┬──────┘     │     pipeline_metrics: stage='error'
                     │            │
                     ▼            │
              ┌─────────────┐     │
         ③    │ NORMALIZED  │─────┤ ✗ → 400 (unparseable timestamp)
              └──────┬──────┘     │     pipeline_metrics: stage='error'
                     │            │
                     ▼            │
              ┌─────────────┐     │
         ④    │DEDUPLICATED │─────┤ dup → 202 { duplicate: true }
              └──────┬──────┘     │     pipeline_metrics: stage='deduplicated'
                     │            │     (no further processing)
                     ▼            │
              ┌─────────────┐     │
         ⑤    │  RESOLVED   │─────┤ ✗ → 500 (database error)
              └──────┬──────┘     │     pipeline_metrics: stage='error'
                     │            │
                     ▼            │
              ┌─────────────┐     │
         ⑥    │  STITCHED   │     │
              └──────┬──────┘     │
                     │            │
                     ▼            │
              ┌──────────────┐    │
         ⑦    │  PATTERNS    │    │
              │  DETECTED    │    │
              └──────┬───────┘    │
                     │            │
                     ▼            │
              ┌─────────────┐     │
              │   STORED    │     │
              │ 202 Accepted│     │
              └─────────────┘     │
                                  │
              ┌─────────────┐     │
              │   ERROR     │◀────┘
              │ 400 or 500  │
              └─────────────┘
```

### 6.2 Stage Details

| # | Stage | Input | Output | Success | Failure |
|---|---|---|---|---|---|
| ① | **Ingested** | Raw HTTP request body | Parsed JSON object | Body is valid JSON with correct Content-Type | Invalid JSON → 400 |
| ② | **Validated** | Parsed JSON | Validated raw event (typed) | All required fields present, types correct, at least one identifier, channel in enum | Missing/invalid fields → 400 with field-level errors |
| ③ | **Normalized** | Validated raw event | Normalized event (UUID assigned, timestamp parsed to UTC, identifiers trimmed/lowercased, event_type mapped to category, dedup_key computed) | Timestamp parseable, not >1h in future | Unparseable timestamp → 400, future timestamp → 400 |
| ④ | **Deduplicated** | Normalized event | Same event (pass-through) or duplicate flag | Dedup key not found in recent events → proceed | Dedup key found → return early with `{duplicate: true}`, skip remaining stages |
| ⑤ | **Resolved** | Normalized event | Event with `profile_id`, `resolution_method`, `resolution_confidence` set. Profile created or updated. Identifiers expanded. Resolution log written. | Identity resolution completes. Profile and event stored. | Database error → 500 (rare) |
| ⑥ | **Stitched** | Resolved event | Profile metadata updated (`event_count`, `last_seen_at`, `channels_used`, etc.) | Profile metadata updated successfully | Database error → 500 (rare, non-fatal if resolution succeeded) |
| ⑦ | **Patterns Detected** | Stitched event + full customer timeline | 0..N `detected_patterns` rows created. Profile flags updated (`has_drop_off`, etc.). Notifications created if warranted. | Pattern detectors complete without error | Individual detector failure → logged, other detectors still run |

### 6.3 Failure States

| Failure | Stage | HTTP Response | Side Effects | Recovery |
|---|---|---|---|---|
| Invalid JSON | ① | 400 | `pipeline_metrics` row with `stage='error'` | Caller fixes JSON and resubmits |
| Schema validation failure | ② | 400 with error details | `pipeline_metrics` error row | Caller fixes event and resubmits |
| Unparseable timestamp | ③ | 400 | `pipeline_metrics` error row | Caller fixes timestamp format |
| Future timestamp (>1h) | ③ | 400 | `pipeline_metrics` error row | Caller fixes clock or timestamp |
| Duplicate event | ④ | 202 with `{duplicate: true}` | `pipeline_metrics` deduplicated row | No action needed — idempotent |
| Database error during resolution | ⑤ | 500 | `pipeline_metrics` error row, partial writes rolled back | Retry. If persistent, check database connectivity |
| Pattern detector error | ⑦ | 202 (event is stored) | Pattern detection skipped for this event. Error logged. | Non-fatal. Patterns can be re-detected by reprocessing the customer's timeline |

### 6.4 Invariants

1. **Atomicity:** Stages ①–⑤ are wrapped in a single database transaction. Either the event is fully stored (event row + profile update + resolution log + identifier expansion) or nothing is written.
2. **Stage ⑥–⑦ are best-effort:** If profile metadata update or pattern detection fails after the event is stored, the event is still committed. Pattern detection can be retried by re-running detectors on the profile.
3. **No partial events:** An event is never in a "partially processed" state in the database. It either exists (fully resolved) or doesn't.
4. **Order matters:** Batch events are processed sequentially. Event N sees the profile state from events 1..N-1. This ensures consistent identity resolution.

---

## 7. Journey Model

### 7.1 Journey Philosophy

JourneyX does NOT store journeys as first-class database entities. Journeys are **computed views** over the ordered event stream. This is a deliberate design choice:

- **Late events change boundaries.** If an event arrives 3 hours late and fills a 24-hour gap between two events, what were two separate journeys become one. If journeys were materialized, every late event could require cascade updates to journey records.
- **Session/journey definitions may change.** During the hackathon, we might adjust the 30-minute session gap or the 24-hour journey boundary. With materialized journeys, that requires reprocessing. With computed journeys, it's a parameter change.
- **Scale is small.** ~30 events per customer. Computing sessions and journeys on the fly for one customer's timeline is O(n) with n ≈ 30. Sub-millisecond.

### 7.2 Journey Creation (Computation)

When the journey timeline is queried (`GET /api/v1/customers/:id/journey`), the response is constructed by:

1. **Fetch events:** `SELECT * FROM events WHERE profile_id = :id ORDER BY timestamp ASC`
2. **Assign sessions:** Walk events chronologically. Start a new session when: (a) the channel changes, or (b) the gap between consecutive events exceeds 30 minutes.
3. **Assign journeys:** Walk events chronologically. Start a new journey when the gap between consecutive events exceeds 24 hours.
4. **Annotate patterns:** Left-join `detected_patterns` on `event_id` to annotate each event with its associated patterns.
5. **Detect transitions:** Mark pairs of consecutive events that have different channels as "channel transitions."
6. **Return:** Enriched event list with session indices, journey indices, pattern annotations, and transition markers.

```typescript
interface JourneyEvent {
  // all StoredEvent fields, plus:
  sessionIndex: number;       // 1-based session number
  journeyIndex: number;       // 1-based journey number
  patterns: DetectedPattern[]; // associated patterns (0..N)
  isTransition: boolean;      // true if this event's channel differs from the previous event's
  transitionFrom?: string;    // previous event's channel (if isTransition)
}
```

### 7.3 Journey Update

There is no "journey update" operation. When a new event is ingested:

1. The event is stored in the `events` table with the correct `profile_id` and `timestamp`.
2. The profile's metadata is updated (`event_count`, `last_seen_at`, `channels_used`).
3. Pattern detection runs against the updated event set.

The next time the journey timeline is queried, the new event appears in the correct chronological position with correct session and journey assignments. No explicit journey update is needed.

### 7.4 Journey Closure

A journey is implicitly "closed" when a 24-hour gap follows the last event. The next event after the gap starts a new journey. This is computed at query time, not tracked in the database.

### 7.5 Multiple Journeys

A single customer can have multiple journeys. Each journey is a contiguous sequence of events with no gap exceeding 24 hours:

```
Journey 1: Sep 1 10:00 (web) → Sep 1 14:00 (mobile) → Sep 1 16:00 (call)
           ── 26-hour gap ──
Journey 2: Sep 2 18:00 (web) → Sep 3 09:00 (email) → Sep 3 11:00 (web)
           ── 48-hour gap ──
Journey 3: Sep 5 10:00 (chat)
```

### 7.6 Journey Health

Journey "health" is not a stored property. It is inferred from detected patterns:

| Indicator | Derived From |
|---|---|
| Contains drop-off | `detected_patterns` with `pattern_type = 'drop_off'` referencing events in this journey's time range |
| Contains escalation | `detected_patterns` with `pattern_type = 'escalation'` |
| Contains repeat contacts | `detected_patterns` with `pattern_type = 'repeat_contact'` |
| Contains unresolved issue | `detected_patterns` with `pattern_type = 'unresolved_issue'` |
| Churn risk | `customer_profiles.churn_risk` (profile-level, not journey-level) |

The journey timeline UI overlays pattern badges on the relevant events. The profile view shows aggregate pattern counts. The dashboard shows platform-wide pattern counts.

---

## 8. Identity Resolution Storage

### 8.1 What Is Stored

Every identity resolution produces a `resolution_logs` entry. This makes every identity decision **explainable** and **auditable**.

### 8.2 Evidence Structure

The `evidence` JSONB column stores an array of evidence objects:

```typescript
interface EvidenceEntry {
  field: string;              // 'email', 'phone', 'device_id', 'cookie_id', 'name', 'temporal_proximity'
  match_type: string;         // 'exact', 'fuzzy', 'temporal', 'none'
  contributing_weight: number | null; // signal weight (null for deterministic where weights don't apply)
  score: number;              // actual score contribution (0 if no match)
  detail: string;             // human-readable explanation
}
```

**Deterministic evidence example:**

```json
[
  {
    "field": "email",
    "match_type": "exact",
    "contributing_weight": null,
    "score": null,
    "detail": "Exact email match on existing profile"
  }
]
```

**Probabilistic evidence example:**

```json
[
  {
    "field": "device_id",
    "match_type": "exact",
    "contributing_weight": 0.60,
    "score": 0.60,
    "detail": "Exact device ID match"
  },
  {
    "field": "name",
    "match_type": "fuzzy",
    "contributing_weight": 0.20,
    "score": 0.18,
    "detail": "Name similarity: 92% (Jaro-Winkler)"
  },
  {
    "field": "cookie_id",
    "match_type": "none",
    "contributing_weight": 0.30,
    "score": 0,
    "detail": "No cookie ID match"
  },
  {
    "field": "temporal_proximity",
    "match_type": "temporal",
    "contributing_weight": 0.10,
    "score": 0.10,
    "detail": "Events within 45 minutes, different channels"
  }
]
```

### 8.3 Candidates Structure

The `candidates` JSONB column stores the scored candidate list (probabilistic only):

```json
[
  { "profile_id": "cust_456", "confidence": 0.82 },
  { "profile_id": "cust_789", "confidence": 0.35 }
]
```

This shows the analyst which other profiles were considered and why the winning profile was chosen.

### 8.4 Conflict Detail Structure

The `conflict_details` JSONB column (when `conflict = true`):

```json
{
  "profiles": [
    {
      "profile_id": "cust_abc",
      "matched_identifier": { "type": "email", "value": "masked" },
      "event_count": 15
    },
    {
      "profile_id": "cust_def",
      "matched_identifier": { "type": "phone", "value": "masked" },
      "event_count": 3
    }
  ],
  "winner": "cust_abc",
  "reason": "More established profile (15 events vs 3 events)"
}
```

### 8.5 Resolution Chain

The identity graph view reconstructs the resolution chain for a customer by querying:

```sql
SELECT rl.*, e.channel, e.event_type, e.timestamp
FROM resolution_logs rl
JOIN events e ON rl.event_id = e.id
WHERE rl.profile_id = :customer_id
ORDER BY e.timestamp ASC;
```

This returns the chronological list of resolution decisions, showing how the profile grew over time: which events expanded the identifier set, which were deterministic vs. probabilistic, and what evidence supported each decision.

### 8.6 Version / Algorithm Tracking

The `resolution_logs` entries implicitly version the algorithm because:

- The `method` field records which path was taken.
- The `evidence` field records signal weights as they were at the time of resolution.
- The `confidence` field records the computed confidence.

For the hackathon MVP, the algorithm doesn't change at runtime, so explicit version tracking is unnecessary. In production, a `resolution_version` TEXT column on `resolution_logs` would track algorithm version (e.g., `"v1.0"`, `"v1.1"`).

---

## 9. Analytics Data

### 9.1 Computation Strategy

All analytics are computed **live from the database** for the hackathon MVP. No materialized views, no caching layer, no precomputation. This is justified by data volume:

| Metric | Query | Estimated Cost (500 customers, 15K events) |
|---|---|---|
| Total customers | `SELECT COUNT(*) FROM customer_profiles` | Trivial (<1ms) |
| Total events | `SELECT COUNT(*) FROM events` | Trivial (<1ms) |
| Identity resolution rate | `SELECT COUNT(*) FILTER (WHERE resolution_method != 'new_profile') / COUNT(*)::float FROM events` | Sequential scan on ~15K rows (<10ms) |
| Average confidence | `SELECT AVG(resolution_confidence) FROM events` | Sequential scan (<10ms) |
| Drop-off count | `SELECT COUNT(*) FROM detected_patterns WHERE pattern_type = 'drop_off'` | Index scan on `idx_patterns_type` (<1ms) |
| Escalation count | Index scan on pattern_type | <1ms |
| Repeat contact rate | Count of profiles with repeat contact / total profiles | <5ms |
| Churn-risk count | `SELECT COUNT(*) FROM customer_profiles WHERE churn_risk IN ('high', 'medium')` | Index scan on `idx_profiles_churn` (<1ms) |
| Events by channel | `SELECT channel, COUNT(*) FROM events GROUP BY channel` | Sequential scan + group by (<10ms) |
| Confidence distribution | Histogram query on `events.resolution_confidence` | Sequential scan (<10ms) |

**Total estimated query time for full analytics summary: <50ms.** No optimization needed.

### 9.2 What Should Be Materialized (Production)

If JourneyX were to handle production-scale data (millions of events), the following metrics should move to materialized views or pre-computed aggregation tables:

| Metric | Why Materialize | Trigger |
|---|---|---|
| Events by channel (per day) | GROUP BY over millions of rows becomes expensive | Refresh on event ingestion (incremental) or on a schedule |
| Resolution method distribution | Same reasoning | Schedule (hourly) |
| Escalation heatmap (channel pair counts) | Complex GROUP BY over detected_patterns JOIN events | Schedule |
| Top friction points | Ranking query over detected_patterns | Schedule |
| Per-customer event counts | Already denormalized on `customer_profiles.event_count` | Updated during stitching |

### 9.3 What Is Already Denormalized

These fields exist on `customer_profiles` as **precomputed caches** updated during event ingestion:

| Field | Computed From | Updated When |
|---|---|---|
| `event_count` | `COUNT(events WHERE profile_id = ?)` | Every event stitching |
| `channel_count` | `LENGTH(channels_used)` | Every event stitching |
| `channels_used` | `DISTINCT channel FROM events WHERE profile_id = ?` | Every event stitching |
| `churn_risk` | Churn signal evaluator output | Every pattern detection pass |
| `has_drop_off` | `EXISTS(detected_patterns WHERE profile_id = ? AND pattern_type = 'drop_off')` | After pattern detection |
| `has_escalation` | Same for escalation | After pattern detection |
| `has_repeat_contact` | Same for repeat_contact | After pattern detection |
| `has_unresolved` | Same for unresolved_issue | After pattern detection |
| `avg_confidence` | `AVG(resolution_confidence) FROM events WHERE profile_id = ?` | Every event resolution |
| `first_seen_at` | `MIN(timestamp) FROM events WHERE profile_id = ?` | Event stitching |
| `last_seen_at` | `MAX(timestamp) FROM events WHERE profile_id = ?` | Event stitching |

This denormalization allows the customer list page to sort and filter without JOINs.

### 9.4 Dashboard Cache Strategy

The dashboard fetches analytics via `GET /api/v1/analytics/summary`. For the MVP:

- **No server-side cache.** Every request re-queries the database.
- **Client-side SWR cache:** 30-second stale-while-revalidate. The dashboard auto-refreshes every 30 seconds, but SWR serves the stale data immediately and refreshes in the background.
- **No Redis, no Memcached, no CDN.** Unnecessary for this data volume.

---

## 10. Indexing

### 10.1 Index Inventory

| Table | Index Name | Columns | Type | Why |
|---|---|---|---|---|
| `customer_profiles` | PK | `id` | btree, unique | Primary key lookup for profile views, FK references. |
| `customer_profiles` | `idx_profiles_last_seen` | `last_seen_at` | btree | Customer list sorted by "most recently active." `ORDER BY last_seen_at DESC LIMIT 20 OFFSET 0`. |
| `customer_profiles` | `idx_profiles_churn` | `churn_risk` | btree | Customer list filtered by churn risk: `WHERE churn_risk IN ('high', 'medium')`. Also used by dashboard KPI: `SELECT COUNT(*) WHERE churn_risk != 'none'`. |
| `customer_profiles` | `idx_profiles_channels` | `channels_used` | GIN | Customer list filtered by channel: `WHERE channels_used @> ARRAY['call_center']`. GIN is required for array containment operators. |
| `customer_identifiers` | PK | `id` | btree, unique | Primary key lookup. |
| `customer_identifiers` | `idx_identifiers_type_value` | `(identifier_type, identifier_value)` | btree | **The most critical index in the system.** Used by the identity resolution engine on every event: `SELECT profile_id WHERE identifier_type = 'email' AND identifier_value = 'a@b.com'`. Also covered by the UNIQUE constraint. |
| `customer_identifiers` | `idx_identifiers_profile` | `profile_id` | btree | Identity graph view: `SELECT * WHERE profile_id = ?`. Retrieves all identifiers for a customer. |
| `events` | PK | `id` | btree, unique | Primary key lookup for event detail views, FK references from resolution_logs and detected_patterns. |
| `events` | `idx_events_profile_time` | `(profile_id, timestamp)` | btree | **The second most critical index.** Journey timeline query: `SELECT * WHERE profile_id = ? ORDER BY timestamp ASC`. The composite index serves both the WHERE and the ORDER BY. |
| `events` | `idx_events_channel` | `channel` | btree | Dashboard "events by channel" chart: `SELECT channel, COUNT(*) GROUP BY channel`. Also used for filtered timeline views. |
| `events` | `idx_events_type` | `event_type` | btree | Pattern detectors filter by event type: `WHERE event_type IN ('checkout_start', 'purchase_complete')`. |
| `events` | `idx_events_dedup` | `dedup_key` | btree | Deduplication check: `SELECT id WHERE dedup_key = ? AND created_at > ?`. Hit on every ingestion. |
| `events` | `idx_events_timestamp` | `timestamp` | btree | Dashboard date-range filtering: `WHERE timestamp BETWEEN ? AND ?`. Also used for analytics queries. |
| `events` | `idx_events_metadata` | `metadata` | GIN | Future-proofing for queries on event metadata (e.g., `WHERE metadata @> '{"error_code": "card_declined"}'`). Not strictly needed for the MVP but costs little to create and unlocks JSONB containment queries. |
| `resolution_logs` | PK | `id` | btree, unique | Primary key lookup. |
| `resolution_logs` | `idx_resolution_profile` | `profile_id` | btree | Identity graph view: `SELECT * WHERE profile_id = ? ORDER BY created_at ASC`. Resolution chain for a customer. |
| `resolution_logs` | `idx_resolution_event` | `event_id` | btree | Event detail view: `SELECT * WHERE event_id = ?`. Resolution evidence for a specific event. |
| `detected_patterns` | PK | `id` | btree, unique | Primary key lookup. |
| `detected_patterns` | `idx_patterns_profile` | `profile_id` | btree | Profile view: `SELECT * WHERE profile_id = ?`. All patterns for a customer. |
| `detected_patterns` | `idx_patterns_type` | `pattern_type` | btree | Dashboard analytics: `SELECT COUNT(*) WHERE pattern_type = 'escalation'`. Also pattern detection dedup: "was this drop-off already detected?" |
| `pipeline_metrics` | PK | `id` | btree, unique | Primary key lookup. |
| `pipeline_metrics` | `idx_metrics_stage` | `stage` | btree | Pipeline health: `SELECT stage, SUM(count) GROUP BY stage`. |
| `pipeline_metrics` | `idx_metrics_time` | `recorded_at` | btree | Time-windowed pipeline queries: `WHERE recorded_at > NOW() - INTERVAL '5 minutes'`. |
| `notifications` | PK | `id` | btree, unique | Primary key lookup. |
| `notifications` | `idx_notifications_read` | `(read, created_at)` | btree | Notification center: `SELECT * WHERE read = FALSE ORDER BY created_at DESC LIMIT 20`. The composite index serves both the filter and the sort. |

### 10.2 Indexes NOT Created

| Candidate Index | Why Omitted |
|---|---|
| `events(profile_id)` alone | Already covered by `idx_events_profile_time`. The composite index on `(profile_id, timestamp)` can be used for queries that only filter on `profile_id`. |
| `events(event_category)` | Category is used for filtering but not at high enough frequency to justify an index. Timeline category filters can use a sequential scan over the profile's events (already filtered by `idx_events_profile_time`). |
| `detected_patterns(event_id)` | Event-to-patterns JOIN is infrequent (only in event detail view). Table is small (<1000 rows in MVP). Sequential scan is fine. |
| `notifications(profile_id)` | Notifications are listed in the global notification center (filtered by `read`), not per-customer. Profile-scoped notification queries don't exist in the current UI. |
| Full-text search index on identifiers | Customer search uses `ILIKE` or the existing `idx_identifiers_type_value` btree. Full-text search (tsvector/GIN) is overkill for the MVP's search patterns — analysts search by exact or prefix matches on known identifier values, not prose. |

---

## 11. Data Retention

### 11.1 Hackathon MVP Policy

For the hackathon, there is no data retention policy. All data is synthetic, the database is small, and the deployment lifetime is days. No data is deleted.

### 11.2 Prototype Policies (Documented for Presentation)

If presenting retention thinking to judges, the following policies represent sensible defaults:

| Data Type | Retention Period | Justification |
|---|---|---|
| **Events** | 90 days (hot) + 1 year (cold/archive) | Events are the core data. 90 days hot covers active journey analysis. Older events move to a read-only archive (separate table or external storage) for compliance. |
| **Customer Profiles** | Indefinite (while active) + 1 year after last event (dormant cleanup) | Profiles are the anchor. A profile with no events in 1 year is likely inactive and can be anonymized or archived. |
| **Customer Identifiers** | Same as parent profile | Identifiers have no independent lifecycle. They're archived or deleted with the profile. |
| **Resolution Logs** | 1 year | Audit trail for identity decisions. Needed for explainability and compliance review. After 1 year, aggregate statistics can replace individual logs. |
| **Detected Patterns** | Same as referencing events | Patterns reference events. When the event is archived, the pattern can be summarized (count per type) and the detail row removed. |
| **Pipeline Metrics** | 30 days | Operational telemetry. Older metrics are useful only for trend analysis, which can be served by aggregate rollups. |
| **Notifications** | 90 days | Read notifications have no ongoing value after 90 days. Unread notifications older than 90 days indicate they were never relevant. |

### 11.3 Retention Implementation (Not Built for MVP)

Retention would be implemented as:

1. A scheduled job (cron) that runs daily.
2. Queries for records older than the retention threshold.
3. Archives to a cold table (e.g., `events_archive`) or deletes.
4. CASCADE rules handle child records automatically.

---

## 12. Security

### 12.1 PII Inventory

| Table | Column | PII Type | Risk |
|---|---|---|---|
| `customer_identifiers` | `identifier_value` (where type = 'email') | Email address | Direct personal identifier |
| `customer_identifiers` | `identifier_value` (where type = 'phone') | Phone number | Direct personal identifier |
| `customer_identifiers` | `identifier_value` (where type = 'name') | Personal name | Direct personal identifier |
| `customer_identifiers` | `identifier_value` (where type = 'loyalty_id') | Loyalty program ID | Indirect identifier (can be linked to a person via the loyalty program) |
| `customer_profiles` | `display_name` | Personal name | Direct personal identifier |
| `events` | `identifiers` (JSONB) | Email, phone, name embedded in event | Direct personal identifier (copy of identifiers at ingestion time) |
| `events` | `metadata` (JSONB) | May contain names, emails, amounts, agent IDs | Contextual PII (depends on what source systems send) |
| `events` | `raw_data` (JSONB) | Original event payload — any PII the source sent | Highest risk — uncontrolled content |
| `resolution_logs` | `evidence` (JSONB) | May reference identifier values | Indirect PII |
| `resolution_logs` | `conflict_details` (JSONB) | Profile IDs (not PII themselves) but references to PII-containing records | Indirect |
| `notifications` | `message` | May contain customer names | Contextual PII |

### 12.2 Hackathon MVP Security Measures

| Measure | Implementation | Status |
|---|---|---|
| **No authentication** | Single-user demo. No login, no RBAC. | Documented as intentional for MVP. |
| **PII masking in logs** | The structured logger never logs raw identifier values. It logs `identifier_type` and a truncated hash. E.g., `email: "sha256:a1b2c3..."` instead of `email: "a@b.com"`. | Implemented in `lib/shared/logger.ts`. |
| **PII masking in API responses** | The `GET /customers/:id/identity` endpoint masks identifier values in the response: `"email": "p***@example.com"`, `"phone": "***-4567"`. Full values are stored but never sent to the frontend unmasked. | Implemented in the API response transformer. |
| **No PII in URLs** | Customer identifiers are never in URL paths or query parameters. Customers are referenced by UUID (`/customers/uuid`), not by email or phone. | Enforced by URL design. |
| **HTTPS in production** | Vercel and Railway enforce HTTPS by default. | Automatic. |
| **Rate limiting** | Basic rate limiting on the ingestion endpoint: 100 requests per minute per IP. Prevents accidental flood from a misconfigured source. | Implemented as middleware. |
| **Input validation** | Zod schema validation on all API inputs. Prevents injection via malformed event data. | Implemented in `lib/pipeline/validator.ts`. |
| **No raw SQL** | All database access goes through Prisma Client (parameterized queries). No SQL injection surface. | Enforced by architecture. |
| **CORS** | API routes set appropriate CORS headers. In production, restrict to known origins. | Default Next.js CORS (same-origin for MVP). |
| **No secrets in client bundle** | Database connection string and any API keys are in environment variables (`.env.local`), never in client-side code. | Standard Next.js practice. |

### 12.3 Production Security Recommendations (Documented for Presentation)

| Measure | What | Priority |
|---|---|---|
| **Hashing stored identifiers** | Store `identifier_value` as a one-way hash (SHA-256 with salt) with a separate encrypted lookup table. Queries use the hash for matching. Display uses the encrypted store for masking. | High |
| **Encryption at rest** | Enable PostgreSQL TDE (Transparent Data Encryption) or use a managed service that encrypts at rest (Neon, Supabase both do this). | High (often free with managed DBs) |
| **Encryption in transit** | TLS 1.3 for all connections (API, database). Already default for managed services. | High (usually automatic) |
| **Tokenization** | Replace PII values with opaque tokens. The token-to-PII mapping lives in a separate, access-controlled vault (e.g., AWS KMS, HashiCorp Vault). | Medium (for compliance-sensitive deployments) |
| **RBAC** | Add a `users` table with roles: `analyst` (read all), `admin` (read + write + pipeline), `viewer` (read only). Enforce via middleware on every API route. | Medium |
| **Audit logging** | Log every API request: who, what, when. Especially for identity-related reads (who viewed which customer's PII). | Medium |
| **Data access logging** | PostgreSQL `pgaudit` extension to log all SELECT queries on PII-containing tables. | Low (for compliance) |

---

## 13. Sample Data

### 13.1 Sample Customer Profile

```json
{
  "id": "cust_priya_001",
  "display_name": "Priya Sharma",
  "first_seen_at": "2026-09-01T10:00:00Z",
  "last_seen_at": "2026-09-04T14:30:00Z",
  "event_count": 12,
  "channel_count": 3,
  "channels_used": ["web", "mobile", "call_center"],
  "churn_risk": "high",
  "has_drop_off": true,
  "has_escalation": true,
  "has_repeat_contact": true,
  "has_unresolved": false,
  "avg_confidence": 0.98,
  "created_at": "2026-09-01T10:00:00Z",
  "updated_at": "2026-09-04T14:30:00Z"
}
```

### 13.2 Sample Fragmented Identifiers

Four identifiers linked to Priya's canonical profile, each from a different channel:

```json
[
  {
    "id": "ident_001",
    "profile_id": "cust_priya_001",
    "identifier_type": "cookie_id",
    "identifier_value": "ck_web_sess_42abc",
    "source_channel": "web",
    "confidence": 1.0,
    "first_seen_at": "2026-09-01T10:00:00Z"
  },
  {
    "id": "ident_002",
    "profile_id": "cust_priya_001",
    "identifier_type": "email",
    "identifier_value": "priya.sharma@example.com",
    "source_channel": "web",
    "confidence": 1.0,
    "first_seen_at": "2026-09-01T10:30:00Z"
  },
  {
    "id": "ident_003",
    "profile_id": "cust_priya_001",
    "identifier_type": "device_id",
    "identifier_value": "dev_m0b1le_priya_xyz",
    "source_channel": "mobile",
    "confidence": 0.85,
    "first_seen_at": "2026-09-01T10:30:00Z"
  },
  {
    "id": "ident_004",
    "profile_id": "cust_priya_001",
    "identifier_type": "phone",
    "identifier_value": "9198765432",
    "source_channel": "call_center",
    "confidence": 1.0,
    "first_seen_at": "2026-09-01T13:00:00Z"
  }
]
```

### 13.3 Sample Events (Priya's Journey)

The 12 events that form Priya's "Frustrated Shopper" journey:

```json
[
  {
    "id": "evt_001",
    "profile_id": "cust_priya_001",
    "channel": "web",
    "event_type": "page_view",
    "event_category": "browse",
    "timestamp": "2026-09-01T10:00:00Z",
    "metadata": { "page_url": "/products/shoes", "referrer": "google.com" },
    "identifiers": { "cookie_id": "ck_web_sess_42abc" },
    "resolution_method": "new_profile",
    "resolution_confidence": 0.0,
    "dedup_key": "sha256:web|page_view|2026-09-01T10:00|ck_web_sess_42abc"
  },
  {
    "id": "evt_002",
    "profile_id": "cust_priya_001",
    "channel": "web",
    "event_type": "product_view",
    "event_category": "browse",
    "timestamp": "2026-09-01T10:05:00Z",
    "metadata": { "product_id": "SKU-1234", "product_name": "Running Shoes Pro", "price": 4999 },
    "identifiers": { "cookie_id": "ck_web_sess_42abc" },
    "resolution_method": "probabilistic",
    "resolution_confidence": 1.0,
    "dedup_key": "sha256:web|product_view|2026-09-01T10:05|ck_web_sess_42abc"
  },
  {
    "id": "evt_003",
    "profile_id": "cust_priya_001",
    "channel": "web",
    "event_type": "add_to_cart",
    "event_category": "commerce",
    "timestamp": "2026-09-01T10:08:00Z",
    "metadata": { "product_id": "SKU-1234", "quantity": 1, "cart_total": 4999 },
    "identifiers": { "cookie_id": "ck_web_sess_42abc" },
    "resolution_method": "probabilistic",
    "resolution_confidence": 1.0,
    "dedup_key": "sha256:web|add_to_cart|2026-09-01T10:08|ck_web_sess_42abc"
  },
  {
    "id": "evt_004",
    "profile_id": "cust_priya_001",
    "channel": "mobile",
    "event_type": "login",
    "event_category": "account",
    "timestamp": "2026-09-01T10:30:00Z",
    "metadata": { "login_method": "email" },
    "identifiers": { "email": "priya.sharma@example.com", "device_id": "dev_m0b1le_priya_xyz" },
    "resolution_method": "probabilistic",
    "resolution_confidence": 0.85,
    "dedup_key": "sha256:mobile|login|2026-09-01T10:30|priya.sharma@example.com"
  },
  {
    "id": "evt_005",
    "profile_id": "cust_priya_001",
    "channel": "web",
    "event_type": "checkout_start",
    "event_category": "commerce",
    "timestamp": "2026-09-01T11:00:00Z",
    "metadata": { "cart_items": 1, "cart_total": 4999 },
    "identifiers": { "cookie_id": "ck_web_sess_42abc", "email": "priya.sharma@example.com" },
    "resolution_method": "deterministic",
    "resolution_confidence": 1.0,
    "dedup_key": "sha256:web|checkout_start|2026-09-01T11:00|priya.sharma@example.com"
  },
  {
    "id": "evt_006",
    "profile_id": "cust_priya_001",
    "channel": "web",
    "event_type": "payment_attempt",
    "event_category": "commerce",
    "timestamp": "2026-09-01T11:05:00Z",
    "metadata": { "payment_method": "credit_card", "amount": 4999, "currency": "INR", "error_code": "card_declined", "error_message": "Insufficient funds" },
    "identifiers": { "cookie_id": "ck_web_sess_42abc", "email": "priya.sharma@example.com" },
    "resolution_method": "deterministic",
    "resolution_confidence": 1.0,
    "dedup_key": "sha256:web|payment_attempt|2026-09-01T11:05|priya.sharma@example.com"
  },
  {
    "id": "evt_007",
    "profile_id": "cust_priya_001",
    "channel": "call_center",
    "event_type": "call_started",
    "event_category": "support",
    "timestamp": "2026-09-01T13:00:00Z",
    "metadata": { "agent_id": "agent_raj_01", "queue_wait_seconds": 120, "category": "payment_issue" },
    "identifiers": { "email": "priya.sharma@example.com", "phone": "9198765432" },
    "resolution_method": "deterministic",
    "resolution_confidence": 1.0,
    "dedup_key": "sha256:call_center|call_started|2026-09-01T13:00|priya.sharma@example.com"
  },
  {
    "id": "evt_008",
    "profile_id": "cust_priya_001",
    "channel": "call_center",
    "event_type": "call_ended",
    "event_category": "support",
    "timestamp": "2026-09-01T13:08:00Z",
    "metadata": { "agent_id": "agent_raj_01", "duration_seconds": 480, "disposition": "pending", "notes": "Customer unable to complete payment. Escalated to billing team." },
    "identifiers": { "email": "priya.sharma@example.com", "phone": "9198765432" },
    "resolution_method": "deterministic",
    "resolution_confidence": 1.0,
    "dedup_key": "sha256:call_center|call_ended|2026-09-01T13:08|priya.sharma@example.com"
  },
  {
    "id": "evt_009",
    "profile_id": "cust_priya_001",
    "channel": "email",
    "event_type": "email_received",
    "event_category": "support",
    "timestamp": "2026-09-02T09:00:00Z",
    "metadata": { "subject": "Re: Payment issue with order", "from": "support@store.com", "body_preview": "We are looking into your payment issue..." },
    "identifiers": { "email": "priya.sharma@example.com" },
    "resolution_method": "deterministic",
    "resolution_confidence": 1.0,
    "dedup_key": "sha256:email|email_received|2026-09-02T09:00|priya.sharma@example.com"
  },
  {
    "id": "evt_010",
    "profile_id": "cust_priya_001",
    "channel": "call_center",
    "event_type": "call_started",
    "event_category": "support",
    "timestamp": "2026-09-04T14:00:00Z",
    "metadata": { "agent_id": "agent_neha_02", "queue_wait_seconds": 180, "category": "payment_issue" },
    "identifiers": { "phone": "9198765432" },
    "resolution_method": "deterministic",
    "resolution_confidence": 1.0,
    "dedup_key": "sha256:call_center|call_started|2026-09-04T14:00|9198765432"
  },
  {
    "id": "evt_011",
    "profile_id": "cust_priya_001",
    "channel": "call_center",
    "event_type": "call_ended",
    "event_category": "support",
    "timestamp": "2026-09-04T14:15:00Z",
    "metadata": { "agent_id": "agent_neha_02", "duration_seconds": 900, "disposition": "unresolved", "notes": "Billing team still investigating. No resolution provided." },
    "identifiers": { "phone": "9198765432" },
    "resolution_method": "deterministic",
    "resolution_confidence": 1.0,
    "dedup_key": "sha256:call_center|call_ended|2026-09-04T14:15|9198765432"
  },
  {
    "id": "evt_012",
    "profile_id": "cust_priya_001",
    "channel": "web",
    "event_type": "page_view",
    "event_category": "browse",
    "timestamp": "2026-09-04T14:30:00Z",
    "metadata": { "page_url": "/account/orders", "session_duration_seconds": 45 },
    "identifiers": { "cookie_id": "ck_web_sess_42abc", "email": "priya.sharma@example.com" },
    "resolution_method": "deterministic",
    "resolution_confidence": 1.0,
    "dedup_key": "sha256:web|page_view|2026-09-04T14:30|priya.sharma@example.com"
  }
]
```

### 13.4 Sample Identity Resolution Logs

**Event 1 — New profile creation (cookie only):**

```json
{
  "id": "res_001",
  "event_id": "evt_001",
  "profile_id": "cust_priya_001",
  "method": "new_profile",
  "confidence": 0.0,
  "evidence": [
    {
      "field": "cookie_id",
      "match_type": "none",
      "contributing_weight": 0.30,
      "score": 0,
      "detail": "No existing profile with this cookie_id. New profile created."
    }
  ],
  "candidates": [],
  "conflict": false,
  "conflict_details": null
}
```

**Event 4 — Probabilistic match (mobile login, cross-channel):**

```json
{
  "id": "res_004",
  "event_id": "evt_004",
  "profile_id": "cust_priya_001",
  "method": "probabilistic",
  "confidence": 0.85,
  "evidence": [
    {
      "field": "device_id",
      "match_type": "none",
      "contributing_weight": 0.60,
      "score": 0,
      "detail": "No existing profile with this device_id"
    },
    {
      "field": "temporal_proximity",
      "match_type": "temporal",
      "contributing_weight": 0.10,
      "score": 0.10,
      "detail": "Events within 30 minutes, different channels (web → mobile)"
    }
  ],
  "candidates": [
    { "profile_id": "cust_priya_001", "confidence": 0.85 }
  ],
  "conflict": false,
  "conflict_details": null
}
```

**Event 7 — Deterministic match with identifier expansion (phone added):**

```json
{
  "id": "res_007",
  "event_id": "evt_007",
  "profile_id": "cust_priya_001",
  "method": "deterministic",
  "confidence": 1.0,
  "evidence": [
    {
      "field": "email",
      "match_type": "exact",
      "contributing_weight": null,
      "score": null,
      "detail": "Exact email match on existing profile"
    }
  ],
  "candidates": [],
  "conflict": false,
  "conflict_details": null
}
```

### 13.5 Sample Detected Patterns

**Drop-off (checkout):**

```json
{
  "id": "pat_001",
  "profile_id": "cust_priya_001",
  "pattern_type": "drop_off",
  "event_id": "evt_006",
  "details": {
    "process": "checkout",
    "initiated_event_id": "evt_005",
    "initiated_at": "2026-09-01T11:00:00Z",
    "last_event_id": "evt_006",
    "last_event_at": "2026-09-01T11:05:00Z",
    "channel": "web",
    "window_expired_at": "2026-09-01T13:00:00Z"
  },
  "detected_at": "2026-09-01T13:00:00Z"
}
```

**Escalation (web → call center):**

```json
{
  "id": "pat_002",
  "profile_id": "cust_priya_001",
  "pattern_type": "escalation",
  "event_id": "evt_007",
  "details": {
    "source_channel": "web",
    "source_tier": 1,
    "source_event_id": "evt_006",
    "destination_channel": "call_center",
    "destination_tier": 3,
    "destination_event_id": "evt_007",
    "tier_increase": 2,
    "time_between_seconds": 6900
  },
  "detected_at": "2026-09-01T13:00:00Z"
}
```

**Repeat contact (2nd call in 7 days):**

```json
{
  "id": "pat_003",
  "profile_id": "cust_priya_001",
  "pattern_type": "repeat_contact",
  "event_id": "evt_010",
  "details": {
    "contact_count": 2,
    "window_days": 7,
    "first_contact_event_id": "evt_007",
    "contacts": [
      { "event_id": "evt_007", "channel": "call_center", "event_type": "call_started", "timestamp": "2026-09-01T13:00:00Z" },
      { "event_id": "evt_010", "channel": "call_center", "event_type": "call_started", "timestamp": "2026-09-04T14:00:00Z" }
    ]
  },
  "detected_at": "2026-09-04T14:00:00Z"
}
```

**Churn signal (high risk):**

```json
{
  "id": "pat_004",
  "profile_id": "cust_priya_001",
  "pattern_type": "churn_signal",
  "event_id": null,
  "details": {
    "churn_risk": "high",
    "signals": [
      {
        "rule": "escalation_abandonment",
        "risk_weight": "high",
        "evidence": "Escalation followed by 15 days of inactivity"
      },
      {
        "rule": "process_abandonment",
        "risk_weight": "medium",
        "evidence": "Drop-off followed by 18 days with no return"
      }
    ]
  },
  "detected_at": "2026-09-19T00:00:00Z"
}
```

### 13.6 Sample Notification

```json
{
  "id": "notif_001",
  "notification_type": "churn_risk_high",
  "severity": "critical",
  "title": "High Churn Risk Detected",
  "message": "Priya Sharma flagged as high churn risk: escalation abandonment + checkout drop-off without return.",
  "profile_id": "cust_priya_001",
  "deep_link": "/customers/cust_priya_001",
  "read": false,
  "created_at": "2026-09-19T00:00:00Z"
}
```

### 13.7 How One Journey Is Represented

Priya Sharma's journey across the database tables:

```
customer_profiles (1 row)
  └── cust_priya_001: "Priya Sharma", 3 channels, 12 events, HIGH churn risk

customer_identifiers (4 rows)
  ├── cookie_id: ck_web_sess_42abc    [web]
  ├── email: priya.sharma@example.com [web]
  ├── device_id: dev_m0b1le_priya_xyz [mobile]
  └── phone: 9198765432               [call_center]

events (12 rows)
  ├── evt_001: web/page_view        Sep 1 10:00  (new_profile)
  ├── evt_002: web/product_view     Sep 1 10:05  (probabilistic, 1.0)
  ├── evt_003: web/add_to_cart      Sep 1 10:08  (probabilistic, 1.0)
  ├── evt_004: mobile/login         Sep 1 10:30  (probabilistic, 0.85)
  ├── evt_005: web/checkout_start   Sep 1 11:00  (deterministic, 1.0)
  ├── evt_006: web/payment_attempt  Sep 1 11:05  (deterministic, 1.0)  ← DROP-OFF
  ├── evt_007: call_center/call     Sep 1 13:00  (deterministic, 1.0)  ← ESCALATION
  ├── evt_008: call_center/call_end Sep 1 13:08  (deterministic, 1.0)
  ├── evt_009: email/received       Sep 2 09:00  (deterministic, 1.0)
  ├── evt_010: call_center/call     Sep 4 14:00  (deterministic, 1.0)  ← REPEAT CONTACT
  ├── evt_011: call_center/call_end Sep 4 14:15  (deterministic, 1.0)
  └── evt_012: web/page_view        Sep 4 14:30  (deterministic, 1.0)

resolution_logs (12 rows — one per event)
  ├── res_001: new_profile,     confidence 0.0
  ├── res_002: probabilistic,   confidence 1.0  (cookie match)
  ├── ...
  └── res_012: deterministic,   confidence 1.0  (email match)

detected_patterns (4 rows)
  ├── pat_001: drop_off (checkout)
  ├── pat_002: escalation (web → call_center, tier 1→3)
  ├── pat_003: repeat_contact (2 calls in 3 days)
  └── pat_004: churn_signal (high — escalation_abandonment + process_abandonment)

notifications (1 row)
  └── notif_001: "High Churn Risk Detected" for Priya Sharma

pipeline_metrics (~84 rows — 12 events × 7 stages)
  └── One row per event per stage (ingested, validated, ..., patterns_detected)
```

**Total database rows for one customer: ~105 rows across 7 tables.**
**Total for 500 customers: ~52,500 rows.** PostgreSQL handles this without breaking a sweat.

---

## 14. Migrations

### 14.1 Migration Order

Prisma manages migrations via `npx prisma migrate dev`. The migration order respects foreign key dependencies:

| Order | Migration | Creates | Depends On |
|---|---|---|---|
| 1 | `001_customer_profiles` | `customer_profiles` table with all columns, CHECK constraints | Nothing |
| 2 | `002_customer_identifiers` | `customer_identifiers` table, FK to profiles, UNIQUE constraint, indexes | `customer_profiles` |
| 3 | `003_events` | `events` table, FK to profiles, CHECK constraints, indexes | `customer_profiles` |
| 4 | `004_resolution_logs` | `resolution_logs` table, FKs to events and profiles, indexes | `customer_profiles`, `events` |
| 5 | `005_detected_patterns` | `detected_patterns` table, FKs to profiles and events, indexes | `customer_profiles`, `events` |
| 6 | `006_pipeline_metrics` | `pipeline_metrics` table (standalone), indexes | Nothing |
| 7 | `007_notifications` | `notifications` table, FK to profiles, indexes | `customer_profiles` |

### 14.2 Migration Principles

1. **Forward-only.** Migrations add tables and columns. Never modify or remove columns in a migration (create a new migration for schema changes).
2. **Idempotent indexes.** Use `CREATE INDEX IF NOT EXISTS` in raw SQL migrations.
3. **Data integrity first.** CHECK constraints and UNIQUE constraints are created in the same migration as the table. They're never added in a later migration (avoids "constraint added to table with violating data" errors).
4. **No seed data in migrations.** Seed data lives in `prisma/seed.ts`, not in migration files.

### 14.3 Prisma Schema Mapping

The Prisma schema file (`prisma/schema.prisma`) maps these SQL tables to Prisma models. Key mappings:

- `TEXT[]` → Prisma `String[]`
- `JSONB` → Prisma `Json`
- `TIMESTAMPTZ` → Prisma `DateTime`
- `REAL` → Prisma `Float`
- `UUID DEFAULT gen_random_uuid()` → Prisma `String @id @default(uuid())`
- CHECK constraints → enforced in application code (Prisma doesn't support CHECK natively; the raw SQL migration adds them)

---

## 15. Final Schema

### 15.1 Complete SQL DDL

This is the definitive, implementable schema. Copy this to create the database.

```sql
-- ============================================================
-- JourneyX Database Schema
-- PostgreSQL 16
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. customer_profiles
-- ============================================================

CREATE TABLE customer_profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name    TEXT,
  first_seen_at   TIMESTAMPTZ NOT NULL,
  last_seen_at    TIMESTAMPTZ NOT NULL,
  event_count     INTEGER NOT NULL DEFAULT 0,
  channel_count   INTEGER NOT NULL DEFAULT 0,
  channels_used   TEXT[] NOT NULL DEFAULT '{}',
  churn_risk      TEXT NOT NULL DEFAULT 'none'
                    CHECK (churn_risk IN ('high', 'medium', 'low', 'none')),
  has_drop_off    BOOLEAN NOT NULL DEFAULT FALSE,
  has_escalation  BOOLEAN NOT NULL DEFAULT FALSE,
  has_repeat_contact BOOLEAN NOT NULL DEFAULT FALSE,
  has_unresolved  BOOLEAN NOT NULL DEFAULT FALSE,
  avg_confidence  REAL NOT NULL DEFAULT 0.0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_last_seen ON customer_profiles(last_seen_at);
CREATE INDEX idx_profiles_churn ON customer_profiles(churn_risk);
CREATE INDEX idx_profiles_channels ON customer_profiles USING GIN(channels_used);

-- ============================================================
-- 2. customer_identifiers
-- ============================================================

CREATE TABLE customer_identifiers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  identifier_type TEXT NOT NULL
                    CHECK (identifier_type IN (
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

-- ============================================================
-- 3. events
-- ============================================================

CREATE TABLE events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  channel         TEXT NOT NULL
                    CHECK (channel IN (
                      'web', 'mobile', 'call_center', 'email', 'chat', 'in_store'
                    )),
  event_type      TEXT NOT NULL,
  event_category  TEXT NOT NULL
                    CHECK (event_category IN (
                      'browse', 'commerce', 'account', 'support', 'engagement', 'in_store'
                    )),
  timestamp       TIMESTAMPTZ NOT NULL,
  session_id      TEXT,
  journey_id      TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}',
  identifiers     JSONB NOT NULL DEFAULT '{}',
  resolution_method TEXT
                    CHECK (resolution_method IN (
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
CREATE INDEX idx_events_metadata ON events USING GIN(metadata);

-- ============================================================
-- 4. resolution_logs
-- ============================================================

CREATE TABLE resolution_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  profile_id      UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  method          TEXT NOT NULL
                    CHECK (method IN (
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

-- ============================================================
-- 5. detected_patterns
-- ============================================================

CREATE TABLE detected_patterns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id      UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  pattern_type    TEXT NOT NULL
                    CHECK (pattern_type IN (
                      'drop_off', 'escalation', 'repeat_contact',
                      'unresolved_issue', 'churn_signal'
                    )),
  event_id        UUID REFERENCES events(id) ON DELETE SET NULL,
  details         JSONB NOT NULL DEFAULT '{}',
  detected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patterns_profile ON detected_patterns(profile_id);
CREATE INDEX idx_patterns_type ON detected_patterns(pattern_type);

-- ============================================================
-- 6. pipeline_metrics
-- ============================================================

CREATE TABLE pipeline_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage           TEXT NOT NULL
                    CHECK (stage IN (
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

-- ============================================================
-- 7. notifications
-- ============================================================

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL,
  severity        TEXT NOT NULL DEFAULT 'info'
                    CHECK (severity IN ('info', 'warning', 'critical')),
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  profile_id      UUID REFERENCES customer_profiles(id) ON DELETE SET NULL,
  deep_link       TEXT,
  read            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_read ON notifications(read, created_at);
```

### 15.2 Schema Statistics

| Metric | Value |
|---|---|
| Tables | 7 |
| Total columns | 68 |
| Primary keys | 7 (one per table) |
| Foreign keys | 7 |
| CHECK constraints | 8 |
| UNIQUE constraints | 1 (`customer_identifiers.identifier_type + identifier_value`) |
| btree indexes | 17 |
| GIN indexes | 2 (`channels_used`, `metadata`) |
| Total indexes | 19 (including PKs) |

### 15.3 Differences from TRD Section 3.2

This schema refines the TRD schema with two additions:

| Addition | Column | Reason |
|---|---|---|
| `notifications.severity` | TEXT with CHECK | The APP_FLOW notification system defines 3 severity levels (info, warning, critical) with distinct visual treatments. The TRD schema omitted this. |
| `notifications.deep_link` | TEXT | Notifications navigate to specific screens when clicked. The deep link URL is stored on the notification. The TRD schema omitted this. |

All other columns, constraints, and indexes are identical to TRD Section 3.2. The two additions are backward-compatible (both have defaults, both are additive).

---

*End of Backend Data Model & Database Schema*
