# JourneyX — Product Requirements Document

**Version:** 1.0
**Date:** 2026-09-19
**Hackathon:** BIT N BUILD'26 — Gujarat Round
**Problem Statement:** PS-4 — Cross-Channel Journey Stitching

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Problem Definition](#2-problem-definition)
3. [Goals](#3-goals)
4. [Non-Goals](#4-non-goals)
5. [Target Personas](#5-target-personas)
6. [Core User Stories](#6-core-user-stories)
7. [Feature Requirements](#7-feature-requirements)
8. [MVP Scope](#8-mvp-scope)
9. [Identity Resolution Requirements](#9-identity-resolution-requirements)
10. [Event Pipeline Requirements](#10-event-pipeline-requirements)
11. [Journey Intelligence](#11-journey-intelligence)
12. [Analytics Requirements](#12-analytics-requirements)
13. [Search & Filtering](#13-search--filtering)
14. [Notifications](#14-notifications)
15. [Functional Requirements](#15-functional-requirements)
16. [Non-Functional Requirements](#16-non-functional-requirements)
17. [Success Metrics](#17-success-metrics)
18. [Demo Requirements](#18-demo-requirements)
19. [Risks](#19-risks)
20. [Final MVP Specification](#20-final-mvp-specification)

---

## 1. Product Overview

### Product Name

**JourneyX**

### Problem Statement

Customer interactions are distributed across multiple channels — mobile apps, websites, call centers, physical locations — and each channel captures its own siloed view. When these interactions remain disconnected, organizations cannot reconstruct the complete customer journey. They cannot see where customers drop off, where escalations occur, which issues remain unresolved, which experiences correlate with churn, or where customers repeatedly contact support. Without a unified view, customer experience teams are blind to the friction their customers actually face.

### Product Vision

Become the single source of truth for understanding how customers move across channels, where they encounter friction, and why they leave.

### Product Mission

Resolve fragmented customer identities, stitch cross-channel events into unified timelines, and surface actionable journey intelligence — drop-offs, escalations, repeat contacts, unresolved issues, and churn signals — so analysts can find and fix the moments that matter.

### One-Line Description

JourneyX resolves customer identities across channels and stitches events into unified journeys that reveal drop-offs, escalations, and churn patterns.

### Elevator Pitch

Every time a customer calls support after a failed mobile checkout, visits a store after an unresolved web complaint, or churns after three escalations — that story is invisible because interactions live in separate systems. JourneyX ingests events from every channel, resolves who the customer is across those channels, stitches interactions into a single timeline, and highlights exactly where journeys break down. Analysts see the complete picture for the first time: which touchpoints cause drop-offs, which issues never get resolved, and which patterns predict churn — all with explainable identity confidence scores so they can trust the data.

### Target Users

**Primary User:** Journey Analyst — the person who investigates customer journeys, identifies friction points, and produces insights for the CX team.

**Secondary Users:**

- **Customer Experience (CX) Manager** — consumes analyst findings to make strategic decisions about channel improvements.
- **Support Operations Manager** — uses escalation and repeat-contact data to improve support workflows.
- **Data/Platform Administrator** — configures event sources, monitors pipeline health, and manages data quality.

### Core Value Proposition

JourneyX transforms fragmented, multi-channel customer interactions into unified, explorable journeys with built-in intelligence that surfaces the exact moments where customer experience breaks down — identity resolution makes this possible, journey intelligence makes it valuable.

---

## 2. Problem Definition

### Current Fragmentation (Fact)

Organizations interact with customers through multiple channels: mobile apps, websites, email, call centers, chat, social media, and physical stores. Each channel typically has its own data system — a mobile analytics platform, a web analytics tool, a CRM for calls, a POS for in-store. These systems capture events independently with no shared customer identifier.

### Identity Fragmentation (Fact)

A single customer may appear as:

- A cookie ID on the website
- A device ID on mobile
- A phone number in the call center
- An email address in the CRM
- A loyalty card number in-store

Without identity resolution, this one customer looks like five different people. The organization has no way to connect their website browse → mobile cart abandonment → support call → store visit into a single story.

### Cross-Channel Data Silos (Fact)

Each channel captures events in its own format:

- Web: page views, clicks, form submissions (with timestamps, session IDs, UTM parameters)
- Mobile: screen views, taps, push notification opens (with device IDs, app versions)
- Call center: call records, IVR selections, agent notes (with phone numbers, call durations, disposition codes)
- Email: opens, clicks, replies (with email addresses, campaign IDs)
- In-store: POS transactions, loyalty scans (with loyalty IDs, store locations)

These events have different schemas, different timestamp formats, different identifier types, and different levels of detail. Raw cross-channel analysis is impractical without normalization.

### Customer Journey Blind Spots (Fact)

When interactions cannot be linked, the organization cannot answer:

- Did the customer who abandoned checkout on mobile later complete the purchase in-store?
- Did the customer who filed a web complaint call support about the same issue?
- How many touchpoints did the customer have before churning?
- What was the sequence of events leading to an escalation?

These are not hypothetical questions — they are the daily questions that CX teams cannot answer with siloed data.

### Escalation Detection Problems (Fact)

Escalations — when a customer's issue moves from a lower-tier channel (self-service, chatbot) to a higher-tier channel (live agent, manager, store visit) — are invisible when channels are disconnected. An organization may see that call center volume increased but cannot determine that those calls were triggered by failures in the mobile app's self-service flow.

### Churn Visibility Problems (Fact)

Customer churn is the outcome of a journey, not a single event. Without stitched journeys, organizations can observe that a customer left but cannot reconstruct the sequence of interactions that led to that decision. They cannot identify patterns — such as "customers who experience 3+ unresolved support contacts within 30 days churn at a significantly higher rate" — because those contacts may span multiple channels.

### Assumptions

The following are assumptions, not verified facts:

- Organizations have the technical ability to export event data from their existing channel systems.
- Event data from different channels can be meaningfully connected through shared or linkable identifiers (email, phone, loyalty ID, etc.).
- The volume and variety of events in a hackathon demo can be meaningfully represented with synthetic data.
- Analysts will investigate individual customer journeys, not just aggregate dashboards.
- Identity resolution with confidence scoring is more valuable than binary match/no-match.

---

## 3. Goals

### Primary Goals

1. **Resolve identities across channels** — given events from multiple channels with different identifiers, determine which events belong to the same customer, with a confidence score.
2. **Stitch events into unified journeys** — combine resolved events into a single, chronologically ordered timeline per customer.
3. **Surface journey intelligence** — automatically detect and highlight drop-offs, escalations, repeat contacts, unresolved issues, and churn-correlated patterns.
4. **Enable analyst investigation** — provide an interface where analysts can search for customers, explore their stitched journeys, and understand why specific patterns were flagged.

### Secondary Goals

5. **Explain identity decisions** — show analysts why two identifiers were linked (which fields matched, what confidence level, what evidence).
6. **Support filtering and segmentation** — allow analysts to filter journeys by channel, event type, risk level, date range, and detected patterns.
7. **Provide aggregate analytics** — display KPIs such as drop-off rates by channel, escalation frequency, repeat contact rates, and churn-correlated pattern counts.

### Technical Goals

8. **Implement a functional event ingestion pipeline** — accept raw events, validate, normalize, deduplicate, resolve identity, stitch, and update journeys.
9. **Implement deterministic + probabilistic identity resolution** — use exact matching on strong identifiers and probabilistic matching on weaker signals, with explainable confidence.
10. **Demonstrate data pipeline completeness** — show the full path from raw event to unified journey to intelligence output.

### Demo Goals

11. **Tell a compelling customer story** — the demo should follow one customer across multiple channels, showing how JourneyX reveals their complete journey and surfaces problems that were invisible in siloed data.
12. **Show identity resolution in action** — demonstrate how fragmented identifiers are linked, with confidence scores and explainability.
13. **Show journey intelligence** — demonstrate detection of at least one drop-off, one escalation, one repeat contact, and one churn signal.

### Hackathon Judging Goals

14. **Demonstrate technical depth** — the identity resolution algorithm, event pipeline, and journey intelligence should reflect genuine engineering, not superficial wrappers.
15. **Demonstrate product thinking** — the UI should be purposeful, the features should solve real problems, and the system should be coherent.
16. **Demonstrate completeness** — end-to-end flow from raw event ingestion to analyst-facing insights.

---

## 4. Non-Goals

JourneyX will NOT build:

| Category | Explicitly Excluded | Rationale |
|---|---|---|
| CRM | Contact management, deal tracking, sales pipeline | JourneyX analyzes journeys, it does not manage customer relationships. |
| Billing / Payments | Subscription management, invoicing, payment processing | No billing functionality exists in the problem statement. |
| Marketing Automation | Campaign creation, email sending, audience segmentation for marketing | JourneyX observes journey data; it does not generate marketing actions. |
| Full Enterprise CDP | Real-time profile unification at production scale, data warehousing, reverse ETL | A hackathon MVP demonstrates the concept; it is not a production CDP. |
| Production Infrastructure | Kafka clusters, distributed stream processing, multi-region deployment | Simulated or in-process pipelines are sufficient for the demo. |
| AI Chatbot | Conversational AI, natural language query interface | Not required by the problem statement. Adding one would be superficial. |
| Real-Time Alerting | PagerDuty-style alerting, on-call routing, incident management | Notifications are scoped to in-app indicators, not external alert systems. |
| Data Collection SDKs | JavaScript tracking SDK, mobile SDK, server-side SDK | JourneyX ingests events that have already been collected. |
| User Authentication System | OAuth, SSO, multi-tenant user management | A hackathon MVP does not require production auth. |
| A/B Testing | Experiment management, variant assignment, statistical significance | Out of scope for the problem statement. |

---

## 5. Target Personas

### Persona 1: Journey Analyst

| Attribute | Detail |
|---|---|
| **Role** | Journey Analyst on the Customer Experience team |
| **Responsibility** | Investigate customer journeys, identify friction points, produce insights and reports for CX leadership |
| **Goals** | Find the root cause of customer drop-offs and escalations; identify which channel transitions cause the most friction; quantify churn-related patterns with data, not intuition |
| **Pain Points** | Currently must manually correlate data from 3-5 separate systems; cannot confirm whether a web visitor and a phone caller are the same person; spends 60%+ of investigation time on data wrangling instead of analysis; cannot prove patterns without unified data |
| **Needs** | A single view of a customer's journey across all channels; the ability to search by any identifier; timeline visualization with channel context; automated detection of friction points |
| **JourneyX Usage** | Primary daily user. Searches for customers, explores timelines, investigates flagged patterns, filters by channel/date/issue type, drills into identity resolution details to assess data confidence. |

### Persona 2: Customer Experience Manager

| Attribute | Detail |
|---|---|
| **Role** | CX Manager overseeing customer experience strategy |
| **Responsibility** | Set CX improvement priorities, track CX health metrics, report to leadership |
| **Goals** | Understand which journey patterns correlate with churn; prioritize channel improvements based on data; demonstrate CX ROI to leadership |
| **Pain Points** | Relies on anecdotal evidence from support teams; cannot quantify cross-channel friction; improvement priorities are based on loudest complaints rather than data |
| **Needs** | Aggregate analytics showing drop-off rates, escalation frequencies, and churn patterns; the ability to filter by time period, channel, and customer segment |
| **JourneyX Usage** | Weekly user. Reviews analytics dashboard, examines aggregate metrics, identifies trends in drop-offs and escalations, uses insights to prioritize team initiatives. |

### Persona 3: Support Operations Manager

| Attribute | Detail |
|---|---|
| **Role** | Manager of the customer support team |
| **Responsibility** | Optimize support workflows, reduce repeat contacts, improve first-contact resolution |
| **Goals** | Identify which issues generate repeat contacts; understand which self-service failures lead to agent calls; reduce escalation rates |
| **Pain Points** | Sees call volume increasing but cannot trace calls back to upstream channel failures; cannot identify which customers have already tried self-service before calling; repeat contact data is fragmented across ticketing systems |
| **Needs** | Visibility into the events that preceded a support contact; detection of repeat contacts about the same issue; escalation pattern analysis |
| **JourneyX Usage** | Weekly user. Reviews repeat contact and escalation reports, investigates specific customer journeys to understand support patterns, uses data to improve support routing and self-service flows. |

### Persona 4: Data/Platform Administrator

| Attribute | Detail |
|---|---|
| **Role** | Data Engineer or Platform Administrator responsible for the JourneyX deployment |
| **Responsibility** | Configure event sources, monitor pipeline health, manage data quality, troubleshoot ingestion issues |
| **Goals** | Ensure events flow correctly from all channels; maintain identity resolution accuracy; monitor system performance |
| **Pain Points** | New data sources require custom integration; data quality issues silently degrade identity resolution; pipeline failures are hard to diagnose |
| **Needs** | Event source configuration; pipeline health monitoring; data quality indicators; ingestion error logs |
| **JourneyX Usage** | As-needed user. Configures event sources, monitors pipeline health dashboard, investigates data quality issues, reviews identity resolution accuracy metrics. |

---

## 6. Core User Stories

### Event Ingestion

**US-001:** As a Data Administrator, I want to ingest raw customer events from multiple channels via API, so that all interaction data enters the platform for processing.

**US-002:** As a Data Administrator, I want ingested events to be validated against a schema, so that malformed events are rejected with clear error messages rather than silently corrupting downstream data.

**US-003:** As a Data Administrator, I want to see the status of recent event ingestion (success count, error count, error details), so that I can monitor data flow health.

### Identity Resolution

**US-004:** As a Journey Analyst, I want the system to automatically resolve which events belong to the same customer — even when events use different identifiers across channels — so that I can see a complete customer journey without manual correlation.

**US-005:** As a Journey Analyst, I want each identity resolution to include a confidence score, so that I can assess how reliable the customer-event linkage is.

**US-006:** As a Journey Analyst, I want to see why two identifiers were linked (which fields matched, deterministic vs. probabilistic, evidence), so that I can explain and trust the identity resolution.

**US-007:** As a Journey Analyst, I want to see when identity resolution has low confidence or conflicts, so that I can investigate potential mismatches before drawing conclusions.

### Customer Search

**US-008:** As a Journey Analyst, I want to search for a customer by any known identifier (email, phone, device ID, loyalty ID, name), so that I can quickly find the customer I'm investigating.

**US-009:** As a Journey Analyst, I want search results to show the unified customer profile with all linked identifiers, so that I can confirm I've found the right person.

### Journey Reconstruction

**US-010:** As a Journey Analyst, I want to see a customer's complete journey as a chronological timeline of events across all channels, so that I can understand the full sequence of interactions.

**US-011:** As a Journey Analyst, I want each event in the timeline to show its channel, event type, timestamp, and key details, so that I can understand what happened at each touchpoint.

**US-012:** As a Journey Analyst, I want the timeline to visually distinguish between channels (color-coding or icons), so that I can quickly see channel transitions.

### Escalation Detection

**US-013:** As a Journey Analyst, I want the system to automatically detect escalations — when a customer moves from a lower-effort channel (web self-service) to a higher-effort channel (call center, manager) — so that I can identify where self-service fails.

**US-014:** As a Support Operations Manager, I want to see aggregate escalation data (frequency, common source channels, common triggers), so that I can prioritize self-service improvements.

### Repeat Contact Detection

**US-015:** As a Support Operations Manager, I want the system to detect when a customer contacts support multiple times about the same or related issue, so that I can identify unresolved problems.

**US-016:** As a Journey Analyst, I want repeat contacts to be highlighted in the journey timeline, so that I can see the pattern within the full journey context.

### Drop-Off Detection

**US-017:** As a Journey Analyst, I want the system to identify drop-off points — where a customer started a process (checkout, application, onboarding) but did not complete it — so that I can quantify conversion failures.

**US-018:** As a CX Manager, I want to see aggregate drop-off rates by channel and by process, so that I can prioritize which flows to fix.

### Churn Signals

**US-019:** As a CX Manager, I want the system to identify journey patterns that correlate with churn (e.g., multiple unresolved contacts, repeated escalations, prolonged inactivity after negative interactions), so that I can understand what drives customer loss.

**US-020:** As a Journey Analyst, I want customers with churn-correlated patterns to be flagged, so that I can investigate their journeys proactively.

### Analytics

**US-021:** As a CX Manager, I want an analytics dashboard showing key metrics — total customers, events processed, identity resolution rate, drop-off count, escalation count, repeat contact count, churn-risk count — so that I can monitor CX health at a glance.

**US-022:** As a Journey Analyst, I want to filter analytics by date range, channel, and event type, so that I can focus on specific segments.

### Filtering & Investigation

**US-023:** As a Journey Analyst, I want to filter the customer list by detected patterns (has drop-off, has escalation, has repeat contact, has churn signal), so that I can investigate specific cohorts.

**US-024:** As a Journey Analyst, I want to filter events within a journey by channel and event type, so that I can focus on relevant interactions during an investigation.

### Data Management

**US-025:** As a Data Administrator, I want to view pipeline health metrics (events ingested, events processed, events failed, processing latency), so that I can ensure the system is operating correctly.

**US-026:** As a Data Administrator, I want to view identity resolution statistics (total unified profiles, average confidence, merge count, conflict count), so that I can monitor resolution quality.

---

## 7. Feature Requirements

### F-01: Event Ingestion API

| Attribute | Detail |
|---|---|
| **Feature Name** | Event Ingestion API |
| **User** | Data Administrator |
| **Problem Solved** | Raw customer events from multiple channels need a single entry point into the platform. |
| **Description** | REST API endpoint that accepts single events or batches of events from any channel. Each event includes a channel identifier, event type, timestamp, customer identifiers (one or more), and event-specific metadata. |
| **Inputs** | JSON payload: `{ channel, event_type, timestamp, identifiers: { email?, phone?, device_id?, loyalty_id?, cookie_id? }, metadata: { ... } }` |
| **Processing** | Schema validation → field type checking → required field verification → timestamp normalization → acknowledgment. |
| **Outputs** | HTTP 202 Accepted with event ID on success; HTTP 400 with validation errors on failure. |
| **UI Requirements** | None (API-only). Pipeline health dashboard shows ingestion metrics. |
| **Backend Requirements** | POST `/api/v1/events` (single), POST `/api/v1/events/batch` (batch up to 100). Validation middleware. Event queue/buffer for downstream processing. |
| **Acceptance Criteria** | (1) Valid events return 202 and appear in the pipeline. (2) Invalid events return 400 with specific error messages. (3) Batch endpoint processes up to 100 events. (4) Events missing required fields are rejected. |
| **Priority** | **P0** |

### F-02: Event Normalization

| Attribute | Detail |
|---|---|
| **Feature Name** | Event Normalization |
| **User** | System (internal pipeline) |
| **Problem Solved** | Events from different channels have different schemas, timestamp formats, and field names. They must be normalized into a common format for stitching. |
| **Description** | Pipeline step that transforms raw events into a canonical event format: unified timestamp (ISO 8601 UTC), normalized event type taxonomy, standardized identifier formats (lowercase email, E.164 phone), and structured metadata. |
| **Inputs** | Raw validated event from ingestion. |
| **Processing** | Timestamp parsing and UTC conversion → event type mapping to canonical taxonomy → identifier format normalization → metadata extraction into standard fields. |
| **Outputs** | Normalized event in canonical format. |
| **UI Requirements** | None directly. Timeline displays use normalized event types and timestamps. |
| **Backend Requirements** | Channel-specific normalization rules. Canonical event type taxonomy. Identifier format normalizers. |
| **Acceptance Criteria** | (1) Events from all supported channels produce the same canonical format. (2) Timestamps are correctly converted to UTC. (3) Email addresses are lowercased. (4) Phone numbers are normalized to a consistent format. (5) Event types map to the canonical taxonomy. |
| **Priority** | **P0** |

### F-03: Event Deduplication

| Attribute | Detail |
|---|---|
| **Feature Name** | Event Deduplication |
| **User** | System (internal pipeline) |
| **Problem Solved** | The same event may be sent multiple times (retry, duplicate export). Duplicate events would create false repeat contacts and inflate metrics. |
| **Description** | Detect and suppress duplicate events based on a composite key (channel + event type + timestamp + primary identifier). Events matching an existing composite key within a time window are flagged as duplicates and excluded from downstream processing. |
| **Inputs** | Normalized event. |
| **Processing** | Generate composite deduplication key → check against recent event index → if duplicate, mark and skip → if unique, pass downstream. |
| **Outputs** | Unique event passed to identity resolution, or duplicate event logged and suppressed. |
| **UI Requirements** | Pipeline health dashboard shows duplicate count. |
| **Backend Requirements** | Deduplication index (in-memory or database). Configurable time window. Duplicate event log. |
| **Acceptance Criteria** | (1) Identical events submitted within the time window are deduplicated. (2) Similar but distinct events are not falsely deduplicated. (3) Duplicate count is tracked in pipeline metrics. |
| **Priority** | **P0** |

### F-04: Identity Resolution Engine

| Attribute | Detail |
|---|---|
| **Feature Name** | Identity Resolution Engine |
| **User** | System (internal pipeline), Journey Analyst (views results) |
| **Problem Solved** | The same customer appears with different identifiers across channels. Without resolution, their journey is fragmented across multiple unlinked profiles. |
| **Description** | Two-phase identity resolution. **Phase 1 — Deterministic:** exact match on strong identifiers (email, phone, loyalty ID). If any identifier on the incoming event exactly matches an existing profile, link the event to that profile. **Phase 2 — Probabilistic:** when no deterministic match is found, score similarity based on weaker signals (name similarity, behavioral patterns, temporal proximity). Link if confidence exceeds a threshold. Each resolution produces a confidence score (0.0–1.0) and an explanation of which fields contributed. |
| **Inputs** | Normalized event with one or more identifiers. |
| **Processing** | Extract identifiers → search existing profiles for deterministic match → if found, link with high confidence → if not, run probabilistic scoring → if confidence > threshold, link → if below threshold, create new profile → record resolution evidence. |
| **Outputs** | Unified customer profile ID, confidence score, resolution method (deterministic/probabilistic), evidence (which fields matched). |
| **UI Requirements** | Customer profile view shows linked identifiers with confidence. Identity resolution detail panel shows match evidence. |
| **Backend Requirements** | Profile identity graph (customer → identifiers mapping). Deterministic matching on indexed identifier fields. Probabilistic scoring function. Confidence threshold configuration. Resolution audit log. |
| **Acceptance Criteria** | (1) Events with matching email are linked deterministically with confidence ≥ 0.95. (2) Events with matching phone are linked deterministically with confidence ≥ 0.95. (3) Events with no exact match but similar signals are scored probabilistically. (4) Each resolution includes method, confidence, and evidence. (5) Low-confidence resolutions are flagged. |
| **Priority** | **P0** |

### F-05: Journey Stitching

| Attribute | Detail |
|---|---|
| **Feature Name** | Journey Stitching |
| **User** | System (internal pipeline) |
| **Problem Solved** | After identity resolution, events are linked to a profile but not yet organized into a coherent journey. Stitching orders events chronologically and detects session and journey boundaries. |
| **Description** | Append resolved events to the customer's journey timeline in chronological order. Detect session boundaries (gap > 30 minutes within same channel) and journey boundaries (gap > 24 hours across all channels). Tag each event with session and journey context. |
| **Inputs** | Resolved event with unified customer profile ID. |
| **Processing** | Retrieve customer's existing timeline → insert event in chronological position → detect session boundary → detect journey boundary → update journey metadata (channel count, event count, duration). |
| **Outputs** | Updated customer journey with the new event stitched in. |
| **UI Requirements** | None directly. Journey timeline view consumes stitched data. |
| **Backend Requirements** | Customer journey data structure (ordered event list with session/journey markers). Session boundary detection (configurable gap threshold). Journey boundary detection. |
| **Acceptance Criteria** | (1) Events are ordered chronologically regardless of ingestion order. (2) Session boundaries are detected at channel-specific gaps. (3) Journey boundaries are detected at cross-channel gaps. (4) Journey metadata (channel count, event count, duration) is updated. |
| **Priority** | **P0** |

### F-06: Journey Timeline View

| Attribute | Detail |
|---|---|
| **Feature Name** | Journey Timeline View |
| **User** | Journey Analyst |
| **Problem Solved** | Analysts need to see the complete customer journey visually to understand the sequence of interactions, channel transitions, and where problems occurred. |
| **Description** | Vertical timeline visualization showing all events for a customer in chronological order. Each event shows: channel (with color and icon), event type, timestamp, key metadata summary. Channel transitions are visually emphasized. Detected patterns (drop-off, escalation, repeat contact) are highlighted with annotations. |
| **Inputs** | Customer profile ID (from search or customer list). |
| **Processing** | Fetch stitched journey → render timeline → apply pattern highlights → render annotations. |
| **Outputs** | Interactive timeline with expandable event details and pattern annotations. |
| **UI Requirements** | Vertical timeline layout. Channel-specific colors and icons. Expandable event detail cards. Pattern highlight badges (drop-off, escalation, repeat contact, churn signal). Session/journey boundary markers. Scroll with lazy loading for long journeys. |
| **Backend Requirements** | GET `/api/v1/customers/:id/journey` returning ordered events with pattern annotations. |
| **Acceptance Criteria** | (1) Timeline shows events in correct chronological order. (2) Each event displays channel, type, time, and summary. (3) Channel transitions are visually distinct. (4) Detected patterns are highlighted. (5) Event detail is expandable. |
| **Priority** | **P0** |

### F-07: Customer Search

| Attribute | Detail |
|---|---|
| **Feature Name** | Customer Search |
| **User** | Journey Analyst |
| **Problem Solved** | Analysts need to find specific customers to investigate their journeys. Customers may be known by any of their identifiers (email, phone, name, loyalty ID, etc.). |
| **Description** | Search bar that accepts any identifier or partial identifier. Returns matching unified customer profiles with their linked identifiers, event count, channel count, and any active flags (escalation, churn risk). |
| **Inputs** | Search query (text string). |
| **Processing** | Search across all identifier fields (email, phone, name, loyalty ID, device ID, cookie ID) → rank by match quality → return unified profiles. |
| **Outputs** | List of matching customer profiles with summary information. |
| **UI Requirements** | Persistent search bar in the top navigation. Results dropdown with profile summary cards. Click-through to customer journey view. |
| **Backend Requirements** | GET `/api/v1/customers/search?q=<query>`. Search index across all identifier types. Partial match support. |
| **Acceptance Criteria** | (1) Searching by exact email returns the correct profile. (2) Searching by phone number returns the correct profile. (3) Searching by name returns matching profiles. (4) Partial matches are supported. (5) Results include linked identifier count and event count. |
| **Priority** | **P0** |

### F-08: Customer Profile View

| Attribute | Detail |
|---|---|
| **Feature Name** | Customer Profile View |
| **User** | Journey Analyst |
| **Problem Solved** | Before diving into a journey timeline, analysts need a summary of who the customer is, how they were identified, and what patterns have been detected. |
| **Description** | Profile page showing: all linked identifiers with source channel, identity resolution confidence, journey summary statistics (total events, channels used, first/last interaction, active duration), detected patterns summary, and risk indicators. |
| **Inputs** | Customer profile ID. |
| **Processing** | Fetch unified profile → fetch journey statistics → fetch detected patterns → render. |
| **Outputs** | Profile summary page with navigation to timeline and pattern details. |
| **UI Requirements** | Identity card showing all identifiers grouped by type. Confidence score indicator. Journey statistics summary. Pattern badges with counts. Link to full timeline. |
| **Backend Requirements** | GET `/api/v1/customers/:id` returning profile, statistics, and pattern summary. |
| **Acceptance Criteria** | (1) All linked identifiers are displayed with their source channel. (2) Identity resolution confidence is visible. (3) Journey statistics are accurate. (4) Detected patterns are summarized. |
| **Priority** | **P0** |

### F-09: Drop-Off Detection

| Attribute | Detail |
|---|---|
| **Feature Name** | Drop-Off Detection |
| **User** | Journey Analyst, CX Manager |
| **Problem Solved** | Customers abandon processes (checkout, onboarding, applications) partway through. Without detection, these abandonment points are invisible. |
| **Description** | Detect when a customer initiates a multi-step process but does not complete it within a defined time window. Defined processes include: checkout (cart → payment → confirmation), onboarding (signup → profile → first action), and support resolution (ticket open → resolution). Drop-offs are annotated on the journey timeline and counted in analytics. |
| **Inputs** | Customer journey events. |
| **Processing** | For each defined process: check if the initiation event exists → check if the completion event exists within the time window → if not, flag as drop-off → annotate the last event in the process with the drop-off label. |
| **Outputs** | Drop-off annotations on journey events. Drop-off counts in analytics. |
| **UI Requirements** | Drop-off badge on the last event before abandonment in the timeline. Drop-off count in the analytics dashboard. |
| **Backend Requirements** | Process definitions (initiation event type, completion event type, time window). Drop-off detection logic in journey analysis. |
| **Acceptance Criteria** | (1) Initiated but incomplete checkout is flagged as drop-off. (2) Completed checkout is not flagged. (3) Drop-off annotations appear in the timeline. (4) Drop-off counts are accurate in analytics. |
| **Priority** | **P0** |

### F-10: Escalation Detection

| Attribute | Detail |
|---|---|
| **Feature Name** | Escalation Detection |
| **User** | Journey Analyst, Support Operations Manager |
| **Problem Solved** | When customers move from low-effort channels (self-service, web) to high-effort channels (phone, in-person, manager), it indicates a failure in the lower-effort channel. These patterns are invisible in siloed data. |
| **Description** | Detect when a customer's journey includes a transition from a lower-tier channel to a higher-tier channel within a defined time window. Channel tiers: Tier 1 (web self-service, FAQ, chatbot), Tier 2 (email, chat with agent), Tier 3 (phone call, video call), Tier 4 (in-store, manager escalation). A move from a lower tier to a higher tier is flagged as an escalation. |
| **Inputs** | Customer journey events with channel information. |
| **Processing** | Assign tier to each event's channel → detect tier increases within the time window → if tier increases, flag as escalation → record source and destination channels. |
| **Outputs** | Escalation annotations on journey events. Escalation metrics in analytics. |
| **UI Requirements** | Escalation badge on the higher-tier event in the timeline. Connecting visual between the source and escalated events. Escalation count and source breakdown in analytics. |
| **Backend Requirements** | Channel tier configuration. Escalation detection logic. Time window for related escalation (configurable, default 48 hours). |
| **Acceptance Criteria** | (1) Web self-service followed by phone call within 48h is flagged as escalation. (2) Phone call not preceded by lower-tier interaction is not flagged. (3) Escalation annotations include source channel. (4) Analytics show escalation counts by source-destination pair. |
| **Priority** | **P0** |

### F-11: Repeat Contact Detection

| Attribute | Detail |
|---|---|
| **Feature Name** | Repeat Contact Detection |
| **User** | Journey Analyst, Support Operations Manager |
| **Problem Solved** | Customers who contact support multiple times about the same issue indicate unresolved problems. Without cross-channel identity resolution, these repeats are often invisible. |
| **Description** | Detect when a customer has multiple support interactions (calls, chats, emails, tickets) within a configurable time window. Support interactions are identified by event type (call, chat_session, support_email, ticket_created). Multiple support interactions within the window are flagged as repeat contacts. |
| **Inputs** | Customer journey events filtered to support interaction types. |
| **Processing** | Filter events to support types → group by time window → if count > 1 within window, flag as repeat contact → record contact count and channels used. |
| **Outputs** | Repeat contact annotations on journey events. Repeat contact metrics in analytics. |
| **UI Requirements** | Repeat contact badge showing count (e.g., "3rd contact in 7 days"). Repeat contact count in analytics. |
| **Backend Requirements** | Support event type configuration. Time window for repeat detection (configurable, default 7 days). Repeat contact counter per customer. |
| **Acceptance Criteria** | (1) Two support contacts within 7 days are flagged as repeat. (2) Support contacts separated by more than the window are not flagged. (3) Repeat count is accurate. (4) Analytics show repeat contact rate. |
| **Priority** | **P0** |

### F-12: Churn Signal Detection

| Attribute | Detail |
|---|---|
| **Feature Name** | Churn Signal Detection |
| **User** | Journey Analyst, CX Manager |
| **Problem Solved** | Churn is the outcome of a journey, not a single event. Identifying patterns that correlate with churn requires seeing the unified journey. |
| **Description** | Flag customers whose journeys exhibit patterns associated with churn risk. Patterns are rule-based for the MVP: (1) 3+ repeat contacts within 30 days, (2) escalation followed by no activity for 14+ days, (3) drop-off in a critical process followed by no return for 7+ days, (4) negative sentiment in support interactions (if sentiment metadata is available). Customers with one or more churn signals are marked as "at risk" with the contributing patterns listed. |
| **Inputs** | Customer journey with detected patterns (drop-offs, escalations, repeat contacts). |
| **Processing** | Evaluate churn rules against journey patterns → if any rule matches, flag customer as at-risk → record contributing rules and evidence. |
| **Outputs** | Churn risk flag on customer profile. Contributing pattern list. Churn risk count in analytics. |
| **UI Requirements** | Churn risk indicator on customer profile. Contributing patterns listed. Churn risk count in analytics dashboard. Ability to filter customer list by churn risk. |
| **Backend Requirements** | Churn signal rules engine. Rule evaluation against journey patterns. |
| **Acceptance Criteria** | (1) Customer with 3+ repeat contacts in 30 days is flagged. (2) Customer with escalation + 14-day silence is flagged. (3) Contributing patterns are listed. (4) Customers without matching patterns are not flagged. |
| **Priority** | **P1** |

### F-13: Analytics Dashboard

| Attribute | Detail |
|---|---|
| **Feature Name** | Analytics Dashboard |
| **User** | CX Manager, Journey Analyst |
| **Problem Solved** | Individual journey investigation is necessary but insufficient. Managers need aggregate views to understand systemic patterns and prioritize improvements. |
| **Description** | Dashboard showing aggregate KPIs and charts: total unified customers, total events processed, identity resolution rate and average confidence, drop-off count by process, escalation count by channel pair, repeat contact rate, churn-risk customer count, events by channel distribution, top friction points. |
| **Inputs** | Aggregated data from all customer journeys. |
| **Processing** | Aggregate counts and rates across all customers → generate chart data → apply date/channel filters. |
| **Outputs** | Dashboard with KPI cards and charts. |
| **UI Requirements** | KPI summary cards at top. Channel distribution chart. Drop-off, escalation, repeat contact trend indicators. Filterable by date range. |
| **Backend Requirements** | GET `/api/v1/analytics/summary` with date range and channel filter parameters. Pre-computed or on-demand aggregations. |
| **Acceptance Criteria** | (1) All KPI values are accurate against underlying data. (2) Date range filter works correctly. (3) Charts render with correct data. (4) Dashboard loads within acceptable time. |
| **Priority** | **P1** |

### F-14: Customer List with Filtering

| Attribute | Detail |
|---|---|
| **Feature Name** | Customer List with Filtering |
| **User** | Journey Analyst |
| **Problem Solved** | Analysts need to browse and filter customers by detected patterns to investigate cohorts, not just individual searches. |
| **Description** | Paginated customer list showing unified profiles with summary info. Filterable by: detected pattern (drop-off, escalation, repeat contact, churn risk), channel used, identity confidence level, date range of activity, event count range. |
| **Inputs** | Filter parameters. |
| **Processing** | Query customer profiles with applied filters → paginate → return with summary statistics. |
| **Outputs** | Filtered, paginated customer list. |
| **UI Requirements** | Table/list view with sortable columns. Filter sidebar or toolbar. Pagination controls. Click-through to customer profile/journey. |
| **Backend Requirements** | GET `/api/v1/customers` with filter and pagination parameters. Indexed queries for filter performance. |
| **Acceptance Criteria** | (1) Filtering by pattern type returns correct results. (2) Multiple filters combine correctly (AND logic). (3) Pagination works. (4) Sort by last activity, event count, or risk level works. |
| **Priority** | **P1** |

### F-15: Identity Resolution Explainability

| Attribute | Detail |
|---|---|
| **Feature Name** | Identity Resolution Explainability |
| **User** | Journey Analyst |
| **Problem Solved** | Analysts need to understand and trust why the system linked two identifiers. Without explainability, identity resolution is a black box. |
| **Description** | For each unified customer profile, show the identity graph: which identifiers are linked, through what evidence, with what confidence. Display the resolution chain — e.g., "cookie_abc linked to email_xyz via login event on 2026-09-15, confidence 0.98 (deterministic: exact email match)." |
| **Inputs** | Customer profile ID. |
| **Processing** | Retrieve identity resolution history for the profile → build resolution chain → render graph. |
| **Outputs** | Identity graph visualization and resolution evidence list. |
| **UI Requirements** | Identity graph showing identifiers as nodes and match evidence as edges. Resolution evidence list with timestamps, methods, and confidence. |
| **Backend Requirements** | Identity resolution audit log per profile. GET `/api/v1/customers/:id/identity` returning graph and evidence. |
| **Acceptance Criteria** | (1) All linked identifiers are shown. (2) Match method (deterministic/probabilistic) is displayed for each link. (3) Confidence score is shown for each link. (4) Evidence (which fields matched) is available. |
| **Priority** | **P1** |

### F-16: Pipeline Health Dashboard

| Attribute | Detail |
|---|---|
| **Feature Name** | Pipeline Health Dashboard |
| **User** | Data Administrator |
| **Problem Solved** | Administrators need to monitor whether the event pipeline is functioning correctly — events flowing, identity resolution working, errors being caught. |
| **Description** | Dashboard showing: events ingested (total, per channel, success/failure), processing pipeline status (events in each stage), identity resolution statistics (profiles created, merged, average confidence), error log (recent validation failures, processing errors). |
| **Inputs** | Pipeline telemetry data. |
| **Processing** | Aggregate pipeline metrics → display status indicators → show error details. |
| **Outputs** | Pipeline health dashboard. |
| **UI Requirements** | Pipeline stage indicator (ingested → validated → normalized → deduplicated → resolved → stitched). Per-stage counts. Error log with details. Refresh capability. |
| **Backend Requirements** | Pipeline stage counters. Error log storage. GET `/api/v1/pipeline/health`. |
| **Acceptance Criteria** | (1) Pipeline stages show accurate event counts. (2) Error log shows recent failures with details. (3) Identity resolution statistics are current. |
| **Priority** | **P2** |

### F-17: Unresolved Issue Detection

| Attribute | Detail |
|---|---|
| **Feature Name** | Unresolved Issue Detection |
| **User** | Journey Analyst, Support Operations Manager |
| **Problem Solved** | Customers who raise issues that are never resolved represent a significant CX failure. These are detectable when support interactions are stitched but no resolution event follows. |
| **Description** | Detect when a customer has a support interaction (ticket, call, complaint) that is not followed by a resolution event (ticket closed, issue resolved, confirmation) within a configurable time window. |
| **Inputs** | Customer journey events including support interactions and resolution events. |
| **Processing** | Identify support initiation events → check for corresponding resolution events within time window → if none, flag as unresolved. |
| **Outputs** | Unresolved issue annotations on journey events. Unresolved count in analytics. |
| **UI Requirements** | Unresolved issue badge on the support event in the timeline. Unresolved count in analytics. |
| **Backend Requirements** | Support initiation and resolution event type mapping. Time window configuration (default 7 days). |
| **Acceptance Criteria** | (1) Support ticket without resolution within 7 days is flagged. (2) Resolved tickets are not flagged. (3) Analytics show unresolved issue count. |
| **Priority** | **P1** |

### F-18: Event Detail View

| Attribute | Detail |
|---|---|
| **Feature Name** | Event Detail View |
| **User** | Journey Analyst |
| **Problem Solved** | Analysts need to see the full detail of any event in the journey timeline to understand exactly what happened. |
| **Description** | Expandable detail panel for each event in the timeline showing: all metadata fields, raw channel-specific data, identity resolution info for that event, detected patterns associated with the event. |
| **Inputs** | Event ID (click in timeline). |
| **Processing** | Fetch event detail → render metadata → show resolution context. |
| **Outputs** | Event detail panel. |
| **UI Requirements** | Expandable card or side panel. Structured metadata display. Identity resolution context (which profile this event was linked to and why). |
| **Backend Requirements** | GET `/api/v1/events/:id` returning full event detail. |
| **Acceptance Criteria** | (1) All event metadata is displayed. (2) Identity resolution context is shown. (3) Associated patterns are indicated. |
| **Priority** | **P1** |

---

## 8. MVP Scope

### MUST HAVE (P0 — Required for Hackathon Demo)

| # | Feature | Rationale |
|---|---|---|
| 1 | Event Ingestion API (F-01) | Foundation — no events, no platform. |
| 2 | Event Normalization (F-02) | Events from different channels must be comparable. |
| 3 | Event Deduplication (F-03) | Prevents data quality issues that undermine everything downstream. |
| 4 | Identity Resolution Engine (F-04) | Core differentiator — the entire product depends on linking identifiers across channels. |
| 5 | Journey Stitching (F-05) | Core differentiator — the unified timeline is the product's central output. |
| 6 | Journey Timeline View (F-06) | Primary analyst interface — the visual representation of the stitched journey. |
| 7 | Customer Search (F-07) | Analysts must be able to find customers to investigate. |
| 8 | Customer Profile View (F-08) | Context before diving into the timeline. |
| 9 | Drop-Off Detection (F-09) | Required by problem statement — "where customers drop off." |
| 10 | Escalation Detection (F-10) | Required by problem statement — "where escalations occur." |
| 11 | Repeat Contact Detection (F-11) | Required by problem statement — "where customers repeatedly contact support." |
| 12 | Synthetic Data Generator | The demo requires realistic multi-channel data. A generator creates consistent synthetic customer journeys with known patterns for demonstration. |

### SHOULD HAVE (P1 — Important, Build if Time Allows)

| # | Feature | Rationale |
|---|---|---|
| 13 | Churn Signal Detection (F-12) | Required by problem statement — "which experiences correlate with churn." |
| 14 | Analytics Dashboard (F-13) | Aggregate view validates that the system works at scale, not just for one customer. |
| 15 | Customer List with Filtering (F-14) | Enables cohort investigation beyond one-at-a-time search. |
| 16 | Identity Resolution Explainability (F-15) | Differentiator — shows technical depth and builds trust. |
| 17 | Unresolved Issue Detection (F-17) | Required by problem statement — "which issues remain unresolved." |
| 18 | Event Detail View (F-18) | Drill-down capability for serious investigation. |

### NICE TO HAVE (P2 — Only if Core is Solid)

| # | Feature | Rationale |
|---|---|---|
| 19 | Pipeline Health Dashboard (F-16) | Shows operational maturity but is not core to the product story. |
| 20 | Journey comparison | Compare two customer journeys side-by-side to identify pattern differences. |
| 21 | Export journey data | Export a customer's journey as CSV/JSON for external analysis. |

### DO NOT BUILD

| Feature | Reason |
|---|---|
| AI Chatbot / Natural Language Query | Not required by the problem statement. Superficial addition. |
| Marketing Automation | Out of scope. JourneyX observes; it does not act. |
| Real-time Streaming Dashboard | WebSocket-based live event feeds add complexity without demo value. |
| User Authentication / Multi-tenancy | Hackathon MVP — unnecessary for demonstration. |
| Mobile App | Web-only is sufficient for the demo. |
| Email/SMS Alerting | External notification systems are out of scope. |
| Data Collection SDKs | JourneyX ingests data; it does not collect it. |
| Predictive Churn ML Model | Rule-based churn signals are sufficient and more explainable. A trained ML model would require production training data that does not exist. |
| Social Media Integration | Adds channel breadth without depth. |
| Full GDPR/Compliance Module | Privacy awareness is important; a compliance management system is not the product. |

---

## 9. Identity Resolution Requirements

### 9.1 Overview

Identity resolution is the technical core of JourneyX. It answers the question: "Given an event with identifier X from channel A, does this event belong to the same customer as an event with identifier Y from channel B?"

### 9.2 Identifier Types

| Identifier | Strength | Source Channels | Format |
|---|---|---|---|
| Email | Strong | Web, Mobile, Email, CRM | Lowercase, trimmed |
| Phone | Strong | Call Center, Mobile, CRM | Normalized (digits only, consistent format) |
| Loyalty ID | Strong | In-Store, Web, Mobile | Alphanumeric, case-insensitive |
| Device ID | Medium | Mobile, Web (if available) | Opaque string |
| Cookie ID | Weak | Web | Opaque string, session-scoped |
| Name | Weak | All (when provided) | Normalized (trimmed, title case) |

### 9.3 Deterministic Matching

Deterministic matching applies when two events share an exact match on a strong identifier.

**Rules:**

- If incoming event has email E and an existing profile has email E → match (confidence: 1.0).
- If incoming event has phone P and an existing profile has phone P → match (confidence: 1.0).
- If incoming event has loyalty_id L and an existing profile has loyalty_id L → match (confidence: 1.0).
- If multiple strong identifiers match the same profile → match (confidence: 1.0).
- If strong identifiers match different profiles → **identity conflict** (see 9.6).

**Output:** Profile ID, confidence = 1.0, method = "deterministic", evidence = list of matched fields.

### 9.4 Probabilistic Matching

Probabilistic matching applies when no deterministic match is found but weaker signals suggest a link.

**Signals (each contributes to a composite score):**

| Signal | Weight | Description |
|---|---|---|
| Device ID match | 0.6 | Same device ID on a different channel |
| Cookie ID match | 0.3 | Same cookie (lower weight — cookies are session-scoped and less reliable) |
| Name similarity | 0.2 | Fuzzy name match (e.g., Jaro-Winkler or similar) above threshold |
| Temporal proximity | 0.1 | Events within a short time window from related channels |
| Behavioral similarity | 0.1 | Similar browsing/interaction pattern (e.g., same product viewed) |

**Composite score:** Weighted sum of matching signals, normalized to 0.0–1.0.

**Threshold:** Match if composite score ≥ 0.7 (configurable).

**Output:** Profile ID, confidence = composite score, method = "probabilistic", evidence = list of contributing signals with individual weights.

**Note:** The specific weights and threshold above are starting points for the MVP. They should be tunable and evaluated against the synthetic test data. The PRD does not claim these are empirically optimal values.

### 9.5 Confidence Scoring

Every identity resolution produces a confidence score:

| Range | Label | Meaning |
|---|---|---|
| 0.95–1.0 | High | Deterministic match on strong identifier. Reliable. |
| 0.80–0.94 | Medium | Strong probabilistic evidence. Likely correct. |
| 0.70–0.79 | Low | Weak probabilistic evidence. Analyst should review. |
| < 0.70 | No match | New profile created. |

### 9.6 Identity Conflicts

A conflict occurs when an incoming event's identifiers match two or more different existing profiles.

**Example:** Event has email matching Profile A and phone matching Profile B.

**Resolution behavior for MVP:**

1. Log the conflict with full details (both profiles, matching fields, confidence).
2. Link the event to the profile with the highest-confidence match.
3. Flag both profiles for analyst review.
4. Do NOT auto-merge profiles on conflict — let the analyst decide.

### 9.7 Profile Merging

When an event provides two strong identifiers that match the same profile, the profile's identifier set is expanded.

**Example:** Profile has email only. New event has same email + a phone number. The phone number is added to the profile's identifier set, expanding future deterministic matching.

This is identifier expansion, not profile merging. Two separate profiles are never auto-merged in the MVP (see 9.6).

### 9.8 Explainability

Every identity resolution must produce an explanation record:

```
{
  "event_id": "evt_123",
  "profile_id": "cust_456",
  "method": "deterministic",
  "confidence": 1.0,
  "evidence": [
    { "field": "email", "value_hash": "a1b2...", "match_type": "exact" }
  ],
  "timestamp": "2026-09-19T10:30:00Z"
}
```

This record is stored and displayed in the Identity Resolution Explainability view (F-15).

---

## 10. Event Pipeline Requirements

### 10.1 Pipeline Stages

```
Raw Event (API ingestion)
  │
  ▼
Validation
  │  - Schema validation (required fields, types)
  │  - Business rule validation (valid channel, valid event type)
  │  - Reject invalid events with error details
  │
  ▼
Normalization
  │  - Timestamp → ISO 8601 UTC
  │  - Event type → canonical taxonomy
  │  - Email → lowercase, trimmed
  │  - Phone → digits-only consistent format
  │  - Name → trimmed
  │  - Metadata → structured extraction
  │
  ▼
Deduplication
  │  - Composite key: channel + event_type + timestamp + primary_identifier
  │  - Time window: 5 minutes (configurable)
  │  - Duplicates logged and suppressed
  │
  ▼
Identity Resolution
  │  - Phase 1: Deterministic matching on strong identifiers
  │  - Phase 2: Probabilistic scoring on weak signals
  │  - Output: unified profile ID + confidence + evidence
  │
  ▼
Journey Stitching
  │  - Append event to profile's timeline (chronological order)
  │  - Detect session boundaries (30-minute channel gap)
  │  - Detect journey boundaries (24-hour cross-channel gap)
  │  - Update journey metadata
  │
  ▼
Pattern Detection
  │  - Drop-off detection (initiated but incomplete processes)
  │  - Escalation detection (lower-tier → higher-tier channel transition)
  │  - Repeat contact detection (multiple support interactions in window)
  │  - Unresolved issue detection (support without resolution)
  │  - Churn signal evaluation (rule-based pattern matching)
  │
  ▼
Journey Update
  │  - Update customer profile with new patterns
  │  - Update aggregate analytics counters
  │  - Generate notifications for significant detections
  │
  ▼
Storage
     - Event stored with full metadata and resolution info
     - Journey updated in customer record
     - Analytics aggregates updated
```

### 10.2 Canonical Event Schema

```json
{
  "event_id": "string (UUID)",
  "channel": "web | mobile | call_center | email | in_store | chat",
  "event_type": "string (from canonical taxonomy)",
  "timestamp": "ISO 8601 UTC",
  "identifiers": {
    "email": "string | null",
    "phone": "string | null",
    "device_id": "string | null",
    "cookie_id": "string | null",
    "loyalty_id": "string | null",
    "name": "string | null"
  },
  "metadata": {
    "session_id": "string | null",
    "page_url": "string | null",
    "product_id": "string | null",
    "category": "string | null",
    "amount": "number | null",
    "currency": "string | null",
    "agent_id": "string | null",
    "disposition": "string | null",
    "duration_seconds": "number | null",
    "sentiment": "positive | neutral | negative | null",
    "resolution": "resolved | unresolved | pending | null",
    "notes": "string | null"
  },
  "raw": { }
}
```

### 10.3 Canonical Event Type Taxonomy

| Category | Event Types |
|---|---|
| **Browse** | `page_view`, `product_view`, `search`, `category_view` |
| **Commerce** | `add_to_cart`, `remove_from_cart`, `checkout_start`, `payment_attempt`, `purchase_complete`, `refund` |
| **Account** | `signup`, `login`, `logout`, `profile_update`, `password_reset` |
| **Support** | `ticket_created`, `ticket_updated`, `ticket_resolved`, `ticket_closed`, `call_started`, `call_ended`, `chat_started`, `chat_ended`, `email_sent`, `email_received`, `complaint_filed` |
| **Engagement** | `notification_sent`, `notification_opened`, `email_campaign_opened`, `email_campaign_clicked`, `survey_completed`, `review_submitted` |
| **In-Store** | `store_visit`, `pos_transaction`, `loyalty_scan`, `return_processed` |

### 10.4 Supported Channels

| Channel ID | Display Name | Typical Identifiers |
|---|---|---|
| `web` | Website | cookie_id, email (if logged in) |
| `mobile` | Mobile App | device_id, email (if logged in) |
| `call_center` | Call Center | phone, email (if provided) |
| `email` | Email | email |
| `chat` | Live Chat | email, cookie_id |
| `in_store` | Physical Store | loyalty_id, phone |

### 10.5 Error Handling

| Error Type | Behavior |
|---|---|
| Schema validation failure | Reject event, return 400 with field-level errors. Log in error log. |
| Unknown channel | Reject event. |
| Unknown event type | Accept event, map to `unknown` type, log warning. |
| Timestamp parse failure | Reject event (timestamp is required for chronological ordering). |
| Identity resolution failure | Accept event, create new profile, log resolution failure for investigation. |
| Deduplication index unavailable | Accept event (prefer duplicates over data loss), log warning. |

---

## 11. Journey Intelligence

### 11.1 Drop-Off Detection

**Definition:** A drop-off occurs when a customer initiates a defined multi-step process but does not complete it within the expected time window.

**Defined Processes:**

| Process | Initiation Event | Completion Event | Time Window |
|---|---|---|---|
| Checkout | `checkout_start` | `purchase_complete` | 2 hours |
| Onboarding | `signup` | First non-account event | 7 days |
| Support Resolution | `ticket_created` | `ticket_resolved` or `ticket_closed` | 7 days |

**Output per detection:**

```json
{
  "pattern_type": "drop_off",
  "process": "checkout",
  "initiated_event_id": "evt_001",
  "initiated_at": "2026-09-15T10:00:00Z",
  "last_event_id": "evt_002",
  "last_event_at": "2026-09-15T10:05:00Z",
  "channel": "web",
  "window_expired_at": "2026-09-15T12:00:00Z"
}
```

### 11.2 Escalation Detection

**Definition:** An escalation occurs when a customer transitions from a lower-effort channel tier to a higher-effort channel tier within a defined time window, indicating that the lower-tier channel failed to resolve the customer's need.

**Channel Tiers:**

| Tier | Channels | Effort Level |
|---|---|---|
| 1 | Web self-service, FAQ, chatbot | Low (customer solves it themselves) |
| 2 | Email, live chat | Medium (asynchronous agent involvement) |
| 3 | Phone call | High (synchronous, dedicated agent time) |
| 4 | In-store visit, manager escalation | Highest (physical presence or authority escalation) |

**Rules:**

- Tier increase within 48 hours (configurable) = escalation.
- Only the first tier increase in a sequence is flagged (not every subsequent tier in a chain).
- Tier decrease (e.g., phone → web) is not an escalation.

**Output per detection:**

```json
{
  "pattern_type": "escalation",
  "source_channel": "web",
  "source_tier": 1,
  "source_event_id": "evt_003",
  "destination_channel": "call_center",
  "destination_tier": 3,
  "destination_event_id": "evt_004",
  "tier_increase": 2,
  "time_between_seconds": 7200
}
```

### 11.3 Repeat Contact Detection

**Definition:** A repeat contact occurs when a customer has multiple support interactions within a defined time window, suggesting that previous interactions did not resolve the issue.

**Support event types:** `ticket_created`, `call_started`, `chat_started`, `email_sent` (to support), `complaint_filed`.

**Rules:**

- 2+ support interactions within 7 days (configurable) = repeat contact.
- Contact count is tracked per window.
- Cross-channel repeats (e.g., chat then call) are still repeats.

**Output per detection:**

```json
{
  "pattern_type": "repeat_contact",
  "contact_count": 3,
  "window_days": 7,
  "first_contact_event_id": "evt_005",
  "contacts": [
    { "event_id": "evt_005", "channel": "chat", "timestamp": "..." },
    { "event_id": "evt_006", "channel": "email", "timestamp": "..." },
    { "event_id": "evt_007", "channel": "call_center", "timestamp": "..." }
  ]
}
```

### 11.4 Unresolved Issue Detection

**Definition:** An unresolved issue exists when a support interaction is not followed by a resolution event within a defined time window.

**Rules:**

- Support initiation (`ticket_created`, `complaint_filed`) without corresponding resolution (`ticket_resolved`, `ticket_closed`) within 7 days (configurable) = unresolved.
- If a new support interaction occurs before resolution, the issue is both unresolved and a repeat contact.

**Output per detection:**

```json
{
  "pattern_type": "unresolved_issue",
  "initiation_event_id": "evt_008",
  "initiation_type": "ticket_created",
  "initiated_at": "2026-09-10T14:00:00Z",
  "window_expired_at": "2026-09-17T14:00:00Z",
  "related_repeat_contacts": 2
}
```

### 11.5 Friction Point Identification

**Definition:** A friction point is any event or transition in a journey where a detected pattern (drop-off, escalation, repeat contact, or unresolved issue) occurs. Friction points aggregate pattern detections to identify the most problematic touchpoints in the customer experience.

**Implementation:**

- Each detected pattern is associated with a specific event and channel.
- Friction counts are aggregated per event type + channel combination.
- Analyst view shows friction points ranked by frequency.

### 11.6 Churn Signal Detection

**Definition:** A churn signal is a combination of journey patterns that, based on defined rules, suggests the customer is at risk of leaving.

**Rules (MVP — rule-based, not ML):**

| Rule | Condition | Risk Weight |
|---|---|---|
| Repeated frustration | 3+ repeat contacts within 30 days | High |
| Escalation abandonment | Escalation event followed by 14+ days of no activity | High |
| Process abandonment | Drop-off in checkout + no return for 7+ days | Medium |
| Unresolved complaint | Complaint filed + unresolved after 7 days | Medium |
| Activity decline | 50%+ decrease in interaction frequency (30-day rolling) | Low |

**Composite churn risk:** If any High rule matches → "High Risk." If any Medium matches (no High) → "Medium Risk." Low only → "Low Risk." No matches → "No signal."

**Output per customer:**

```json
{
  "churn_risk": "high",
  "signals": [
    { "rule": "repeated_frustration", "evidence": "4 repeat contacts in 22 days" },
    { "rule": "escalation_abandonment", "evidence": "escalation on Sep 5, no activity since Sep 6" }
  ]
}
```

---

## 12. Analytics Requirements

### 12.1 Required KPI Cards

| KPI | Definition | Source |
|---|---|---|
| Total Unified Customers | Count of unique resolved customer profiles | Identity resolution |
| Total Events Processed | Count of events that passed through the full pipeline | Pipeline counters |
| Identity Resolution Rate | % of events linked to an existing profile (vs. creating a new profile) | Identity resolution |
| Average Identity Confidence | Mean confidence score across all resolutions | Identity resolution |
| Drop-Off Count | Total drop-offs detected across all customers and processes | Pattern detection |
| Escalation Count | Total escalations detected | Pattern detection |
| Repeat Contact Rate | % of customers with 2+ support contacts in the window | Pattern detection |
| Churn-Risk Customers | Count of customers flagged with any churn signal | Churn detection |
| Unresolved Issues | Count of open support interactions past the resolution window | Pattern detection |

### 12.2 Required Charts

| Chart | Type | Data |
|---|---|---|
| Events by Channel | Bar or pie chart | Event count per channel |
| Drop-Offs by Process | Bar chart | Drop-off count per defined process (checkout, onboarding, support resolution) |
| Escalations by Channel Pair | Heatmap or bar | Escalation count per source → destination channel pair |
| Identity Resolution Method | Pie chart | Deterministic vs. probabilistic vs. new profile |
| Confidence Distribution | Histogram | Distribution of identity resolution confidence scores |
| Friction Points | Ranked bar chart | Top event type + channel combinations by pattern count |

### 12.3 Filtering

All analytics should support filtering by:

- Date range (from/to)
- Channel (single or multi-select)
- Pattern type (drop-off, escalation, repeat, unresolved, churn)

---

## 13. Search & Filtering

### 13.1 Customer Search

| Capability | Detail |
|---|---|
| Search fields | Email, phone, name, loyalty ID, device ID, cookie ID, customer profile ID |
| Match type | Exact match on structured fields (email, phone, loyalty ID). Partial/prefix match on name. Exact match on IDs. |
| Results | Unified customer profiles with summary (identifier count, event count, active channels, risk level) |
| Performance | Results within 500ms for up to 100,000 profiles |

### 13.2 Customer List Filtering

| Filter | Type | Options |
|---|---|---|
| Detected Pattern | Multi-select checkbox | Drop-off, Escalation, Repeat Contact, Unresolved Issue, Churn Risk |
| Channel | Multi-select checkbox | Web, Mobile, Call Center, Email, Chat, In-Store |
| Date Range | Date picker | Activity within from/to dates |
| Identity Confidence | Range slider | Minimum confidence threshold (0.0–1.0) |
| Event Count | Range | Min/max number of events |
| Churn Risk Level | Select | High, Medium, Low, None |

### 13.3 Journey Timeline Filtering

| Filter | Type | Options |
|---|---|---|
| Channel | Multi-select checkbox | Filter events to specific channels |
| Event Type | Multi-select checkbox | Filter events to specific types (from canonical taxonomy) |
| Pattern | Multi-select checkbox | Show only events associated with a detected pattern |
| Date Range | Date picker | Show events within date range |

### 13.4 Event Filtering (within analytics)

| Filter | Type | Options |
|---|---|---|
| Channel | Multi-select | Filter analytics by channel |
| Date Range | Date picker | Analytics time period |
| Event Category | Multi-select | Browse, Commerce, Support, etc. |

---

## 14. Notifications

### 14.1 Scope

For the hackathon MVP, notifications are **in-app only**. No email notifications, no SMS, no external integrations.

### 14.2 In-App Notifications

| Trigger Event | Notification | Recipient | Priority |
|---|---|---|---|
| New churn-risk customer detected | "[Customer] flagged as {high/medium} churn risk: {reason}" | Journey Analyst | P1 |
| Identity conflict detected | "Identity conflict: event matches multiple profiles — review needed" | Journey Analyst | P1 |
| New escalation detected | "[Customer] escalated from {source channel} to {destination channel}" | Journey Analyst | P2 |

### 14.3 System Alerts (P2 — Pipeline Health)

| Trigger Event | Alert | Recipient |
|---|---|---|
| Ingestion error rate > 10% in 5-minute window | "High ingestion error rate: {rate}% — check event source" | Data Administrator |
| Pipeline stage backlog (events waiting > threshold) | "Pipeline backlog at {stage}: {count} events queued" | Data Administrator |

### 14.4 What Does NOT Generate Notifications

- Individual event ingestion (too noisy).
- Successful identity resolution (normal operation).
- Individual drop-off detection (too frequent to notify on — analytics dashboard handles aggregate visibility).
- Individual repeat contact detection (same rationale).

---

## 15. Functional Requirements

### Event Ingestion

**FR-001:** The system shall accept customer events via a REST API endpoint (POST `/api/v1/events`).

**FR-002:** The system shall accept batch event ingestion via POST `/api/v1/events/batch` (up to 100 events per request).

**FR-003:** The system shall validate each event against the canonical event schema and reject events missing required fields (channel, event_type, timestamp, at least one identifier) with HTTP 400 and field-level error details.

**FR-004:** The system shall return HTTP 202 Accepted for valid events with the assigned event ID.

### Normalization

**FR-005:** The system shall normalize event timestamps to ISO 8601 UTC format.

**FR-006:** The system shall normalize email identifiers to lowercase with whitespace trimmed.

**FR-007:** The system shall normalize phone identifiers to a consistent digit-only format.

**FR-008:** The system shall map raw event types to the canonical event type taxonomy.

### Deduplication

**FR-009:** The system shall generate a composite deduplication key from channel + event_type + timestamp + primary identifier.

**FR-010:** The system shall suppress duplicate events (matching composite key within a 5-minute window) and log them as duplicates.

### Identity Resolution

**FR-011:** The system shall perform deterministic identity resolution by exact matching on strong identifiers (email, phone, loyalty_id).

**FR-012:** The system shall perform probabilistic identity resolution when no deterministic match is found, using weighted scoring of weaker signals (device_id, cookie_id, name similarity, temporal proximity).

**FR-013:** The system shall assign a confidence score (0.0–1.0) to every identity resolution.

**FR-014:** The system shall record the resolution method (deterministic/probabilistic/new_profile) and evidence (matched fields) for every resolution.

**FR-015:** The system shall create a new customer profile when no match meets the minimum confidence threshold (0.7).

**FR-016:** The system shall detect identity conflicts (event matching multiple existing profiles) and flag them for analyst review without auto-merging.

**FR-017:** The system shall expand a profile's identifier set when a resolved event provides new strong identifiers.

### Journey Stitching

**FR-018:** The system shall append resolved events to the customer's journey timeline in chronological order.

**FR-019:** The system shall detect session boundaries at channel-specific gaps exceeding 30 minutes.

**FR-020:** The system shall detect journey boundaries at cross-channel gaps exceeding 24 hours.

**FR-021:** The system shall update journey metadata (event count, channel count, duration, first/last interaction) on each stitched event.

### Pattern Detection

**FR-022:** The system shall detect drop-offs (initiated but incomplete processes within defined time windows).

**FR-023:** The system shall detect escalations (lower-tier to higher-tier channel transitions within 48 hours).

**FR-024:** The system shall detect repeat contacts (2+ support interactions within 7 days).

**FR-025:** The system shall detect unresolved issues (support initiation without resolution within 7 days).

**FR-026:** The system shall evaluate churn signal rules and assign a risk level (high/medium/low/none) to each customer.

### User Interface

**FR-027:** The system shall provide a customer search function accepting any identifier type and returning matching unified profiles.

**FR-028:** The system shall display a customer profile view with linked identifiers, journey statistics, and detected pattern summary.

**FR-029:** The system shall display a journey timeline view with chronologically ordered events, channel indicators, and pattern annotations.

**FR-030:** The system shall support expanding individual events in the timeline to view full metadata.

**FR-031:** The system shall provide filtering on the customer list by detected pattern, channel, date range, and confidence level.

**FR-032:** The system shall provide an analytics dashboard with KPI cards and charts as defined in Section 12.

**FR-033:** The system shall display identity resolution evidence for each customer (method, confidence, matched fields).

---

## 16. Non-Functional Requirements

### Performance

**NFR-001:** Customer search shall return results within 500ms for datasets up to 100,000 profiles.

**NFR-002:** Journey timeline shall render within 1 second for journeys up to 500 events.

**NFR-003:** Analytics dashboard shall load within 2 seconds.

**NFR-004:** Event ingestion API shall respond within 200ms per event.

**Note:** These are hackathon-scale targets with synthetic data. They are not production SLAs.

### Reliability

**NFR-005:** The event pipeline shall not silently drop events. Events are either successfully processed or logged as errors.

**NFR-006:** Identity resolution conflicts shall be flagged, never silently ignored.

**NFR-007:** The system shall handle malformed events gracefully (reject with error, not crash).

### Security

**NFR-008:** The system shall not expose raw customer PII in API error messages.

**NFR-009:** Customer identifiers displayed in the UI shall be partially masked in list views (e.g., j***@example.com) and shown in full only in the detail/profile view.

**NFR-010:** The API shall accept only well-formed JSON payloads (no injection via event metadata).

**Note:** Full authentication, authorization, and encryption are not in scope for the hackathon MVP. The system will document where these would be implemented in a production version.

### Privacy

**NFR-011:** The system shall use synthetic data for all demonstrations — no real customer data.

**NFR-012:** The system shall not send customer data to external services.

### Scalability

**NFR-013:** The system architecture shall demonstrate how it could scale (documented, not implemented). The hackathon demo uses in-process pipelines, but the architecture should show where message queues, distributed processing, and database sharding would be inserted.

### Accessibility

**NFR-014:** The UI shall use semantic HTML and sufficient color contrast for readability.

**NFR-015:** Interactive elements shall be keyboard-navigable.

**NFR-016:** Channel colors in the timeline shall be distinguishable by shape/icon in addition to color (not color-only differentiation).

### Observability

**NFR-017:** The pipeline shall expose stage-level counters (events per stage).

**NFR-018:** The system shall log identity resolution decisions with enough detail to debug incorrect resolutions.

---

## 17. Success Metrics

### Identity Resolution Metrics

| Metric | Definition | Measurement Method |
|---|---|---|
| Resolution Accuracy | % of events correctly linked to the right customer profile | Measured against synthetic data where ground truth is known |
| Deterministic Match Rate | % of resolutions that used deterministic matching | Pipeline counter |
| Probabilistic Match Rate | % of resolutions that used probabilistic matching | Pipeline counter |
| New Profile Rate | % of resolutions that created a new profile | Pipeline counter |
| Conflict Rate | % of resolutions that encountered identity conflicts | Pipeline counter |
| Average Confidence | Mean confidence score across all resolutions | Computed from resolution logs |

**Note:** Target accuracy values depend on the synthetic data generator's design. The system should achieve near-100% accuracy on deterministic matches (since these are exact). Probabilistic accuracy targets should be established empirically after testing with synthetic data that includes known ground-truth linkages.

### Pipeline Metrics

| Metric | Definition |
|---|---|
| Event Processing Latency | Time from ingestion to journey update |
| Validation Pass Rate | % of ingested events that pass validation |
| Deduplication Rate | % of ingested events identified as duplicates |
| Pipeline Throughput | Events processed per second |

### Pattern Detection Metrics

| Metric | Definition | Measurement Method |
|---|---|---|
| Detection Precision | % of detected patterns that are true positives | Verified against synthetic data with known patterns |
| Detection Recall | % of actual patterns that are detected | Verified against synthetic data with known patterns |

**Note:** Precision and recall targets depend on synthetic data design. The system should detect all patterns that match the defined rules (recall = 100% for rule-based detection). Precision depends on rule quality.

### Demo Metrics

| Metric | Target | Rationale |
|---|---|---|
| End-to-end demo flow | Complete in ≤ 3 minutes | Hackathon time constraint |
| Customer stories demonstrated | ≥ 2 distinct customer journeys | Shows the system works for multiple cases |
| Patterns demonstrated | ≥ 4 (drop-off, escalation, repeat contact, churn signal) | Covers all required problem statement elements |
| Identity resolution demonstrated | ≥ 1 cross-channel resolution with explainability | Core technical differentiator |

---

## 18. Demo Requirements

### 18.1 Demo Structure (3 Minutes)

| Segment | Duration | Content |
|---|---|---|
| **Problem Setup** | 30 seconds | "Customers interact across 6 channels. Today their journey is invisible." Show a visual of fragmented data. |
| **Data Ingestion** | 20 seconds | Show events flowing into JourneyX from multiple channels. Pipeline health shows events being processed. |
| **Identity Resolution** | 30 seconds | Show a customer who appeared as different identifiers on different channels. Show the resolution: "These 4 identifiers are the same customer." Show the confidence score and evidence. |
| **Journey Timeline** | 40 seconds | Navigate to the customer's unified journey. Show the complete timeline across channels. Show channel transitions. Expand an event to show detail. |
| **Pattern Detection** | 40 seconds | Walk through detected patterns on the journey: (1) Drop-off — started checkout on web, never completed. (2) Escalation — tried web self-service, then called support. (3) Repeat contact — called support 3 times in a week. |
| **Churn Signal** | 15 seconds | Show the customer flagged as churn risk with contributing patterns listed. |
| **Analytics Dashboard** | 15 seconds | Quick view of aggregate metrics showing this is not just one customer — it's a platform-level view. |
| **Close** | 10 seconds | "JourneyX turns fragmented interactions into unified journey intelligence." |

### 18.2 Demo Customer Scenarios

**Scenario 1: "The Frustrated Shopper"**

1. Browses products on web (cookie_id only).
2. Adds to cart on mobile app (device_id, email after login).
3. Starts checkout on web (logs in — email links cookie_id to profile).
4. **Drop-off:** Abandons checkout (payment fails).
5. Calls support (phone number — new identifier linked via email match from CRM lookup).
6. **Escalation:** Web → call center.
7. Calls support again 3 days later (same issue).
8. **Repeat contact:** 2nd call in 7 days.
9. No activity for 14 days.
10. **Churn signal:** Escalation + repeat contact + inactivity.

**Identity resolution demonstrated:** cookie_id (web) → email (mobile login) → phone (call center) — all resolved to one customer with confidence 1.0 on email match, identifier expansion for phone.

**Scenario 2: "The Support Loop"**

1. Creates support ticket via email.
2. Receives no response in 3 days.
3. **Unresolved issue:** Ticket open past window.
4. Chats with support (same email — deterministic match).
5. **Repeat contact:** 2nd support interaction in 7 days.
6. Visits physical store (loyalty_id — linked via email from CRM).
7. **Escalation:** Email → chat → in-store (Tier 1 → 2 → 4).
8. Issue resolved in-store.

**Identity resolution demonstrated:** email (ticket) → email (chat, deterministic) → loyalty_id (in-store, linked via shared email in CRM).

### 18.3 What the Judge Should See

1. **Technical depth:** A real identity resolution algorithm with deterministic and probabilistic matching, confidence scores, and explainability — not a hardcoded lookup table.
2. **Pipeline completeness:** Raw events enter via API → validation → normalization → deduplication → identity resolution → stitching → pattern detection → journey update. Every stage is functional.
3. **Product coherence:** The UI is purposeful. Search → Profile → Timeline → Patterns → Analytics. Every screen answers a question the analyst has.
4. **Intelligence, not just visualization:** The system does not just display events. It detects patterns (drop-off, escalation, repeat contact, unresolved issue, churn signal) and explains them.
5. **Data quality awareness:** Confidence scores, identity conflict handling, deduplication — the system demonstrates awareness that real-world data is messy.

---

## 19. Risks

### Product Risks

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Scope creep — adding features beyond the MVP | Incomplete demo, nothing works well | High | Strict adherence to P0 features. No feature additions without removing another. |
| Demo tells a weak story | Judges don't understand the product | Medium | Pre-designed demo scenarios with scripted walkthrough. Practice the demo. |
| UI polish insufficient for judging | Product appears amateurish despite technical depth | Medium | Use a UI component library. Focus polish on the timeline view (the centerpiece). |

### Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Identity resolution logic has bugs | Wrong customers linked, demo shows incorrect data | Medium | Test with synthetic data where ground truth is known. Unit test all matching logic. |
| Pipeline stages not integrated end-to-end | Demo shows individual pieces but not the flow | Medium | Integrate early. Build the pipeline skeleton first, then fill in each stage. |
| Probabilistic matching produces too many false positives | Analysts cannot trust the system | Medium | Set conservative thresholds. Prefer precision over recall for the MVP. |
| Performance issues with large synthetic datasets | Demo is slow or crashes | Low | Test with demo-sized data (thousands, not millions). Optimize critical queries. |

### Data Risks

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Synthetic data is unrealistic | Demo scenarios feel contrived | Medium | Design synthetic data generator to produce realistic cross-channel journeys with natural identifier patterns. |
| Synthetic data does not cover edge cases | Identity resolution or pattern detection fails on edge cases during live demo | Medium | Pre-test with all demo scenarios. Include edge cases (conflicts, low confidence) in synthetic data. |

### Privacy Risks

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Accidentally using real customer data in demo | Privacy violation | Low | All data is generated by the synthetic data generator. No real data ingestion in the MVP. |
| Synthetic data that looks too real | Judges or viewers mistake synthetic data for real people | Low | Use obviously fictional names and clearly mark data as synthetic. |

### AI Risks

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Over-reliance on AI for features that should be deterministic | System produces unexplainable or unreliable results | Medium | Use rule-based detection for all pattern matching. Reserve AI/ML for areas where it provides genuine value (e.g., probabilistic matching scoring), not for marketing. |
| AI features added for marketing rather than technical value | Judges see through superficial AI additions | Medium | Every AI component must answer: what problem does it solve that a rule-based approach cannot? |

### Demo Risks

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Live demo fails (data not loaded, server down, UI broken) | Failed demo despite working product | Medium | Pre-load synthetic data. Have a backup video recording. Test the exact demo flow before presenting. |
| Demo runs over time | Judges lose attention, incomplete story | Medium | Practice to 3-minute target. Script the flow. Time each segment. |
| Questions about production scalability | Team cannot articulate scaling strategy | Medium | Document scaling architecture (where queues, sharding, caching would go) even though the MVP does not implement them. |

---

## 20. Final MVP Specification

### The Product

JourneyX is a cross-channel journey intelligence platform. It ingests customer interaction events from multiple channels, resolves fragmented identities into unified customer profiles, stitches events into chronological journeys, and detects patterns — drop-offs, escalations, repeat contacts, unresolved issues, and churn signals — that reveal where customer experience breaks down.

### What Gets Built

| Layer | Components |
|---|---|
| **Data Ingestion** | REST API for single and batch event ingestion. Schema validation. Error handling with clear messages. |
| **Processing Pipeline** | Normalization (timestamps, identifiers, event types). Deduplication (composite key, 5-minute window). Identity resolution (deterministic on strong identifiers, probabilistic scoring on weak signals, confidence 0.0–1.0, explainable evidence). Journey stitching (chronological ordering, session/journey boundary detection). |
| **Intelligence** | Drop-off detection (incomplete defined processes). Escalation detection (lower-tier → higher-tier channel transitions). Repeat contact detection (multiple support interactions in window). Unresolved issue detection (support without resolution). Churn signal detection (rule-based pattern matching with composite risk scoring). |
| **Storage** | Customer profiles with identity graphs. Stitched journey timelines. Pattern detection results. Analytics aggregations. Resolution audit logs. |
| **User Interface** | Customer search (any identifier). Customer profile view (identifiers, confidence, statistics, patterns). Journey timeline (chronological, channel-colored, pattern-annotated, expandable events). Customer list with filtering (by pattern, channel, confidence, date). Analytics dashboard (KPIs, charts). Identity resolution explainability (match evidence, confidence, method). |
| **Demo Data** | Synthetic data generator producing realistic multi-channel customer journeys with known patterns for demonstration. At minimum two pre-designed demo scenarios. |

### What Does NOT Get Built

No CRM, no billing, no marketing automation, no production infrastructure, no AI chatbot, no data collection SDKs, no user authentication, no email notifications, no predictive ML models, no real-time streaming.

### Architecture Direction

Monolithic for the hackathon (single deployable application with in-process pipeline). The architecture should be modular enough to show where it would be decomposed for production (API gateway, event queue, processing workers, identity service, journey store, analytics service), documented in the codebase or presentation, but not implemented as separate services.

### Demo Story

Follow two customers through fragmented multi-channel interactions. Show JourneyX resolving their identities, stitching their journeys, and detecting the exact moments where their experience broke down. End with the analytics dashboard showing this works at platform scale, not just for individual stories.

### Single Product Direction

There is one product direction: **identity resolution + event stitching + journey intelligence for analyst investigation**. Every feature serves this direction. There are no alternative interpretations, no competing visions, no optional pivots. Build this.

---

*End of Product Requirements Document*
