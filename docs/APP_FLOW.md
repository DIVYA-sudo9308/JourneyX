# JourneyX — Application Flow Specification

**Version:** 1.0
**Date:** 2026-09-19
**Companions:** [PRD v1.0](PRD.md) · [TRD v1.0](TRD.md)
**Hackathon:** BIT N BUILD'26 — Gujarat Round

---

## Table of Contents

1. [Information Architecture](#1-information-architecture)
2. [Screen Inventory](#2-screen-inventory)
3. [Complete User Flows](#3-complete-user-flows)
4. [Feature Matrix](#4-feature-matrix)
5. [Notification System](#5-notification-system)
6. [Notification UX](#6-notification-ux)
7. [Demo Flow](#7-demo-flow)
8. [Final App Flow](#8-final-app-flow)

---

## 1. Information Architecture

### 1.1 Navigation Hierarchy

```
JourneyX
├── Dashboard                    [/dashboard]
│   └── Analytics overview, KPI cards, charts
│
├── Customers                    [/customers]
│   ├── Customer List            [/customers]
│   │   └── Filter sidebar (patterns, channels, risk, confidence)
│   ├── Customer Profile         [/customers/:id]
│   │   ├── Journey Timeline     [/customers/:id/journey]
│   │   │   └── Event Detail     (expandable inline)
│   │   └── Identity Graph       [/customers/:id/identity]
│   └── Search Results           [/customers?q=...]
│
├── Pipeline                     [/pipeline]       (P2)
│   └── Pipeline health, stage counters, error log
│
└── (Global)
    ├── Search Bar               (top nav, persistent)
    └── Notification Bell        (top nav, persistent)
```

### 1.2 Navigation Justification

| Section | PRD Source | Why It Exists |
|---|---|---|
| Dashboard | F-13 (Analytics Dashboard) | CX Managers and Analysts need an aggregate view of journey health. Entry point after login. |
| Customers | F-07, F-08, F-14 (Search, Profile, List) | The primary workspace. Analysts spend most time here searching, filtering, and investigating. |
| Customer Profile | F-08 (Profile View) | Summary of who the customer is before diving into the timeline. |
| Journey Timeline | F-06 (Timeline View) | The centerpiece. The unified journey with pattern annotations. |
| Identity Graph | F-15 (Explainability) | Shows why identifiers were linked. Technical differentiator. |
| Pipeline | F-16 (Pipeline Health) | P2. Data administrators monitor ingestion health. |
| Search Bar | F-07 (Customer Search) | Persistent access from any screen. The fastest path to a customer. |
| Notification Bell | PRD Section 14 (Notifications) | In-app notification center for identity conflicts, churn alerts. |

### 1.3 What Is NOT in the Navigation

| Omitted | Reason |
|---|---|
| Settings page | No configurable settings in the hackathon MVP (no auth, no user preferences). |
| Events page (standalone) | Events are viewed in context of a customer journey, not as a standalone list. |
| Reports page | Analytics dashboard serves this purpose. No separate export/report builder. |
| Admin panel | Pipeline health is the only admin-facing screen. No user management, no source configuration UI. |
| Help / Documentation | Hackathon MVP — not needed for demo. |

### 1.4 URL Structure

| URL | Page | Params |
|---|---|---|
| `/` | Redirect → `/dashboard` | — |
| `/dashboard` | Analytics Dashboard | `?dateFrom=&dateTo=&channel=` |
| `/customers` | Customer List | `?page=&pageSize=&pattern=&channel=&churnRisk=&minConfidence=&dateFrom=&dateTo=&sortBy=&sortOrder=&q=` |
| `/customers/[id]` | Customer Profile | — |
| `/customers/[id]/journey` | Journey Timeline | `?channel=&eventType=&dateFrom=&dateTo=&pattern=` |
| `/customers/[id]/identity` | Identity Graph | — |
| `/pipeline` | Pipeline Health | — |

---

## 2. Screen Inventory

### 2.1 S-01: Dashboard (Analytics Overview)

| Attribute | Detail |
|---|---|
| **Screen Name** | Dashboard |
| **Route** | `/dashboard` |
| **Purpose** | Provide an at-a-glance view of journey health across all customers. Answer: "How is our customer experience doing?" |
| **Users** | CX Manager (primary), Journey Analyst (secondary) |
| **Entry Point** | Default landing page. Sidebar navigation "Dashboard" link. |
| **Main Actions** | View KPIs. Filter by date range and channel. Click a KPI card to navigate to the filtered customer list (e.g., click "45 Churn Risk" → `/customers?churnRisk=high,medium`). Click a chart segment to drill into that subset. |
| **Data Displayed** | **KPI Cards (top row):** Total Unified Customers, Total Events Processed, Identity Resolution Rate (%), Average Confidence, Drop-Off Count, Escalation Count, Repeat Contact Rate (%), Churn-Risk Customers, Unresolved Issues. **Charts (below KPIs):** Events by Channel (bar), Drop-Offs by Process (bar), Escalations by Channel Pair (heatmap/bar), Identity Resolution Method (pie), Confidence Distribution (histogram), Top Friction Points (ranked bar). |
| **Filters** | Date range picker (from/to). Channel multi-select dropdown. Both filters apply to all KPIs and charts simultaneously. |
| **CTAs** | KPI cards are clickable (navigate to filtered customer list). Chart segments/bars are clickable (navigate to filtered view). |
| **Empty State** | "No events have been ingested yet. Use the API to send your first event." with a link to the API documentation or a "Seed Demo Data" button. |
| **Loading State** | Skeleton cards (9 cards) in the KPI row. Skeleton rectangles for each chart area. All skeletons match the layout dimensions. |
| **Error State** | "Unable to load analytics. Please try again." with a "Retry" button. Individual chart errors show inline: "Chart unavailable" with retry. |
| **Success State** | All KPIs populated with values. All charts rendered with data. Filters applied if set. |

---

### 2.2 S-02: Customer List

| Attribute | Detail |
|---|---|
| **Screen Name** | Customer List |
| **Route** | `/customers` |
| **Purpose** | Browse, filter, and sort unified customer profiles. Answer: "Which customers match my investigation criteria?" |
| **Users** | Journey Analyst (primary) |
| **Entry Point** | Sidebar navigation "Customers" link. Dashboard KPI card click. Dashboard chart segment click. |
| **Main Actions** | Filter by detected patterns, channels, churn risk, confidence, date range. Sort by last activity, event count, risk level. Paginate. Click a customer row to navigate to their profile. |
| **Data Displayed** | **Table columns:** Customer Name (or masked email if no name), Channels (icon badges), Event Count, Last Active, Identity Confidence (meter), Patterns (badges: drop-off, escalation, repeat, unresolved), Churn Risk (badge: high/medium/low/none). **Filter sidebar (left):** Pattern checkboxes, Channel checkboxes, Churn Risk select, Confidence slider, Date range picker. **Pagination (bottom):** Page controls, total count. |
| **Filters** | Pattern type (multi-select: drop-off, escalation, repeat contact, unresolved issue, churn risk). Channel (multi-select: web, mobile, call center, email, chat, in-store). Churn risk (select: high, medium, low, none). Min confidence (slider: 0.0–1.0). Date range (from/to). All filters combine with AND logic. Filters persist in URL query params. |
| **CTAs** | Click customer row → `/customers/:id`. Clear all filters button. |
| **Empty State** | **No customers at all:** "No customer profiles yet. Ingest events to create profiles." **No results for current filters:** "No customers match your filters." with a "Clear Filters" button. |
| **Loading State** | Skeleton table rows (10 rows) matching column layout. Filter sidebar remains interactive. |
| **Error State** | "Unable to load customers. Please try again." with "Retry" button. |
| **Success State** | Table populated with customer rows. Active filters highlighted. Pagination showing total count. |

---

### 2.3 S-03: Customer Profile

| Attribute | Detail |
|---|---|
| **Screen Name** | Customer Profile |
| **Route** | `/customers/[id]` |
| **Purpose** | Provide a summary of who the customer is, how they were identified, and what patterns have been detected. Answer: "Who is this customer and what should I know before investigating their journey?" |
| **Users** | Journey Analyst (primary) |
| **Entry Point** | Customer list row click. Search result click. Notification deep link. |
| **Main Actions** | Review profile summary. Navigate to Journey Timeline. Navigate to Identity Graph. |
| **Data Displayed** | **Identity Card (top):** Display name, all linked identifiers grouped by type (email, phone, device_id, etc.) with source channel badges. Overall identity confidence meter. **Journey Statistics (middle):** Total events, channels used (icon list), first seen date, last seen date, active duration (days). **Detected Patterns (bottom):** Pattern summary cards — Drop-offs (count), Escalations (count), Repeat Contacts (count), Unresolved Issues (count). **Churn Risk (prominent):** Risk badge (high/medium/low/none) with contributing signal list. |
| **Filters** | None (this is a profile view, not a list). |
| **CTAs** | "View Journey" button → `/customers/:id/journey`. "View Identity Graph" button → `/customers/:id/identity`. Pattern cards are clickable → navigate to journey timeline filtered to that pattern type. |
| **Empty State** | Not applicable — if the customer exists, they have at least one event. **404:** "Customer not found." with "Back to Customers" link. |
| **Loading State** | Skeleton card for identity section. Skeleton blocks for statistics and patterns. |
| **Error State** | "Unable to load profile. Please try again." with "Retry". |
| **Success State** | Profile fully rendered with all sections populated. Churn risk badge prominently displayed if at risk. |

---

### 2.4 S-04: Journey Timeline

| Attribute | Detail |
|---|---|
| **Screen Name** | Journey Timeline |
| **Route** | `/customers/[id]/journey` |
| **Purpose** | Display the complete, unified, chronological customer journey across all channels. The centerpiece of the product. Answer: "What exactly happened in this customer's journey, and where did it break?" |
| **Users** | Journey Analyst (primary), Support Ops Manager (secondary) |
| **Entry Point** | Customer profile "View Journey" button. Customer profile pattern card click (pre-filtered). |
| **Main Actions** | Scroll through chronological events. Expand event cards to see full detail. Filter by channel, event type, date, or pattern. Identify channel transitions. Review pattern annotations (drop-off, escalation, repeat, unresolved, churn). |
| **Data Displayed** | **Timeline header:** Customer name, total events (filtered count / total), active channels. **Timeline body (vertical):** Each event rendered as a card on a vertical timeline. **Per event card (collapsed):** Channel icon + color bar (left edge), event type label, timestamp (relative + absolute), key metadata summary (1 line), pattern badges (if any). **Per event card (expanded):** All metadata fields, raw channel-specific data, identity resolution info (method, confidence, matched fields), detected patterns associated with this event. **Visual elements:** Session boundaries (subtle horizontal divider with "Session N" label). Journey boundaries (strong horizontal divider with "Journey N" label and time gap). Channel transition indicators (connecting arrow or visual break between different-channel events). Pattern annotations: badges attached to the event card — drop-off (red), escalation (orange), repeat contact (yellow), unresolved (indigo), churn signal (rose). |
| **Filters** | **Filter toolbar (above timeline):** Channel multi-select (icon checkboxes). Event type multi-select. Pattern filter (show only events with specific patterns). Date range picker. "Clear filters" button. Active filter chips displayed below toolbar. |
| **CTAs** | Click event card → expand/collapse. Click pattern badge → scroll to and highlight the related event(s) (e.g., click escalation badge → highlight both source and destination events). Click "View Identity" → `/customers/:id/identity`. Back to profile button. |
| **Empty State** | **No events after filtering:** "No events match your filters." with "Clear Filters" button. |
| **Loading State** | Skeleton timeline with 5 placeholder event cards. Channel color bars visible in skeleton. |
| **Error State** | "Unable to load journey. Please try again." with "Retry". |
| **Success State** | Full timeline rendered with correct chronological order. Pattern annotations visible. Channel colors applied. Session and journey boundaries marked. |

---

### 2.5 S-05: Identity Graph

| Attribute | Detail |
|---|---|
| **Screen Name** | Identity Graph |
| **Route** | `/customers/[id]/identity` |
| **Purpose** | Show how the customer's identifiers were linked across channels. Answer: "Why does JourneyX think these identifiers belong to the same person?" |
| **Users** | Journey Analyst (primary) |
| **Entry Point** | Customer profile "View Identity Graph" button. Journey timeline "View Identity" link. |
| **Main Actions** | Review linked identifiers. Examine resolution evidence for each link. Identify the resolution chain (how the profile grew over time). |
| **Data Displayed** | **Identity graph (top):** Visual node-link diagram. Center node = unified customer profile. Surrounding nodes = identifiers (email, phone, device_id, cookie_id, loyalty_id, name). Each node labeled with type + masked value. Edges labeled with match method (deterministic/probabilistic) + confidence score. Node color indicates source channel. **Resolution history (below graph):** Chronological list of resolution events. Each entry shows: timestamp, event that triggered the resolution, method used, confidence score, identifiers added, evidence detail (which fields matched and how). **Conflicts section (if any):** List of identity conflicts with both profile IDs, matching fields, and status (pending review). |
| **Filters** | None. |
| **CTAs** | Click an identifier node → highlight the resolution event that introduced it. Click a resolution history entry → expand evidence detail. "View Journey" link → `/customers/:id/journey`. Back to profile button. |
| **Empty State** | Not applicable — every profile has at least one identifier. |
| **Loading State** | Skeleton graph placeholder. Skeleton list for resolution history. |
| **Error State** | "Unable to load identity data. Please try again." with "Retry". |
| **Success State** | Graph rendered with all identifiers, edges with confidence labels, resolution history in chronological order. |

---

### 2.6 S-06: Event Detail (Inline Expansion)

| Attribute | Detail |
|---|---|
| **Screen Name** | Event Detail |
| **Route** | Inline within `/customers/[id]/journey` (expanded event card) |
| **Purpose** | Show the full detail of a single event. Answer: "What exactly happened at this touchpoint?" |
| **Users** | Journey Analyst |
| **Entry Point** | Click on a collapsed event card in the journey timeline. |
| **Main Actions** | Review all metadata. Review identity resolution context for this event. Review patterns associated with this event. Copy event ID for reference. |
| **Data Displayed** | **Event header:** Channel icon, event type, full timestamp, event ID. **Metadata section:** All key-value pairs from the event's metadata (page_url, product_id, amount, agent_id, duration, sentiment, etc.). Keys that are null are hidden. **Identity resolution section:** Method (deterministic/probabilistic/new_profile), confidence score, evidence list (matched fields with detail). **Patterns section:** List of patterns associated with this event with detail (e.g., "Drop-off: Checkout started but not completed within 2 hours"). **Raw data section (collapsible):** JSON view of the original raw event data. |
| **Filters** | None. |
| **CTAs** | Collapse button (returns to summary view). If the event has a pattern, the pattern detail links to other related events in the timeline. |
| **Empty State** | Not applicable — every event has at minimum channel, type, timestamp. |
| **Loading State** | Inline spinner within the expanding card while fetching full event detail from API. |
| **Error State** | "Unable to load event details." inline with a "Retry" link. |
| **Success State** | Card expanded with all sections populated. Smooth expand animation (200ms ease-out). |

---

### 2.7 S-07: Pipeline Health (P2)

| Attribute | Detail |
|---|---|
| **Screen Name** | Pipeline Health |
| **Route** | `/pipeline` |
| **Purpose** | Monitor event processing pipeline status. Answer: "Is the pipeline working? Are events flowing?" |
| **Users** | Data Administrator |
| **Entry Point** | Sidebar navigation "Pipeline" link. |
| **Main Actions** | View stage counters. Review recent errors. Check identity resolution statistics. |
| **Data Displayed** | **Pipeline stage diagram (top):** Horizontal flow diagram showing stages: Ingested → Validated → Normalized → Deduplicated → Resolved → Stitched → Patterns Detected. Each stage shows its event count. Error count shown as a branch. **Identity resolution stats (middle):** Total profiles, average confidence, conflict count, identifiers per profile average. **Recent errors (bottom):** Table of recent processing errors: timestamp, stage, error message, event snippet (channel + event type, no PII). |
| **Filters** | None. |
| **CTAs** | Refresh button (manual reload). Error rows are informational only (no drill-down needed for hackathon). |
| **Empty State** | "No events processed yet. Use the API to send your first event." |
| **Loading State** | Skeleton stage diagram. Skeleton table for errors. |
| **Error State** | "Unable to load pipeline status." with "Retry". |
| **Success State** | All stages show counts. Errors listed if any. Stats populated. |

---

### 2.8 S-08: Notification Center (Dropdown)

| Attribute | Detail |
|---|---|
| **Screen Name** | Notification Center |
| **Route** | Not a page — dropdown panel from the notification bell icon in the top nav. |
| **Purpose** | Surface important alerts: identity conflicts, churn-risk detections, escalations. Answer: "What needs my attention?" |
| **Users** | Journey Analyst |
| **Entry Point** | Click the notification bell icon in the top navigation bar. |
| **Main Actions** | View notification list. Click a notification to navigate to the relevant screen. Mark notifications as read. |
| **Data Displayed** | **Notification list:** Each notification shows: severity icon (info/warning/critical), title, message (1–2 lines), timestamp (relative), read/unread indicator (bold = unread). **Badge count:** Number of unread notifications displayed on the bell icon. |
| **Filters** | None (simple list, most recent first). |
| **CTAs** | Click notification → navigate to relevant screen (customer profile, identity graph). "Mark all as read" button at top. |
| **Empty State** | "No notifications. You're all caught up." |
| **Loading State** | Skeleton list (3 items). |
| **Error State** | "Unable to load notifications." inline. |
| **Success State** | Notification list populated. Unread notifications visually distinct. Badge count accurate. |

---

## 3. Complete User Flows

### FLOW 01 — First Load (No Login)

The hackathon MVP has no authentication. The "login" flow is simply the first page load.

```
START
  │
  ▼
User opens JourneyX URL in browser
  │
  ▼
SYSTEM: Next.js server renders the dashboard page (SSR)
  │
  ├── Database has data → Dashboard loads with KPIs and charts
  │     │
  │     ▼
  │   SUCCESS: User sees fully populated dashboard
  │
  └── Database is empty → Dashboard shows empty state
        │
        ▼
      User sees: "No events ingested yet. Seed demo data or use the API."
        │
        ▼
      User clicks "Seed Demo Data" button (or runs seed script)
        │
        ▼
      SYSTEM: Synthetic data generator creates ~500 customers, ~15,000 events
        │
        ▼
      SYSTEM: Page refreshes. Dashboard populates.
        │
        ▼
      SUCCESS: User sees populated dashboard
```

---

### FLOW 02 — Dashboard Exploration

```
START: User is on /dashboard
  │
  ▼
User views KPI cards row
  │
  ├── User adjusts date range filter
  │     │
  │     ▼
  │   SYSTEM: URL updates with dateFrom/dateTo params
  │   SYSTEM: SWR refetches analytics with new date range
  │   SYSTEM: KPIs and charts re-render with filtered data
  │     │
  │     ▼
  │   SUCCESS: Dashboard shows analytics for selected period
  │
  ├── User selects a channel filter
  │     │
  │     ▼
  │   SYSTEM: URL updates with channel param
  │   SYSTEM: All KPIs and charts filter to that channel
  │     │
  │     ▼
  │   SUCCESS: Dashboard shows single-channel analytics
  │
  ├── User clicks a KPI card (e.g., "45 Churn Risk")
  │     │
  │     ▼
  │   SYSTEM: Navigate to /customers?churnRisk=high,medium
  │     │
  │     ▼
  │   → FLOW 04 (Investigate Customer) begins at the filtered customer list
  │
  └── User clicks a chart segment (e.g., "Web" bar in Events by Channel)
        │
        ▼
      SYSTEM: Navigate to /customers?channel=web
        │
        ▼
      → FLOW 04 begins at channel-filtered customer list
```

---

### FLOW 03 — Search Customer

```
START: User is on any screen (search bar is persistent in top nav)
  │
  ▼
User clicks the search bar (or presses keyboard shortcut Ctrl+K)
  │
  ▼
Search bar focuses. Placeholder: "Search by email, phone, name, ID..."
  │
  ▼
User types a query (e.g., "john@example.com")
  │
  ▼
SYSTEM: After 300ms debounce, calls GET /api/v1/customers/search?q=john@example.com
  │
  ▼
SYSTEM: Search results dropdown appears below search bar
  │
  ├── Results found (1+)
  │     │
  │     ▼
  │   Dropdown shows matching profiles:
  │     - Profile name (or masked email)
  │     - Matched field indicator ("matched on: email")
  │     - Event count, channel count, risk badge
  │     │
  │     ▼
  │   User clicks a result
  │     │
  │     ▼
  │   SYSTEM: Navigate to /customers/:id
  │     │
  │     ▼
  │   → FLOW 04 (Investigate Customer) begins at profile view
  │
  └── No results
        │
        ▼
      Dropdown shows: "No customers found for 'john@example.com'"
        │
        ▼
      User modifies search query or navigates away
```

---

### FLOW 04 — Investigate Customer

```
START: User is on /customers/:id (Customer Profile)
  │
  ▼
User reviews the profile:
  - Linked identifiers (email, phone, device_id, etc.)
  - Identity confidence meter
  - Journey statistics (events, channels, active period)
  - Detected patterns (drop-offs, escalations, repeat contacts, unresolved)
  - Churn risk badge with contributing signals
  │
  ├── User wants to see the full journey
  │     │
  │     ▼
  │   User clicks "View Journey" button
  │     │
  │     ▼
  │   SYSTEM: Navigate to /customers/:id/journey
  │     │
  │     ▼
  │   → FLOW 05 (View Unified Journey)
  │
  ├── User wants to understand identity linking
  │     │
  │     ▼
  │   User clicks "View Identity Graph" button
  │     │
  │     ▼
  │   SYSTEM: Navigate to /customers/:id/identity
  │     │
  │     ▼
  │   → FLOW 06 (Inspect Identity Resolution)
  │
  ├── User wants to investigate a specific pattern
  │     │
  │     ▼
  │   User clicks a pattern card (e.g., "2 Escalations")
  │     │
  │     ▼
  │   SYSTEM: Navigate to /customers/:id/journey?pattern=escalation
  │     │
  │     ▼
  │   → FLOW 09 (Investigate Escalation)
  │
  └── User wants to go back to the customer list
        │
        ▼
      User clicks "Back to Customers" or sidebar nav
        │
        ▼
      SYSTEM: Navigate to /customers (with previously active filters preserved in URL)
```

---

### FLOW 05 — View Unified Journey

```
START: User is on /customers/:id/journey (Journey Timeline)
  │
  ▼
SYSTEM: Fetches journey data from GET /api/v1/customers/:id/journey
SYSTEM: Computes sessions (30-min gap) and journey boundaries (24-hour gap)
SYSTEM: Renders vertical timeline with all events
  │
  ▼
User scrolls through the timeline:
  │
  ├── User notices a channel transition (e.g., web → call center)
  │     │
  │     ▼
  │   The transition is visually emphasized:
  │     - Different channel color on the timeline
  │     - Channel icon changes
  │     - Transition connector between events
  │
  ├── User notices a pattern badge (e.g., red "DROP-OFF" badge)
  │     │
  │     ▼
  │   → FLOW 11 (Investigate Drop-Off)
  │
  ├── User wants to see event detail
  │     │
  │     ▼
  │   → FLOW 08 (View Event Details)
  │
  ├── User applies a channel filter (e.g., show only call_center events)
  │     │
  │     ▼
  │   SYSTEM: URL updates with channel param
  │   SYSTEM: Timeline re-renders showing only call_center events
  │   SYSTEM: Header shows "Showing 5 of 15 events"
  │     │
  │     ▼
  │   SUCCESS: Filtered timeline displayed
  │
  └── User applies a pattern filter (e.g., show only events with patterns)
        │
        ▼
      SYSTEM: Timeline shows only events that have associated pattern detections
        │
        ▼
      SUCCESS: Pattern-relevant events highlighted, others hidden
```

---

### FLOW 06 — Inspect Identity Resolution

```
START: User is on /customers/:id/identity (Identity Graph)
  │
  ▼
SYSTEM: Fetches identity data from GET /api/v1/customers/:id/identity
SYSTEM: Renders identity graph and resolution history
  │
  ▼
User views the identity graph:
  - Center node: unified customer profile
  - Surrounding nodes: each identifier (email, phone, cookie_id, etc.)
  - Edges labeled with method + confidence
  - Node colors indicate source channel
  │
  ├── User clicks an identifier node (e.g., phone: ***-1234)
  │     │
  │     ▼
  │   SYSTEM: Highlights the resolution history entry that introduced this identifier
  │   SYSTEM: Scrolls resolution history to that entry
  │     │
  │     ▼
  │   User reads the evidence:
  │     "Event evt_005 (call_center, call_started, Sep 15 12:00)
  │      Method: deterministic
  │      Confidence: 1.0
  │      Evidence: Exact email match on existing profile
  │      Identifiers added: phone:555-123-4567"
  │     │
  │     ▼
  │   SUCCESS: User understands why the phone was linked to this profile
  │
  ├── User reviews the resolution history chronologically
  │     │
  │     ▼
  │   User sees how the profile grew over time:
  │     1. cookie_id introduced (web browsing, new profile created)
  │     2. email linked (web login, deterministic match)
  │     3. device_id linked (mobile app, probabilistic match, confidence 0.85)
  │     4. phone linked (call center, deterministic match via email)
  │     │
  │     ▼
  │   SUCCESS: User understands the full resolution chain
  │
  └── User sees a conflict entry (if any)
        │
        ▼
      → FLOW 07 (Investigate Identity Conflict)
```

---

### FLOW 07 — Investigate Identity Conflict

```
START: User sees a conflict entry in the identity graph or receives a conflict notification
  │
  ▼
User navigates to /customers/:id/identity
  │
  ▼
SYSTEM: Conflict section shows:
  - "Identity conflict detected"
  - Profile A: cust_123 (email: a@b.com, 15 events)
  - Profile B: cust_456 (phone: 555-1234, 3 events)
  - Conflicting event: had email matching A and phone matching B
  - Resolution: event linked to Profile A (more established)
  │
  ▼
User reviews the conflict:
  │
  ├── User determines they are the same person (e.g., family shared phone)
  │     │
  │     ▼
  │   MVP: No merge action available in the UI.
  │   User notes this finding for future investigation.
  │   (Production: "Merge Profiles" button would be here)
  │     │
  │     ▼
  │   SUCCESS: User understands the conflict and can factor it into their analysis
  │
  └── User determines they are different people
        │
        ▼
      MVP: No split action available.
      User notes the event may be linked to the wrong profile.
      (Production: "Reject Link" button would be here)
        │
        ▼
      SUCCESS: User understands the data quality limitation
```

---

### FLOW 08 — View Event Details

```
START: User is on /customers/:id/journey, viewing the timeline
  │
  ▼
User clicks on a collapsed event card
  │
  ▼
SYSTEM: Fetches full event detail from GET /api/v1/events/:id
SYSTEM: Displays loading spinner within the expanding card
  │
  ▼
SYSTEM: Card expands (200ms ease-out animation) to show:
  │
  ├── Event header: channel icon, event type, full timestamp, event ID
  ├── Metadata: all key-value pairs (page_url, product_id, amount, agent_id, etc.)
  ├── Identity resolution: method, confidence, evidence
  ├── Patterns: any patterns associated with this event
  └── Raw data: collapsible JSON view
  │
  ▼
User reviews the information:
  │
  ├── User wants to collapse the card
  │     │
  │     ▼
  │   User clicks the card again or clicks the collapse button
  │     │
  │     ▼
  │   SYSTEM: Card collapses back to summary view
  │
  └── User notices a pattern detail and wants to investigate
        │
        ▼
      User clicks the pattern badge within the event detail
        │
        ▼
      SYSTEM: Scrolls to and highlights the related event(s) in the timeline
```

---

### FLOW 09 — Investigate Escalation

```
START: User clicks an orange "ESCALATION" badge on the timeline,
       or navigates to /customers/:id/journey?pattern=escalation
  │
  ▼
SYSTEM: If pattern filter applied, timeline shows only escalation-related events
SYSTEM: Escalation badges are visible on the destination events
  │
  ▼
User identifies the escalation:
  - Source event: web page_view (Tier 1), Sep 15 10:00
  - Destination event: call_center call_started (Tier 3), Sep 15 12:00
  - Tier increase: 2
  - Time between: 2 hours
  │
  ▼
User expands the source event:
  - page_url: /help/returns
  - Indicates customer tried self-service first
  │
  ▼
User expands the destination event:
  - agent_id: agent_42
  - duration: 300 seconds
  - disposition: "refund_processed"
  │
  ▼
User concludes: customer couldn't resolve returns via self-service,
escalated to call center. Self-service returns flow needs improvement.
  │
  ▼
SUCCESS: User has identified the root cause of the escalation
```

---

### FLOW 10 — Investigate Repeat Contacts

```
START: User clicks a yellow "REPEAT CONTACT" badge on the timeline,
       or navigates to /customers/:id/journey?pattern=repeat_contact
  │
  ▼
SYSTEM: Timeline shows the customer's support interactions highlighted
SYSTEM: Repeat contact badge shows count: "3rd contact in 7 days"
  │
  ▼
User reviews the sequence:
  1. Sep 10: chat_started (chat) — first contact
  2. Sep 12: email_sent (email) — second contact
  3. Sep 14: call_started (call_center) — third contact
     Badge: "3rd contact in 7 days"
  │
  ▼
User expands each event to check metadata:
  - Chat: category = "billing_inquiry"
  - Email: category = "billing_inquiry"
  - Call: category = "billing_complaint", disposition = "pending"
  │
  ▼
User concludes: same billing issue unresolved across 3 contacts,
escalating from chat → email → call. Billing inquiry resolution is failing.
  │
  ▼
SUCCESS: User has identified the unresolved issue driving repeat contacts
```

---

### FLOW 11 — Investigate Drop-Off

```
START: User clicks a red "DROP-OFF" badge on the timeline,
       or navigates to /customers/:id/journey?pattern=drop_off
  │
  ▼
SYSTEM: Timeline highlights the drop-off events
SYSTEM: Drop-off badge shows process: "Checkout drop-off"
  │
  ▼
User identifies the drop-off:
  - Sep 15 10:00: checkout_start (web)
  - Sep 15 10:05: payment_attempt (web) — metadata shows error: "card_declined"
  - No purchase_complete event within 2-hour window
  │
  ▼
User expands the payment_attempt event:
  - error_code: "card_declined"
  - amount: 99.99
  - payment_method: "credit_card"
  │
  ▼
User concludes: payment failure caused checkout abandonment.
No retry flow or alternative payment suggestion was offered.
  │
  ▼
SUCCESS: User has identified the specific failure point in checkout
```

---

### FLOW 12 — Analyze Churn Pattern

```
START: User is on /customers/:id (Customer Profile)
  │
  ▼
User sees churn risk badge: "HIGH RISK"
Contributing signals listed below:
  - "Repeated frustration: 3 repeat contacts in 14 days"
  - "Escalation abandonment: escalation on Sep 5, no activity since Sep 6"
  │
  ▼
User clicks "View Journey" to see the full context
  │
  ▼
SYSTEM: Navigate to /customers/:id/journey
  │
  ▼
User reviews the timeline and sees:
  1. Sep 1–5: Multiple support contacts across channels (repeat)
  2. Sep 5: Escalation from chat to call center
  3. Sep 5: Last event — no activity for 14+ days
  4. Churn signal badge on the last event
  │
  ▼
User returns to /customers and filters: churnRisk=high
  │
  ▼
SYSTEM: Shows all high-risk customers
  │
  ▼
User reviews multiple churn-risk profiles to identify common patterns:
  - Do they share the same escalation source channel?
  - Do they share the same drop-off process?
  - Is there a common event type or metadata value?
  │
  ▼
SUCCESS: User has identified systemic patterns driving churn risk
```

---

### FLOW 13 — Filter Journey Data

```
START: User is on /customers/:id/journey (Journey Timeline)
  │
  ▼
User wants to focus on specific aspects of the journey
  │
  ├── Filter by channel:
  │     │
  │     ▼
  │   User clicks channel filter in toolbar
  │   User selects "Call Center" and "Chat" checkboxes
  │     │
  │     ▼
  │   SYSTEM: URL updates: ?channel=call_center,chat
  │   SYSTEM: Timeline re-renders showing only call/chat events
  │   SYSTEM: Header: "Showing 8 of 15 events (Call Center, Chat)"
  │   SYSTEM: Active filter chips displayed below toolbar
  │     │
  │     ▼
  │   SUCCESS: Filtered timeline shows support-only interactions
  │
  ├── Filter by pattern:
  │     │
  │     ▼
  │   User clicks pattern filter
  │   User selects "Escalation"
  │     │
  │     ▼
  │   SYSTEM: URL updates: ?pattern=escalation
  │   SYSTEM: Timeline shows only events associated with escalation detections
  │     (the source event and the destination event of each escalation)
  │     │
  │     ▼
  │   SUCCESS: Only escalation-relevant events visible
  │
  ├── Filter by date range:
  │     │
  │     ▼
  │   User sets date range: Sep 10 – Sep 15
  │     │
  │     ▼
  │   SYSTEM: URL updates: ?dateFrom=2026-09-10&dateTo=2026-09-15
  │   SYSTEM: Timeline shows only events within that window
  │     │
  │     ▼
  │   SUCCESS: Time-scoped view of the journey
  │
  └── Combine multiple filters:
        │
        ▼
      User selects: channel=call_center + pattern=repeat_contact
        │
        ▼
      SYSTEM: Applies AND logic — shows call center events that are part of repeat contact detections
        │
        ▼
      SUCCESS: Focused investigation view

CLEAR FILTERS:
  │
  ▼
User clicks "Clear Filters" button or removes individual filter chips
  │
  ▼
SYSTEM: URL params cleared, full timeline restored
```

---

### FLOW 14 — Receive Alert (Notification)

```
START: User is on any screen
  │
  ▼
SYSTEM: During event processing, a churn-risk customer is detected
SYSTEM: Notification created in database:
  type: "churn_risk"
  title: "High Churn Risk Detected"
  message: "Priya Sharma flagged as high churn risk: 3 repeat contacts + escalation abandonment"
  profile_id: cust_789
  │
  ▼
SYSTEM: On next poll cycle (30 seconds), notification badge count increments
  │
  ▼
User notices the badge count on the notification bell icon: "2"
  │
  ▼
User clicks the bell icon
  │
  ▼
SYSTEM: Notification dropdown opens showing:
  │
  │  ┌──────────────────────────────────────────────┐
  │  │ 🔴 High Churn Risk Detected                  │
  │  │ Priya Sharma flagged as high churn risk:     │
  │  │ 3 repeat contacts + escalation abandonment   │
  │  │ 5 minutes ago                                │
  │  ├──────────────────────────────────────────────┤
  │  │ 🟡 Identity Conflict Detected                │
  │  │ Event matches multiple profiles — review     │
  │  │ 2 hours ago                                  │
  │  └──────────────────────────────────────────────┘
  │
  ▼
User clicks the churn risk notification
  │
  ▼
SYSTEM: Notification marked as read (badge decrements)
SYSTEM: Navigate to /customers/cust_789
  │
  ▼
→ FLOW 04 (Investigate Customer) begins
  │
  ▼
SUCCESS: User is investigating the flagged customer
```

---

### FLOW 15 — Data Ingestion / Admin Flow

```
START: Data Administrator wants to ingest events
  │
  ├── OPTION A: Seed synthetic data (initial setup)
  │     │
  │     ▼
  │   Admin runs: npx prisma db seed
  │     │
  │     ▼
  │   SYSTEM: Seed script generates ~500 customers with ~15,000 events
  │   SYSTEM: Events processed through full pipeline
  │   SYSTEM: Profiles, identifiers, patterns, resolution logs created
  │     │
  │     ▼
  │   Admin opens JourneyX in browser
  │     │
  │     ▼
  │   SUCCESS: Dashboard shows populated analytics
  │
  ├── OPTION B: Ingest via API (single event)
  │     │
  │     ▼
  │   Admin sends POST /api/v1/events with event JSON
  │     │
  │     ├── Valid event
  │     │     │
  │     │     ▼
  │     │   SYSTEM: Returns 202 with event_id, profile_id, resolution info
  │     │   SYSTEM: Event visible in the customer's journey timeline
  │     │     │
  │     │     ▼
  │     │   SUCCESS: Event ingested and processed
  │     │
  │     └── Invalid event
  │           │
  │           ▼
  │         SYSTEM: Returns 400 with field-level validation errors
  │           │
  │           ▼
  │         Admin fixes the event and resubmits
  │
  ├── OPTION C: Batch ingest via API
  │     │
  │     ▼
  │   Admin sends POST /api/v1/events/batch with up to 100 events
  │     │
  │     ▼
  │   SYSTEM: Processes sequentially, returns per-event results
  │   SYSTEM: Partial success allowed (some events may fail)
  │     │
  │     ▼
  │   SUCCESS: Admin reviews results array for successes and failures
  │
  └── OPTION D: Monitor pipeline health (P2)
        │
        ▼
      Admin navigates to /pipeline
        │
        ▼
      SYSTEM: Shows stage counters, error log, identity stats
        │
        ▼
      Admin reviews:
        - All stages show non-zero counts → pipeline flowing
        - Error count < 2% of ingested → acceptable error rate
        - No recent errors → healthy
        │
        ▼
      SUCCESS: Admin confirms pipeline is operating correctly
```

---

## 4. Feature Matrix

| # | Feature | User | Priority | Screen | API Endpoint | DB Entity | Notification | Demo Relevance |
|---|---|---|---|---|---|---|---|---|
| F-01 | Event Ingestion API | Data Admin | P0 | — (API only) | `POST /api/v1/events`, `POST /api/v1/events/batch` | `events`, `pipeline_metrics` | — | **High** — shows pipeline works |
| F-02 | Event Normalization | System | P0 | — (pipeline) | — (internal) | `events` (normalized fields) | — | **Medium** — invisible but essential |
| F-03 | Event Deduplication | System | P0 | — (pipeline) | — (internal) | `events` (dedup_key) | — | **Low** — hard to demo directly |
| F-04 | Identity Resolution | System / Analyst | P0 | Identity Graph (S-05) | `GET /customers/:id/identity` | `customer_profiles`, `customer_identifiers`, `resolution_logs` | Identity conflict | **Critical** — core differentiator |
| F-05 | Journey Stitching | System | P0 | Journey Timeline (S-04) | `GET /customers/:id/journey` | `events` (profile_id, timestamp ordering) | — | **Critical** — produces the timeline |
| F-06 | Journey Timeline View | Journey Analyst | P0 | Journey Timeline (S-04) | `GET /customers/:id/journey` | `events`, `detected_patterns` | — | **Critical** — centerpiece screen |
| F-07 | Customer Search | Journey Analyst | P0 | Search Bar (global) | `GET /customers/search` | `customer_identifiers` | — | **High** — first thing in demo |
| F-08 | Customer Profile | Journey Analyst | P0 | Customer Profile (S-03) | `GET /customers/:id` | `customer_profiles`, `detected_patterns` | — | **High** — context before timeline |
| F-09 | Drop-Off Detection | Analyst / CX Mgr | P0 | Journey Timeline (S-04), Dashboard (S-01) | `GET /customers/:id/journey` | `detected_patterns` | — | **Critical** — required by PS |
| F-10 | Escalation Detection | Analyst / Support Mgr | P0 | Journey Timeline (S-04), Dashboard (S-01) | `GET /customers/:id/journey` | `detected_patterns` | New escalation (P2) | **Critical** — required by PS |
| F-11 | Repeat Contact Detection | Analyst / Support Mgr | P0 | Journey Timeline (S-04), Dashboard (S-01) | `GET /customers/:id/journey` | `detected_patterns` | — | **Critical** — required by PS |
| F-12 | Churn Signal Detection | Analyst / CX Mgr | P1 | Customer Profile (S-03), Dashboard (S-01) | `GET /customers/:id` | `customer_profiles`, `detected_patterns` | Churn risk (P1) | **High** — required by PS |
| F-13 | Analytics Dashboard | CX Mgr / Analyst | P1 | Dashboard (S-01) | `GET /analytics/summary` | `events`, `detected_patterns`, `customer_profiles` | — | **High** — shows platform scale |
| F-14 | Customer List + Filtering | Journey Analyst | P1 | Customer List (S-02) | `GET /customers` | `customer_profiles` | — | **Medium** — supports investigation |
| F-15 | Identity Explainability | Journey Analyst | P1 | Identity Graph (S-05) | `GET /customers/:id/identity` | `resolution_logs`, `customer_identifiers` | — | **High** — shows technical depth |
| F-16 | Pipeline Health | Data Admin | P2 | Pipeline Health (S-07) | `GET /pipeline/health` | `pipeline_metrics` | Pipeline alerts (P2) | **Low** — optional for demo |
| F-17 | Unresolved Issue Detection | Analyst / Support Mgr | P1 | Journey Timeline (S-04) | `GET /customers/:id/journey` | `detected_patterns` | — | **Medium** — required by PS |
| F-18 | Event Detail View | Journey Analyst | P1 | Event Detail (S-06, inline) | `GET /events/:id` | `events`, `resolution_logs` | — | **Medium** — supports drill-down |
| SYN | Synthetic Data Generator | Dev Team | P0 | — (seed script) | — | All tables | — | **Critical** — no data = no demo |

---

## 5. Notification System

### 5.1 Notification Architecture Overview

JourneyX notifications are **in-app only** — no email, no SMS, no push notifications. Notifications are generated during event pipeline processing and stored in the `notifications` database table. The frontend polls for new notifications.

### 5.2 Category A: Identity Alerts

#### N-01: Identity Conflict Detected

| Attribute | Detail |
|---|---|
| **Trigger** | Identity resolution engine encounters an event whose strong identifiers match two or more different existing profiles. |
| **Condition** | `DeterministicResult.uniqueProfiles.length >= 2` |
| **Severity** | WARNING |
| **Message** | "Identity conflict: Event matches Profile {A_name} and Profile {B_name}. Event linked to {winner_name} (more events). Review needed." |
| **User** | Journey Analyst |
| **Channel** | In-app notification center |
| **Action** | Click → navigate to `/customers/:winner_id/identity` (identity graph showing the conflict section) |
| **Expiration** | None — persists until manually dismissed or marked as read |
| **Read/Unread** | Created as unread. Clicking the notification marks it as read. "Mark all as read" also marks it. |

#### N-02: Low-Confidence Match

| Attribute | Detail |
|---|---|
| **Trigger** | Probabilistic identity resolution produces a match with confidence between 0.70 and 0.79 (the "Low" confidence band). |
| **Condition** | `resolution.method === 'probabilistic' && resolution.confidence >= 0.70 && resolution.confidence < 0.80` |
| **Severity** | INFO |
| **Message** | "Low-confidence identity match: Event linked to {customer_name} with {confidence}% confidence. Evidence: {matched_signals}." |
| **User** | Journey Analyst |
| **Channel** | In-app notification center |
| **Action** | Click → navigate to `/customers/:id/identity` |
| **Expiration** | Auto-dismiss after 7 days if unread |
| **Read/Unread** | Standard read/unread behavior |

### 5.3 Category B: Journey Alerts

#### N-03: Escalation Detected

| Attribute | Detail |
|---|---|
| **Trigger** | Escalation detector identifies a lower-tier → higher-tier channel transition. |
| **Condition** | `CHANNEL_TIERS[newEvent.channel] > CHANNEL_TIERS[priorEvent.channel]` within 48-hour window |
| **Severity** | INFO |
| **Message** | "{customer_name} escalated from {source_channel} to {destination_channel}." |
| **User** | Journey Analyst |
| **Channel** | In-app notification center |
| **Action** | Click → navigate to `/customers/:id/journey?pattern=escalation` |
| **Expiration** | Auto-dismiss after 7 days if unread |
| **Read/Unread** | Standard read/unread behavior |

**Note on volume control:** If the system detects many escalations in a short period (e.g., batch ingestion), only the first 5 escalation notifications are created per 10-minute window. A summary notification replaces the rest: "{N} additional escalations detected."

#### N-04: Repeat Contact Threshold Reached

| Attribute | Detail |
|---|---|
| **Trigger** | Repeat contact detector identifies 3+ support contacts within 7 days (threshold is higher than the 2-contact detection threshold because notifications at 2 would be noisy). |
| **Condition** | `recentSupportContacts.length >= 3` within 7-day window |
| **Severity** | WARNING |
| **Message** | "{customer_name} has contacted support {count} times in {days} days across {channels}." |
| **User** | Journey Analyst, Support Operations Manager |
| **Channel** | In-app notification center |
| **Action** | Click → navigate to `/customers/:id/journey?pattern=repeat_contact` |
| **Expiration** | None |
| **Read/Unread** | Standard read/unread behavior |

### 5.4 Category C: Churn Signals

#### N-05: High Churn Risk Detected

| Attribute | Detail |
|---|---|
| **Trigger** | Churn signal evaluator flags a customer as "high" churn risk. |
| **Condition** | `churnRisk === 'high'` (at least one high-weight rule matched) |
| **Severity** | CRITICAL |
| **Message** | "{customer_name} flagged as high churn risk: {signal_summary}." |
| **User** | Journey Analyst |
| **Channel** | In-app notification center |
| **Action** | Click → navigate to `/customers/:id` (profile page showing churn risk details) |
| **Expiration** | None — critical notifications do not auto-dismiss |
| **Read/Unread** | Standard read/unread behavior. Critical notifications have a distinct visual treatment (red border/icon). |

#### N-06: Medium Churn Risk Detected

| Attribute | Detail |
|---|---|
| **Trigger** | Churn signal evaluator flags a customer as "medium" churn risk. |
| **Condition** | `churnRisk === 'medium'` |
| **Severity** | WARNING |
| **Message** | "{customer_name} flagged as medium churn risk: {signal_summary}." |
| **User** | Journey Analyst |
| **Channel** | In-app notification center |
| **Action** | Click → navigate to `/customers/:id` |
| **Expiration** | Auto-dismiss after 14 days if unread |
| **Read/Unread** | Standard read/unread behavior |

### 5.5 Category D: System Alerts (P2)

#### N-07: High Ingestion Error Rate

| Attribute | Detail |
|---|---|
| **Trigger** | Ingestion error rate exceeds 10% in a 5-minute window. |
| **Condition** | `(error_count / total_count) > 0.10` over last 5 minutes |
| **Severity** | CRITICAL |
| **Message** | "High ingestion error rate: {rate}% of events failing validation. Check event source data quality." |
| **User** | Data Administrator |
| **Channel** | In-app notification center |
| **Action** | Click → navigate to `/pipeline` (pipeline health page) |
| **Expiration** | None |
| **Read/Unread** | Standard. Only one notification per error-rate threshold crossing (not repeated every 5 minutes). |

#### N-08: Pipeline Stage Backlog

| Attribute | Detail |
|---|---|
| **Trigger** | More than 1,000 events queued at any pipeline stage (relevant only in production or if async processing is added). |
| **Condition** | Stage queue depth > threshold |
| **Severity** | WARNING |
| **Message** | "Pipeline backlog at {stage}: {count} events queued." |
| **User** | Data Administrator |
| **Channel** | In-app notification center |
| **Action** | Click → navigate to `/pipeline` |
| **Expiration** | Auto-dismiss when backlog clears |
| **Read/Unread** | Standard |

**Note:** N-07 and N-08 are P2 features. For the hackathon MVP, the pipeline processes events synchronously, so backlogs are unlikely.

### 5.6 Notifications NOT Generated

These events explicitly do **not** generate notifications to avoid noise:

| Event | Reason |
|---|---|
| Individual event ingested successfully | Normal operation — too frequent. |
| Successful identity resolution | Normal operation — every event triggers one. |
| Individual drop-off detected | Too frequent for individual notifications. Visible in analytics dashboard and journey timeline. |
| Individual repeat contact at 2-contact threshold | Too noisy. Only 3+ contacts generate a notification. |
| Low churn risk detected | Not actionable enough to interrupt the user. |
| Profile identifier expansion | Normal, desirable operation. Not a problem. |
| New customer profile created | Normal operation during ingestion. |

---

## 6. Notification UX

### 6.1 Notification Bell (Global)

**Location:** Top navigation bar, right side, next to search bar.

**Badge count:** Circular red badge showing the number of unread notifications. Hidden when count is 0. Shows "9+" when count exceeds 9.

**Behavior:**

- Click → opens the notification dropdown panel.
- Badge count fetched on page load and updated via SWR polling every 30 seconds.
- Badge animates (subtle pulse) when count increases between polls.

### 6.2 Notification Dropdown Panel

**Appearance:** Dropdown panel anchored to the bell icon, opening downward. Width: 400px. Max height: 480px with internal scroll. Shadow and border consistent with shadcn/ui popover.

**Content:**

```
┌─────────────────────────────────────────┐
│  Notifications              Mark all ✓  │
├─────────────────────────────────────────┤
│  🔴 CRITICAL                            │
│  High Churn Risk Detected               │
│  Priya Sharma flagged as high churn     │
│  risk: 3 repeat contacts + escalation   │
│  abandonment                            │
│  5 minutes ago                    ●     │ ← unread dot
├─────────────────────────────────────────┤
│  🟡 WARNING                             │
│  Identity Conflict Detected             │
│  Event matches Profile A and Profile B  │
│  — review needed                        │
│  2 hours ago                            │
├─────────────────────────────────────────┤
│  🔵 INFO                                │
│  Escalation Detected                    │
│  Rahul Mehta escalated from web to      │
│  call center                            │
│  3 hours ago                            │
├─────────────────────────────────────────┤
│                                         │
│  No more notifications                  │
│                                         │
└─────────────────────────────────────────┘
```

### 6.3 Notification Item States

| State | Visual Treatment |
|---|---|
| **Unread** | Bold title. Blue dot indicator on the right edge. Slightly darker background. |
| **Read** | Normal weight title. No dot. Standard background. |
| **Critical** | Red left border. Red severity icon. Bold title regardless of read state. |
| **Warning** | Amber left border. Amber severity icon. |
| **Info** | Blue left border. Blue severity icon. |

### 6.4 Notification Interactions

| Interaction | Behavior |
|---|---|
| **Click notification body** | (1) Mark as read. (2) Close dropdown. (3) Navigate to the deep link target (customer profile, identity graph, pipeline health). |
| **"Mark all as read" button** | Marks all visible notifications as read. Badge count resets to 0. Notifications remain in the list (they are read, not deleted). |
| **Click outside dropdown** | Close dropdown without any state change. |
| **Scroll within dropdown** | Standard scroll. Older notifications below. No infinite scroll — shows most recent 20 notifications. |

### 6.5 Toast Notifications

**Not implemented for MVP.** Toasts (pop-up notifications that appear briefly) add UX complexity without significant value for a demo where the analyst is not sitting and watching for real-time alerts. The badge count on the bell icon is sufficient.

**Production consideration:** Toasts for CRITICAL notifications (churn risk, identity conflict) would be appropriate in a production version where analysts are actively monitoring.

### 6.6 Inline Alerts

**Used sparingly** for contextual information within a screen, not for the notification system:

| Location | Inline Alert |
|---|---|
| Customer Profile (S-03) | If the customer has an identity conflict: amber alert bar at top of profile: "This customer has an identity conflict. [Review →]" |
| Identity Graph (S-05) | If conflicts exist: conflict section with details (always visible, not dismissible). |
| Journey Timeline (S-04) | Pattern badges are inline annotations on events — not separate alerts. |

### 6.7 Deep Links

Every notification navigates to the most relevant screen:

| Notification Type | Deep Link Target |
|---|---|
| N-01: Identity Conflict | `/customers/:id/identity` (identity graph with conflict section) |
| N-02: Low-Confidence Match | `/customers/:id/identity` |
| N-03: Escalation | `/customers/:id/journey?pattern=escalation` |
| N-04: Repeat Contact | `/customers/:id/journey?pattern=repeat_contact` |
| N-05: High Churn Risk | `/customers/:id` (profile showing churn risk) |
| N-06: Medium Churn Risk | `/customers/:id` |
| N-07: High Error Rate | `/pipeline` |
| N-08: Pipeline Backlog | `/pipeline` |

---

## 7. Demo Flow

### 7.1 Demo Narrative Arc

The demo follows a three-act structure:

**Act 1 — The Problem** (0:00–0:30): Show that customer data is fragmented and invisible.
**Act 2 — The Solution** (0:30–2:30): Show JourneyX resolving identities, stitching journeys, and detecting patterns.
**Act 3 — The Impact** (2:30–3:00): Show that this scales beyond one customer to platform-level intelligence.

### 7.2 Demo Script

The demo follows the "Frustrated Shopper" scenario from PRD Section 18.2 — a customer named **Priya Sharma** who browses on web, shops on mobile, fails checkout, calls support twice, and churns.

---

#### Scene 1: The Problem (0:00–0:30)

| Timestamp | Screen | Action | Data Visible | Narration |
|---|---|---|---|---|
| 0:00 | Slide/visual (not JourneyX) | Show a diagram of 6 channel icons (web, mobile, call center, email, chat, in-store) with separate databases under each | 6 siloed channel icons | *"Every organization interacts with customers across multiple channels — web, mobile, call center, email, chat, and in-store. Each channel captures its own data in its own system."* |
| 0:10 | Same visual | Animate question marks appearing between the channels | Disconnected channels with "?" | *"But when these interactions live in silos, the organization cannot answer basic questions: Is the person who called support the same person who abandoned checkout on the website? What happened before the escalation? Why did the customer leave?"* |
| 0:25 | Transition to JourneyX | Open JourneyX in browser | — | *"JourneyX solves this. Let me show you how."* |

**Expected judge reaction:** Understanding of the problem. Recognition that this is a real pain point.

---

#### Scene 2: Data Ingestion (0:30–0:50)

| Timestamp | Screen | Action | Data Visible | Narration |
|---|---|---|---|---|
| 0:30 | Dashboard (`/dashboard`) | JourneyX opens to the populated dashboard | KPI cards showing: 500 customers, 15,000 events, 87% resolution rate, 0.92 avg confidence | *"JourneyX has already ingested 15,000 events from 6 channels and resolved them into 500 unified customer profiles."* |
| 0:40 | Dashboard | Point to the KPI cards | Resolution rate 87%, Avg confidence 0.92 | *"87% of events were matched to existing customers using our identity resolution engine, with an average confidence of 92%. Let me show you how this works for a specific customer."* |

**Expected judge reaction:** The system is live and populated. Numbers suggest a functional pipeline, not a static mock.

---

#### Scene 3: Search & Identity Resolution (0:50–1:20)

| Timestamp | Screen | Action | Data Visible | Narration |
|---|---|---|---|---|
| 0:50 | Dashboard | Click the search bar. Type "priya" | Search dropdown appears with Priya Sharma's profile | *"Let's find a customer named Priya Sharma. I can search by any identifier — name, email, phone, loyalty ID."* |
| 0:55 | Search dropdown | Click Priya Sharma's result | Profile card in dropdown: 4 identifiers, 12 events, 3 channels, HIGH churn risk | *"Here she is — JourneyX found her across 3 channels with 4 different identifiers."* |
| 1:00 | Customer Profile (`/customers/:id`) | Profile page loads | Identity card: email (web), phone (call center), cookie_id (web), device_id (mobile). Confidence: 98%. Patterns: 1 drop-off, 1 escalation, 2 repeat contacts. Churn risk: HIGH | *"Priya appeared as a cookie ID on the web, a device ID on mobile, an email when she logged in, and a phone number when she called support. JourneyX resolved all four identifiers to a single customer with 98% confidence."* |
| 1:05 | Customer Profile | Click "View Identity Graph" | — | *"Let me show you exactly how the system linked these identifiers."* |
| 1:08 | Identity Graph (`/customers/:id/identity`) | Graph loads | Center: Priya Sharma profile. Nodes: email (web), phone (call center), cookie_id (web), device_id (mobile). Edges: cookie→email (deterministic, login event), email→phone (deterministic, CRM lookup), email→device (probabilistic, 85%) | *"The cookie was linked to the email when Priya logged in — that's a deterministic match, 100% confidence. The phone was linked through an exact email match from a CRM lookup. The mobile device was linked probabilistically — same email plus temporal proximity — at 85% confidence. Every link is explainable."* |
| 1:18 | Identity Graph | Pause for emphasis | Resolution chain visible | *"This is not a black box. The analyst can see exactly why each identifier was linked and at what confidence."* |

**Expected judge reaction:** "This is real identity resolution, not a lookup table." Understanding of deterministic vs. probabilistic. Appreciation for explainability.

---

#### Scene 4: Unified Journey + Pattern Detection (1:20–2:20)

| Timestamp | Screen | Action | Data Visible | Narration |
|---|---|---|---|---|
| 1:20 | Identity Graph | Click "View Journey" button | — | *"Now let's see Priya's complete journey."* |
| 1:23 | Journey Timeline (`/customers/:id/journey`) | Timeline loads | 12 events across 3 channels. Blue (web), purple (mobile), green (call center). Session and journey boundaries visible. Pattern badges visible. | *"Here's Priya's unified journey — every interaction across web, mobile, and call center, stitched into a single timeline. Watch the channel transitions."* |
| 1:30 | Journey Timeline | Scroll to the checkout events | Events: checkout_start (web, blue), payment_attempt (web, blue) with red DROP-OFF badge | *"Priya started checkout on the website, attempted payment — and it failed. She never completed the purchase. JourneyX automatically detected this as a checkout drop-off."* |
| 1:40 | Journey Timeline | Click to expand the payment_attempt event | Metadata: error_code = "card_declined", amount = ₹4,999 | *"Drilling in, we can see the payment was declined. ₹4,999 in lost revenue from this one failure."* |
| 1:48 | Journey Timeline | Scroll down to the call center event | call_started event (call center, green) with orange ESCALATION badge. Connecting indicator back to the web events. | *"Two hours later, Priya called support. JourneyX detected this as an escalation — she tried web self-service first, then had to call. That's a channel failure."* |
| 1:58 | Journey Timeline | Scroll to the second call event | call_started event, 3 days later. Yellow REPEAT CONTACT badge: "2nd contact in 7 days" | *"Three days later, she called again about the same issue. JourneyX flagged this as a repeat contact — the first call didn't resolve her problem."* |
| 2:08 | Journey Timeline | Scroll to the end of the timeline | 14-day gap after last event. Rose CHURN SIGNAL badge. | *"Then silence. No activity for 14 days. JourneyX evaluated the pattern — escalation, repeat contact, inactivity — and flagged Priya as high churn risk."* |
| 2:15 | Journey Timeline | Briefly scroll back up to show the full journey | Entire timeline visible: browse → checkout → drop-off → escalation → repeat → churn signal | *"This entire story was invisible before. Each channel only saw its own piece. JourneyX stitched it together."* |

**Expected judge reaction:** "This is powerful." The narrative arc — browse, fail, escalate, repeat, churn — is clear and compelling. Pattern detection is automatic, not manual annotation.

---

#### Scene 5: Analytics Dashboard + Close (2:20–3:00)

| Timestamp | Screen | Action | Data Visible | Narration |
|---|---|---|---|---|
| 2:20 | Journey Timeline | Click "Dashboard" in sidebar | — | *"Priya is one customer. Let's zoom out to the platform level."* |
| 2:23 | Dashboard (`/dashboard`) | Dashboard loads | KPIs: 500 customers, 230 drop-offs, 85 escalations, 12% repeat contact rate, 45 churn-risk customers | *"Across 500 customers, JourneyX detected 230 drop-offs, 85 escalations, and 45 customers at churn risk."* |
| 2:30 | Dashboard | Point to the Escalations by Channel Pair chart | Heatmap showing web→call_center as the hottest pair | *"The data shows that web-to-call-center is the most common escalation path. This tells the CX team exactly where to invest in self-service improvements."* |
| 2:38 | Dashboard | Point to the Friction Points chart | Top friction: checkout_start (web), call_started (call_center) | *"The top friction points are checkout on web and calls to the call center — the same pattern we saw in Priya's journey, but now quantified across the entire customer base."* |
| 2:45 | Dashboard | Click the "45 Churn Risk" KPI card | Navigate to customer list filtered by churn risk | *"And every one of these 45 at-risk customers has a journey just like Priya's — stitched, analyzed, and explainable."* |
| 2:50 | Customer List | Filtered list visible | 45 customers with churn risk badges, pattern indicators | *"Each one can be investigated individually to understand exactly why they're at risk."* |
| 2:55 | — | — | — | *"JourneyX turns fragmented customer interactions into unified journey intelligence. Identity resolution connects the dots. Pattern detection finds the friction. And every insight is explainable and trustworthy."* |

**Expected judge reaction:** "This works at scale, not just for one crafted example." Understanding that the analytics validate the pipeline is processing real volumes of data.

---

### 7.3 Demo Backup Plan

| Risk | Mitigation |
|---|---|
| Live deployment fails | Run locally with `next dev` or `next start`. All synthetic data is seeded from the local database. |
| Database connection fails | Pre-record a 3-minute demo video as backup. |
| Slow load times | Pre-navigate to each screen before the demo so Next.js caches the pages. |
| Unexpected UI bug | Know the demo flow by heart. Skip the broken screen and narrate what it would show. Move on. |
| Runs over 3 minutes | Cut the Analytics Dashboard section (Scene 5) to 15 seconds. The core story (identity resolution + journey + patterns) is Scenes 3–4. |

### 7.4 Pre-Demo Checklist

- [ ] Database seeded with synthetic data including the "Priya Sharma" scenario.
- [ ] All screens navigated once (cache warmed).
- [ ] Search for "priya" tested — results appear.
- [ ] Priya's journey timeline renders with all pattern badges.
- [ ] Priya's identity graph renders with all links and evidence.
- [ ] Dashboard KPIs load correctly.
- [ ] Demo rehearsed end-to-end in under 3 minutes.
- [ ] Backup demo video recorded.

---

## 8. Final App Flow

### 8.1 The Canonical JourneyX Flow

This is the single, definitive end-to-end user journey. Every feature exists to serve this flow. Every screen answers a question in this sequence.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ① DASHBOARD                                                    │
│  "How is our customer experience?"                              │
│                                                                 │
│  User sees: KPIs (500 customers, 87% resolution rate,           │
│  45 churn-risk), charts (events by channel, escalation          │
│  heatmap, friction points)                                      │
│                                                                 │
│  User action: Clicks "45 Churn Risk" KPI card                   │
│                                                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ② CUSTOMER LIST (filtered: churn risk = high, medium)          │
│  "Which customers are at risk?"                                 │
│                                                                 │
│  User sees: 45 customers sorted by risk level, each showing     │
│  name, channels used, pattern badges, churn risk level          │
│                                                                 │
│  User action: Clicks "Priya Sharma" (HIGH risk,                 │
│  3 channels, drop-off + escalation + repeat badges)             │
│                                                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ③ CUSTOMER PROFILE                                             │
│  "Who is this customer and what happened?"                      │
│                                                                 │
│  User sees: 4 linked identifiers (email, phone, cookie,         │
│  device), 98% confidence, 12 events across 3 channels,          │
│  1 drop-off, 1 escalation, 2 repeat contacts, HIGH churn risk   │
│  with signal summary                                            │
│                                                                 │
│  User wants to understand identity → clicks "View Identity"     │
│                                                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ④ IDENTITY GRAPH                                               │
│  "Why does JourneyX think these are the same person?"           │
│                                                                 │
│  User sees: Visual graph with profile at center,                │
│  4 identifier nodes, edges labeled with method + confidence.    │
│  Resolution chain showing how the profile grew:                 │
│    cookie (new profile) → email (login, deterministic) →        │
│    device (mobile, probabilistic 85%) → phone (call, det.)      │
│                                                                 │
│  User trusts the data → clicks "View Journey"                   │
│                                                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ⑤ JOURNEY TIMELINE                                             │
│  "What exactly happened in this customer's journey?"            │
│                                                                 │
│  User sees: 12 events on a vertical timeline.                   │
│  Channel colors: blue (web), purple (mobile), green (call).     │
│  Pattern badges: red DROP-OFF, orange ESCALATION,               │
│  yellow REPEAT CONTACT, rose CHURN SIGNAL.                      │
│  Session and journey boundaries marked.                         │
│                                                                 │
│  User scrolls through the journey:                              │
│                                                                 │
│  ┌── Web Browse (blue) ────────────────────────────────┐        │
│  │ page_view: /products/shoes          Sep 1 10:00     │        │
│  │ product_view: SKU-1234              Sep 1 10:05     │        │
│  │ add_to_cart: SKU-1234               Sep 1 10:08     │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                 │
│  ┌── Mobile (purple) ─────────────────────────────────┐         │
│  │ login: email confirmed              Sep 1 10:30     │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                 │
│  ┌── Web Checkout (blue) ──────────────────────────────┐        │
│  │ checkout_start                      Sep 1 11:00     │        │
│  │ payment_attempt  🔴 DROP-OFF        Sep 1 11:05     │        │
│  │   error: card_declined                              │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                 │
│  ┌── Call Center (green) ──────────────────────────────┐        │
│  │ call_started  🟠 ESCALATION         Sep 1 13:00     │        │
│  │   agent: Raj, duration: 8 min                       │        │
│  │   disposition: pending                              │        │
│  │ call_started  🟡 REPEAT CONTACT     Sep 4 14:00     │        │
│  │   "2nd contact in 7 days"                           │        │
│  │   disposition: unresolved                           │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                 │
│  ── 14-day gap ─── 🌹 CHURN SIGNAL ───────────────────         │
│                                                                 │
│  User expands the payment_attempt event to see:                 │
│  error_code: card_declined, amount: ₹4,999                     │
│                                                                 │
│  User now understands the FULL story:                           │
│  Browse → cart → checkout fail → call support →                 │
│  unresolved → call again → still unresolved → gone             │
│                                                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ⑥ ANALYSIS & INSIGHT                                           │
│  "What does this mean at scale?"                                │
│                                                                 │
│  User returns to Dashboard.                                     │
│  Reviews analytics:                                             │
│  - Web → Call Center is the top escalation path                 │
│  - checkout_start is the top friction point                     │
│  - 12% of customers are repeat contacts                         │
│  - 45 customers show the same churn pattern                     │
│                                                                 │
│  Insight: checkout payment failures drive escalations,           │
│  which drive repeat contacts, which correlate with churn.        │
│  Fix the payment flow → reduce everything downstream.            │
│                                                                 │
│  The journey from fragmented data to actionable insight          │
│  is complete.                                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Flow Summary

| Step | Screen | Question Answered | Time Spent |
|---|---|---|---|
| ① | Dashboard | "How is our CX?" | 15 seconds (scan KPIs) |
| ② | Customer List | "Who needs attention?" | 10 seconds (find the customer) |
| ③ | Customer Profile | "Who is this person?" | 20 seconds (review identifiers, patterns) |
| ④ | Identity Graph | "Can I trust this data?" | 30 seconds (review resolution chain) |
| ⑤ | Journey Timeline | "What happened?" | 2–5 minutes (investigate patterns) |
| ⑥ | Dashboard (return) | "What does this mean at scale?" | 30 seconds (review aggregate analytics) |

### 8.3 Alternate Entry Points

The canonical flow starts at the Dashboard, but analysts may also enter at:

| Entry Point | How | Continues With |
|---|---|---|
| **Search** | Analyst knows a customer's email/phone → uses search bar → jumps directly to Profile (③) | ③ → ④ → ⑤ |
| **Notification** | Analyst receives churn risk alert → clicks notification → jumps to Profile (③) | ③ → ⑤ → ⑥ |
| **Customer List** | Analyst wants to browse a filtered cohort → goes to Customer List (②) with filters applied | ② → ③ → ⑤ |
| **Direct URL** | Analyst receives a shared link to a customer's journey → opens Journey Timeline (⑤) directly | ⑤ → ③ (back to profile for context) |

Every entry point eventually flows through Profile → Journey Timeline — the core investigation loop.

### 8.4 Exit Points

| Exit | From | Why |
|---|---|---|
| Analyst has their answer | Journey Timeline or Analytics | Investigation complete — they found the friction point, the root cause, or the pattern. |
| Analyst shares a finding | Any screen | Copies the URL (filters preserved in URL params) and shares it with a colleague. |
| Analyst moves to next customer | Customer List | Clicks "Back to Customers" and selects the next customer to investigate. |

### 8.5 This Is the Flow

```
Dashboard → Customer List → Profile → Identity → Timeline → Analytics
```

Every feature in JourneyX serves this flow. Every screen answers one question. Every click moves the analyst closer to understanding why a customer's experience broke down.

There are no competing flows, no alternate architectures, no hidden screens. This is JourneyX.

---

*End of Application Flow Specification*
