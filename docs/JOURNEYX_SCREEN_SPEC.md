# JourneyX — Screen Specification

**Version:** 1.0
**Date:** 2026-09-19
**Status:** DRAFT — awaiting approval before screen implementation
**Hackathon:** BIT N BUILD'26 — Gujarat Round · PS-4 (Cross-Channel Journey Stitching)
**Companions:** [UI/UX Design System](JOURNEYX_UI_UX_DESIGN_SYSTEM.md) · [SOURCE_OF_TRUTH](SOURCE_OF_TRUTH.md) · [APP_FLOW](APP_FLOW.md) · [PRD](PRD.md)

This is the definitive, screen-by-screen specification. It composes the reconciled product structure (Source of Truth §4.2, §7) with the design system's components and visual language. Every component reference resolves to a section in the [Design System](JOURNEYX_UI_UX_DESIGN_SYSTEM.md) (cited as **DS §n**).

> **This document does not modify** any PRD, TRD, ARCHITECTURE, DATA_MODEL, APP_FLOW, IMPLEMENTATION_PLAN, SOURCE_OF_TRUTH, BRAND_IDENTITY, or brand asset. It does not contain application code.

---

## 0. Authority & reconciliation notes

Where `APP_FLOW.md` and the `SOURCE_OF_TRUTH.md` disagree on structure, **the SoT wins** (it supersedes APP_FLOW by its own authority clause). The material differences this spec adopts:

| Topic | APP_FLOW said | This spec (per SoT) |
|---|---|---|
| Navigation shell | 240px sidebar, avatar | **56px icon rail, no avatar** (D-41) |
| Customer detail | 3 separate pages (`/profile`, `/journey`, `/identity`) | **One tabbed shell** `customers/[id]` → Overview / Journey / Identity (§4.2) |
| Search route | `/customers?q=` list | **Type-ahead dropdown only**; Enter opens top result; no `q` on the list (D-33) |
| Seed data | "Seed Demo Data" button | **CLI only**; empty state shows the command (D-42) |
| Churn anchor | badge "on the last event" | **Profile-level banner** + silence marker on the thread (D-31) |
| Notifications | 8 types | **2 types**: identity conflict (warning), high churn (critical) (D-37) |
| Dashboard KPIs | mixed sets | **SoT §4.9 canonical set** |
| Timeline filters | full filter toolbar (P0) | **ONLY-IF-TIME** beyond channel (SoT scope) — spec'd, gated |
| Identifier masking | full everywhere | **Masked in list/search/notifications; full on detail** (D-12) |

Domain vocabulary is fixed: channels `web · mobile · call_center · email · chat · in_store`; patterns `drop_off · escalation · repeat_contact · unresolved_issue · churn_signal`; link methods `origin · deterministic · probabilistic · conflict`; confidence bands High 0.95–1.0 / Medium 0.80–0.94 / Low 0.70–0.79 / Origin<0.70; identity confidence = weakest link.

---

## 1. Information architecture

### 1.1 Navigation map

```
JourneyX  (no auth · no settings · no admin)
│
├─ [icon rail]
│   ├─ Dashboard              /dashboard            S-01
│   ├─ Customers              /customers            S-02
│   │   └─ Customer shell     /customers/[id]       S-03  (tabbed)
│   │       ├─ Overview       /customers/[id]              S-03a
│   │       ├─ Journey        /customers/[id]/journey      S-04  (+ inline Event Detail S-06)
│   │       └─ Identity       /customers/[id]/identity     S-05
│   └─ Pipeline (P2)          /pipeline             S-07
│
└─ [top bar · persistent]
    ├─ Global search (⌘K/Ctrl-K)                     S-09 (dropdown)
    └─ Notification bell → panel                     S-08 (dropdown)
```

### 1.2 URL & params (canonical)

| Route | Screen | Params |
|---|---|---|
| `/` → `/dashboard` | redirect | — |
| `/dashboard` | S-01 | `dateFrom, dateTo, channel` |
| `/customers` | S-02 | `page, pageSize, pattern, channel, churnRisk, minConfidence, dateFrom, dateTo, sortBy, sortOrder` |
| `/customers/[id]` | S-03a | — |
| `/customers/[id]/journey` | S-04 | `channel` (P0); `eventType, dateFrom, dateTo, pattern` (ONLY-IF-TIME) |
| `/customers/[id]/identity` | S-05 | `view=fragments\|chain\|evidence` (inset tab) |
| `/pipeline` | S-07 | — |

All filter state lives in URL params (shareable, back-safe). Data is server-rendered from params; only the **search dropdown** and **notification bell** use SWR (SoT §4.1).

### 1.3 Global app shell (frame for every screen)

| Region | Spec (DS refs) |
|---|---|
| Icon rail | 56px, Dashboard/Customers/Pipeline, active = filled icon + teal indicator (DS §11) |
| Top bar | 56px, page `H1`/logo, global search, notification bell (DS §12) |
| Content | 1440px max, 24px gutters ≥xl, 12-col grid (DS §6) |
| Theme | Light reference; dark derived (DS §44) |
| Motion | Page transition 500ms "Flow"; skeleton→content "Resolve" (DS §42) |

---

## 2. Screen inventory (definitive)

| ID | Screen | Route | Primary user | Priority | Purpose (question answered) |
|---|---|---|---|---|---|
| S-01 | Dashboard | `/dashboard` | CX Manager / Analyst | MUST | "How is our customer experience, and where is the friction?" |
| S-02 | Customer List | `/customers` | Analyst | MUST | "Which customers match my investigation criteria?" |
| S-03 | Customer Shell | `/customers/[id]` | Analyst | MUST | Frame: identity + churn context + tab navigation |
| S-03a | ↳ Overview tab | `/customers/[id]` | Analyst | MUST | "Who is this customer and what happened?" |
| S-04 | ↳ Journey tab | `/customers/[id]/journey` | Analyst / Support Ops | MUST | "What exactly happened, and where did it break?" |
| S-05 | ↳ Identity tab | `/customers/[id]/identity` | Analyst | MUST | "Why are these the same customer? Why not others?" |
| S-06 | Event Detail (inline) | within S-04 | Analyst | SHOULD | "What exactly happened at this touchpoint?" |
| S-07 | Pipeline Health | `/pipeline` | Data Admin | P2 / IF-TIME | "Is the pipeline healthy? Are events flowing?" |
| S-08 | Notification Center | dropdown | Analyst | SHOULD | "What needs my attention?" |
| S-09 | Global Search | dropdown | Analyst | MUST | "Find a customer by any identifier, fast." |

---

## 3. S-01 — Dashboard

| Attribute | Detail |
|---|---|
| **Route** | `/dashboard` |
| **Purpose** | At-a-glance journey health + the friction/insight that turns aggregate data into an action. |
| **Primary user goal** | Understand CX health in ~15s; jump to the cohort that needs attention. |
| **Entry points** | Default landing (`/` → `/dashboard`); rail "Dashboard"; brand logo. |

**Main components (DS):** PageHeader + FilterBar (DS §32) · KpiCard row (DS §19) · InsightCard (domain, DS §40.2) · FrictionRanking bar chart · EscalationPairChart · ChurnCorrelation chart · SHOULD charts (events-by-channel, resolution-mix pie, confidence histogram, drop-offs-by-process) all in ChartFrame (DS §34).

**Data displayed (SoT §4.9 canonical KPIs):**
- Unified customers (known / anonymous) · Events processed · **Fragments unified** (distinct identifiers → known profiles; % of known seen on ≥2 channels) · Avg link confidence (excl. new_profile) · Checkout drop-offs · Escalations · Repeat-contact rate · Open unresolved issues · Churn-risk customers (high / medium).
- **Insight card:** the #1 friction point (channel · event_type · reason), affected-customer count, and those customers' churn rate vs baseline — deterministic, "synthetic data" labelled.
- **MUST charts:** Top friction points (ranked bar) · Escalations by channel pair · Churn correlation (with-vs-without lift + n).

**Filters:** Date range (from/to + presets) · Channel (multi-select). Apply to all KPIs and charts. (Pattern-type filtering is via click-through, not an API filter — SoT D-36.)

**Primary actions:** click a KPI card → filtered customer list (e.g. Churn-risk → `/customers?churnRisk=high,medium`); click a chart segment → filtered list; click Insight-card CTA → filtered list of affected customers.
**Secondary actions:** change date/channel filters; toggle theme.

**Navigation:** KPI/chart click-through carries params to S-02. Rail/search/bell persistent.

**States:**
- *Empty (no data):* "No events ingested yet. Seed the demo dataset from the CLI to populate journeys." + mono `npm run seed` (no UI seed button — SoT D-42).
- *Loading:* skeleton KPI row (matching count) + skeleton charts with visible axes (DS §29).
- *Error:* screen-level error block with Retry; per-chart errors inline in their ChartFrame (DS §30).
- *Success:* KPIs populated (mono, tnum); charts rendered; filters reflected in header ("as of {DEMO_AS_OF}, synthetic data").

**Responsive:** KPI row 3–5 across (xl) → 2–3 (md) → 1–2 (mobile). Charts multi-column → single column; Sankey (if built) → simplified bar / "view on larger screen" on mobile (DS §43).

**Demo relevance:** Scenes at 2:20–2:55 (Insight card, friction ranking, churn correlation, escalation-pair → filtered list → Rajesh). All spoken numbers come from seed output (SoT D-46).

---

## 4. S-02 — Customer List

| Attribute | Detail |
|---|---|
| **Route** | `/customers` |
| **Purpose** | Browse, filter, sort unified profiles; investigate cohorts. |
| **Primary user goal** | Narrow to the right customers (e.g. all high-churn), then open one. |
| **Entry points** | Rail "Customers"; Dashboard KPI/chart click-through; notification (via profile). |

**Main components:** PageHeader ("Customers", result count) · FilterRail (DS §32) · FilterChips · DataTable (sortable, paginated — DS §20, §33) · DensityToggle.

**Table columns:**
| Column | Render |
|---|---|
| Customer | Display name, else masked email (DS §15 masking) |
| Channels | ChannelBadge icon cluster (DS §36) |
| Events | mono, tnum, right-aligned |
| Last active | relative (`Caption`) + absolute IST tooltip |
| Identity confidence | ConfidenceMeter compact (4-seg, DS §37) |
| Patterns | PatternBadge cluster: drop-off / escalation / repeat / unresolved (DS §38) |
| Churn risk | ChurnRiskPill High/Medium/None (DS §21) |

**Filters (URL params, AND logic):** Pattern (multi) · Channel (multi) · Churn risk (select) · Min confidence (slider 0–1) · Date range. Active-filter chips + "Clear all".

**Primary actions:** click row → `/customers/[id]` (Overview). Sort by last active / event count / churn risk (`sortBy`, `sortOrder`).
**Secondary actions:** change page size; density toggle; clear filters.

**Navigation:** row → S-03. Filters preserved on back from detail.

**States:**
- *Empty (no data):* "No customer profiles yet. Ingest events to create profiles." + command hint.
- *Empty (no matches):* "No customers match these filters. Try widening the date range or removing a channel." + "Clear filters".
- *Loading:* 10 skeleton rows; filter rail interactive (DS §29).
- *Error:* "Unable to load customers." + Retry.
- *Success:* rows populated; active filters highlighted; pagination "Showing 1–25 of N".

**Responsive:** ≥lg full columns + left filter rail; md hides low-priority columns, filters → drawer; < md rows become stacked record-cards, filters → full-screen sheet (DS §43).

---

## 5. S-03 — Customer Shell (layout)

| Attribute | Detail |
|---|---|
| **Route** | `/customers/[id]` (+ `/journey`, `/identity`) |
| **Purpose** | Persistent identity + risk context wrapping the three tabs. |
| **Primary user goal** | Keep "who + how risky" in view while switching between overview, journey, and identity. |
| **Entry points** | List row; search result; notification deep link. |

**Persistent frame (left summary column, all tabs):**
- **IdentityCard** (DS §40.1): display name; linked identifiers grouped by type with source-channel badges (**full values** — detail screen, SoT D-12); identity-confidence meter (weakest link) + weakest-link explanation; `Anonymous` badge if no strong ID yet.
- **ChurnBanner** (DS §40.1, profile-level per D-31): risk pill + matched rules as evidence.
- **Conflict alert** (DS §25) if `has_identity_conflict`: "This customer has an identity conflict. Review →" (links to Identity tab).
- Quick stats: events, channels (icon cluster), first/last seen IST, silence days.

**Tabs (DS §17 shell tabs, URL-routed):** Overview · Journey · Identity. Active = teal underline + weight.

**States:** 404 → "Customer not found." + "Back to Customers" (DS §30). Loading → skeleton identity card + skeleton tab content. Summary column errors independently from tab content.

**Responsive:** ≥lg two-pane (summary + tab content side-by-side); md/mobile summary collapses to a sticky, expandable header above the tabs (DS §43).

---

### 5a. S-03a — Overview tab

**Purpose / goal:** "Who is this customer and what happened?" — orient before investigating.

**Main components:** JourneyStats block · detected-pattern tiles (interactive KpiCards).

**Data:** total events; channels used (icon cluster); first/last seen (IST); active duration; silence days; **pattern-summary tiles** — Drop-offs, Escalations, Repeat contacts, Unresolved (counts).

**Primary actions:** "View Journey" (Accent button → Journey tab) · "View Identity" (Secondary → Identity tab) · click a pattern tile → `…/journey?pattern={type}` (pre-filtered).
**Secondary actions:** back to list (filters preserved).

**States:** not-empty by definition (a profile has ≥1 event); loading = skeleton tiles; error = Retry.

**Responsive:** tiles 2–4 across → 2 → 1.

**Demo:** the churn banner + rules are read here at 1:45–2:20 (via Journey), and this is the deep-link target for the high-churn notification.

---

## 6. S-04 — Journey tab (Journey Timeline)

| Attribute | Detail |
|---|---|
| **Route** | `/customers/[id]/journey` |
| **Purpose** | The unified, chronological cross-channel journey — the product centerpiece. |
| **Primary user goal** | See the full sequence and pinpoint where/why it broke. |
| **Entry points** | Overview "View Journey"; pattern-tile click (pre-filtered); Identity "View Journey"; notification (via profile). |

**Main components (DS §35, §38):** timeline header (name, "showing N of M events", active channels) · **JourneyThread** (Convergent Thread spine) · **JourneyNode** per event · **TransitionConnector** (channel-gradient stitch) · session/journey boundary markers · **SilenceMarker** (churn tail) · **PatternBadge** annotations · **EventCard** (collapsed/expanded, S-06) · FilterToolbar (channel P0; more IF-TIME).

**Data displayed:** each event's channel (ring + icon), type, timestamp (relative + IST tooltip), 1-line metadata summary, pattern badges; the thread's sessions, journeys, cross-channel transitions; the end-of-thread silence marker with "Silent N days". Journey API returns `session_index, journey_index, is_transition, transition_from`, patterns (anchor + `related_event_ids`), `silence_days` (SoT §4.7).

**Pattern rendering (DS §38):** drop-off (Error, interrupted/fading route, terminal cap) · escalation (Warning, doubled upward route, source→dest) · repeat (Warning, dashed + count chip "2nd contact in 3 days") · unresolved (Info, dotted open segment, "Open ticket TKT-8891") · churn = **banner** (in shell) + silence tail (not an event badge).

**Primary actions:** scroll; click a node → expand EventCard (S-06); click a pattern badge → highlight + scroll to `related_event_ids` (e.g. escalation highlights source+dest; repeat highlights the cluster).
**Secondary actions:** channel filter (P0); "Clear filters"; "View Identity" link; back to Overview.

**Filters:** Channel multi-select (P0, `?channel=`). Event type / date / pattern filters are **ONLY-IF-TIME** (SoT scope) — spec'd but gated; when present, active-filter chips + "Showing N of M" (DS §32).

**Navigation:** stays within the shell; deep-linkable with `?pattern=` and `?channel=`.

**States:**
- *Empty (after filter):* "No events match these filters." + "Clear filters".
- *Loading:* 5 skeleton nodes with channel color bars on a skeleton thread; "Flow" load top→bottom (DS §29, §42).
- *Error:* "Couldn't load journey. …" + Retry (DS §30).
- *Success:* full thread, correct chronological order (even for late-arriving events — ordering by timestamp), transitions and boundaries marked, badges visible, silence tail if applicable.

**Responsive:** ≥lg full thread + inline expand; md narrower nodes, expand as drawer; < md condensed thread, event → bottom sheet, minor same-channel events grouped aggressively (DS §35.6, §43).

**Demo:** 1:05–2:20 — replayed late event stitches in chronologically; scroll shows sessions/transitions; expand E6 (card_declined); badges drop-off → escalation → repeat → unresolved; churn banner + silence tail.

---

## 7. S-06 — Event Detail (inline expansion)

| Attribute | Detail |
|---|---|
| **Route** | Inline within S-04 (expanded EventCard); data from `GET /api/v1/events/:id` (SHOULD) |
| **Purpose** | Full detail of one touchpoint. |
| **Primary user goal** | "What exactly happened here — and why was it linked this way?" |
| **Entry point** | Click a collapsed node/card in the Journey. |

**Main components:** EventCard expanded (DS §38) — header, metadata grid, resolution block, patterns, raw JSON.

**Data displayed:**
- **Header:** channel icon+accent, event type, full timestamp (IST), event ID (mono).
- **Metadata:** all non-null key/values (page_url, product_id, amount ₹, agent_id, disposition, duration, sentiment, error_code, ticket_id…). Null keys hidden.
- **Resolution block:** MethodBadge (deterministic/probabilistic/origin/conflict) + ConfidenceMeter + score (mono) + evidence rows (**including non-matches** — e.g. "next-day cookie → filtered") (DS §37, §39.3).
- **Patterns:** any patterns anchored to this event, with detail (e.g. "Drop-off: checkout started, no purchase within 2h").
- **Raw data:** collapsible JSON (mono).

**Primary actions:** collapse; click a pattern within → highlight related events in the thread.
**Secondary actions:** copy event ID.

**States:** inline spinner while fetching (DS §29); inline error "Unable to load event details. Retry"; success = expand 300ms "Resolve" (DS §42). Not-empty by definition.

**Responsive:** inline on ≥lg; drawer/bottom-sheet on smaller (DS §24, §43).

---

## 8. S-05 — Identity tab (Identity Resolution)

| Attribute | Detail |
|---|---|
| **Route** | `/customers/[id]/identity` (`?view=fragments\|chain\|evidence`) |
| **Purpose** | Make identity resolution explainable — the technical differentiator and demo opener. |
| **Primary user goal** | "Why does JourneyX think these identifiers are one person? And why weren't others linked?" |
| **Entry points** | Overview "View Identity"; Journey "View Identity"; conflict notification deep link. |

**Inset tabs (DS §17):** **Fragments · Chain · Evidence** (SoT §7.6).

**Fragments (DS §39.1) — the "before":**
- One FragmentCard per source system (web analytics = cookie; app = device; call center = phone), each with masked-in-system identifier, channel icon+accent, and the events that system saw.
- Dotted "are these the same?" connectors between fragments.
- Convergence affordance/state → fragments resolve into the unified profile node (teal convergence mark) + identity-confidence meter (weakest link).
- *Demo 0:00–0:25:* "Three systems, three strangers."

**Chain / Convergence graph (DS §39.2):**
- Center = unified profile (teal). Identifier nodes (email, phone, cookie, device, loyalty, name) colored by source channel, labeled type + **full value** (detail screen). Edges = links with MethodBadge + confidence, drawn with confidence line-pattern (solid/mixed/dotted).
- Click identifier node → highlight + scroll to its Evidence row.

**Evidence / Resolution chain (DS §39.3):**
- Chronological rows: timestamp (IST), triggering event (channel+type), MethodBadge, ConfidenceMeter+score, identifiers added, evidence rows for **every scored signal including non-matches** (e.g. "name JW 0.96 → +0.19"; "cookie next-day → new profile"), ambiguity/conflict detail.
- *Demo 0:25–0:55:* walk E1→E4→E7→E9; "same-session 0.80; login bridges to email; email exact 1.00 brings device + phone; weakest link 0.80; name-only/next-day refused."

**Conflicts (DS §39.4):** if `has_identity_conflict` → persistent Warning alert + Conflicts section: both profiles, matched fields, winner rationale ("most events, then earliest"), "pending review — no merge in MVP" (no merge/split UI — SoT).

**Primary actions:** switch inset view; click identifier node → evidence; expand an evidence row.
**Secondary actions:** "View Journey"; back to Overview.

**Filters:** none.

**States:** not-empty by definition (≥1 identifier); loading = skeleton graph + skeleton chain (DS §29); error = Retry; success = graph + chain rendered, "Converge" animation on first load (respects reduced-motion, DS §42).

**Responsive:** ≥lg full graph + chain; md graph scrollable, chain below; < md fragments as stacked cards, graph → simplified link list, chain as list (DS §43).

---

## 9. S-07 — Pipeline Health (P2 / ONLY-IF-TIME)

| Attribute | Detail |
|---|---|
| **Route** | `/pipeline` · `GET /api/v1/pipeline/health` (from `ingestion_log`) |
| **Purpose** | Confirm the pipeline is flowing and surface recent errors. |
| **Primary user goal** | "Are events flowing? Any recent failures?" |
| **Entry points** | Rail "Pipeline". |
| **Priority** | P2 — not in the demo (SoT §7.6). |

**Main components:** stage-flow diagram · identity-stats block · recent-errors DataTable.

**Data displayed:**
- **Stage flow** (from `ingestion_log.stage_reached` / `outcome`): parsed → validated → normalized → deduplicated → resolved → stored → patterns, each with counts; accepted / duplicate / rejected / failed tallies; latency (measured, reported not promised — SoT D-20).
- **Identity stats:** total profiles (known/anonymous), avg link confidence, conflict count, identifiers per profile.
- **Recent errors table:** received_at, channel, event_type, outcome, stage_reached, PII-free error_code/message, latency_ms.

**Primary actions:** Refresh (manual reload).
**Secondary actions:** none (rows informational).

**States:** empty "No events processed yet. Seed the demo dataset from the CLI."; loading = skeleton diagram + table; error = Retry; success = counts + errors.

**Responsive:** stage diagram horizontal scroll on narrow; table → record cards (DS §43).

---

## 10. S-08 — Notification Center (dropdown)

| Attribute | Detail |
|---|---|
| **Surface** | Dropdown panel from the top-bar bell (not a route). |
| **Purpose** | Surface the two alerts that need attention. |
| **Primary user goal** | "What needs my attention?" |
| **Entry point** | Click bell (top bar). |

**Types (SoT §4.10, only two):** `identity_conflict` (warning) · `churn_risk_high` (critical).

**Main components:** NotificationBell + NotificationPanel (DS §27).

**Data displayed:** per item — severity accent + icon, title (`Body Strong`), message (masked identifiers), relative time, unread dot. Unread count on the bell (Error badge, "9+" cap). Latest 20.

**Primary actions:** click item → mark read + close + deep-link (conflict → `/customers/:id/identity`; churn → `/customers/:id`) · "Mark all read".
**Secondary actions:** scroll; outside-click closes.

**Behavior:** SWR poll 30s while tab visible; subtle badge pulse on increment (reduced-motion safe). No toasts, no auto-expiry, no throttling (SoT).

**States:** empty "No notifications. You're all caught up."; loading = 3 skeleton items; error = inline "Unable to load notifications."; success = list with unread distinct.

**Responsive:** panel ≤400px anchored under bell (≥md); full-width sheet from top on mobile (DS §18, §43).

---

## 11. S-09 — Global Search (dropdown)

| Attribute | Detail |
|---|---|
| **Surface** | Top-bar type-ahead dropdown (not a route — SoT D-33). |
| **Purpose** | Fastest path to a customer by any identifier. |
| **Primary user goal** | Find and open the right customer in seconds. |
| **Entry point** | Top-bar field; ⌘K/Ctrl-K from anywhere. |

**Main components:** SearchDropdown (DS §15).

**Data displayed:** per result — display name (or masked email), matched-field chip ("matched: phone"), channel icon cluster, event count (mono), churn-risk pill if any. **Identifiers masked** in results (full only on detail — SoT D-12).

**Behavior:** 300ms debounce → `GET /api/v1/customers/search?q=` (≥3 chars; exact on strong IDs, prefix on others); ↑/↓ navigate, Enter opens top/highlighted result → `/customers/:id`, Esc closes.

**Primary actions:** open a result.
**Secondary actions:** refine query; keyboard nav.

**States:** empty (idle) = placeholder "Search email, phone, name, loyalty ID…"; no results = "No customers match '{q}'."; loading = 3 skeleton rows; success = results list.

**Responsive:** expands to ~480px on ≥lg; icon-trigger → full-width overlay on mobile (DS §12, §43).

**Demo:** the search is the analyst's fast entry; the hero demo opens Priya directly via bookmark (SoT §7.6), but search is shown as the everyday path.

---

## 12. Cross-screen behaviors

| Behavior | Rule |
|---|---|
| **Deep links** | Notifications and shared URLs land on the exact screen + filter state (params) — every filter is in the URL. |
| **Masking** | Masked in list/search/notifications/logs; full on Overview/Journey/Identity/Event detail (SoT D-12). |
| **Time** | Store UTC, display **IST**; relative time + absolute-IST tooltip; `DEMO_AS_OF` drives all "days ago" (SoT §4.8, §7.1). |
| **Numbers** | Every number in-product comes from data/seed output, never from docs (SoT D-46); rendered mono/tnum. |
| **Synthetic label** | Any aggregate that implies real people (churn correlation) is labelled "synthetic data." |
| **Empty/Loading/Error** | Every screen implements all three per DS §28–§30; skeletons preserve layout. |
| **Back/state** | Back preserves list filters; tab switches preserve shell context. |
| **Accessibility** | Keyboard-complete, visible teal focus, ARIA roles, not-color-alone, reduced-motion (DS §41). |

---

## 13. Screen → data/endpoint/component matrix

| Screen | Endpoint(s) | Key DB entities | Key domain components |
|---|---|---|---|
| S-01 Dashboard | `GET /analytics/summary` | events, detected_patterns, customer_profiles | KpiCard, InsightCard, FrictionRanking, EscalationPairChart, ChurnCorrelation |
| S-02 Customer List | `GET /customers` | customer_profiles | DataTable, ChannelBadge, ConfidenceMeter, PatternBadge, ChurnRiskPill, FilterRail |
| S-03/03a Shell + Overview | `GET /customers/:id` | customer_profiles, detected_patterns | IdentityCard, ChurnBanner, ConfidenceMeter, pattern tiles |
| S-04 Journey | `GET /customers/:id/journey` | events, detected_patterns | JourneyThread, JourneyNode, TransitionConnector, PatternBadge, SilenceMarker, EventCard |
| S-05 Identity | `GET /customers/:id/identity` | customer_identifiers, resolution_logs | FragmentsPanel, ConvergenceGraph, ResolutionChain, EvidenceRow, MethodBadge, ConflictNotice |
| S-06 Event Detail | `GET /events/:id` | events, resolution_logs | EventCard (expanded) |
| S-07 Pipeline | `GET /pipeline/health` | ingestion_log | stage diagram, DataTable |
| S-08 Notifications | `GET/POST /notifications`, `/notifications/read` | notifications | NotificationBell, NotificationPanel |
| S-09 Search | `GET /customers/search` | customer_identifiers | SearchDropdown, ChannelBadge, ChurnRiskPill |

---

## 14. Canonical investigation flow (screen sequence)

The single definitive path every feature serves (SoT §7, APP_FLOW §8):

```
Dashboard ──(KPI/insight click)──► Customer List ──(row)──► Customer Shell
   ▲                                                            │
   │                                              ┌─────────────┼─────────────┐
   │                                          Overview       Identity        Journey
   │                                        (who + risk)   (why linked)   (what happened)
   └────────────────(return for scale)◄──────────────────────────────────────┘
```

Alternate entries: **Search** → Shell; **Notification** → Overview/Identity; **direct URL** → any screen with state. Every entry converges on **Overview → Journey/Identity** — the core investigation loop.

---

## 15. Verification

- **Screens, purposes, entry points, states** ← APP_FLOW §2 (reconciled by SoT §0 table above).
- **Shell, tabs, IA, routes, params** ← SoT §4.2, §4.4; APP_FLOW §1.
- **Data per screen (KPIs, patterns, confidence, identity, notifications)** ← SoT §4.6–§4.10, §7.
- **Every component reference** resolves to the Design System (DS §n), which is grounded in the brand assets (Convergent Thread, DS §0/§46).
- **No screen introduces features outside the MVP** (SoT §5); Pipeline (S-07) and beyond-channel Journey filters are correctly gated as P2/IF-TIME.

**Open items (shared with DS §46):** confirm Convergent Thread vs Deep Indigo/Amber; confirm channel accent palette; confirm light+dark vs light-only for the MVP. None blocks screen design.

---

*End of JourneyX Screen Specification v1.0. See [UI/UX Design System](JOURNEYX_UI_UX_DESIGN_SYSTEM.md) for component and token detail.*
