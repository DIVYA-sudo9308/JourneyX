# JourneyX — Frontend Implementation Checklist

**Version:** 1.0
**Date:** 2026-09-19
**Status:** AWAITING APPROVAL — no code until approved
**Authority:** Screen Spec · UI/UX Design System · Source of Truth
**Brand:** Convergent Thread (locked)

---

## 0. Pre-implementation setup

| # | Task | Files | Depends on |
|---|---|---|---|
| F-00a | Install shadcn/ui, add `components.json` with Convergent Thread base colors | `components.json` | Project init |
| F-00b | Add shadcn primitives: `button`, `badge`, `card`, `table`, `input`, `select`, `checkbox`, `slider`, `dialog`, `dropdown-menu`, `tabs`, `tooltip`, `separator`, `skeleton`, `scroll-area`, `sheet`, `popover` | `components/ui/*` | F-00a |
| F-00c | Configure Tailwind + CSS custom properties: primitives (§3.1), derived neutrals (§3.2), channel accents (§4), pattern accents, semantic states, dark-mode overrides | `tailwind.config.ts`, `app/globals.css` | F-00a |
| F-00d | Add Geist + IBM Plex Mono via `next/font/google` or local assets | `app/layout.tsx` | Project init |
| F-00e | Create API fetcher utility + SWR provider config | `lib/api/fetcher.ts`, `app/providers.tsx` | Project init |

---

## 1. App Shell (S-01 frame)

### Screen: Global Layout

| Item | Detail |
|---|---|
| **Route** | Root `app/layout.tsx` — wraps every page |
| **Components** | `IconRail`, `TopBar`, `ThemeProvider` |
| **Data** | Notification unread count (SWR, 30s poll) |
| **API** | `GET /api/v1/notifications` (unread count only for bell badge) |
| **State** | Rail active item (derived from `usePathname()`); theme (`prefers-color-scheme` + manual toggle via CSS class on `<html>`) |
| **Responsive** | `≥lg`: 56px icon rail + top bar; `md`: rail collapses to icons-only (already is); `<md`: rail hidden, hamburger menu in top bar opens full-screen nav sheet |

#### Components to build

| Component | File | Props | Notes |
|---|---|---|---|
| `IconRail` | `components/layout/icon-rail.tsx` | — | 56px, 3 links (Dashboard/Customers/Pipeline), active = filled icon + teal indicator bar. Lucide icons: `LayoutDashboard`, `Users`, `Activity`. |
| `TopBar` | `components/layout/top-bar.tsx` | — | 56px, logo (left), page title `H1`, SearchTrigger (center-right), NotificationBell (right). |
| `SearchTrigger` | `components/layout/search-trigger.tsx` | — | Input-styled button, "Search… ⌘K", opens SearchDropdown. |
| `NotificationBell` | `components/layout/notification-bell.tsx` | — | Bell icon + badge (Error color, "9+" cap). Click opens NotificationPanel. SWR poll 30s. |
| `ThemeProvider` | `components/theme-provider.tsx` | — | Reads `prefers-color-scheme`, sets `data-theme` on `<html>`. Optional manual toggle. |

---

## 2. S-01 — Dashboard

| Item | Detail |
|---|---|
| **Route** | `/dashboard` (`app/dashboard/page.tsx`) |
| **Components** | `PageHeader`, `FilterBar`, `KpiCard` (×9), `InsightCard`, `ChartFrame` (×6), `FrictionRanking`, `EscalationPairChart`, `ChurnCorrelation` |
| **Data** | Analytics summary: KPIs, chart datasets, insight |
| **API** | `GET /api/v1/analytics/summary?dateFrom=&dateTo=&channel=` |
| **State** | URL params (`dateFrom`, `dateTo`, `channel`); server component reads params on render; no SWR needed (server fetch on navigation) |
| **Responsive** | KPI row: 5 cols (xl) → 3 (lg) → 2 (md) → 1 (sm). Charts: 2-col grid → 1-col. |

#### Components to build

| Component | File | Props | Notes |
|---|---|---|---|
| `PageHeader` | `components/shared/page-header.tsx` | `title`, `subtitle?`, `actions?` | Reusable. "as of {date}, synthetic data" subtitle. |
| `FilterBar` | `components/shared/filter-bar.tsx` | `filters`, `onApply` | Date range (from/to + presets) + channel multi-select. URL-synced. |
| `KpiCard` | `components/dashboard/kpi-card.tsx` | `label`, `value`, `delta?`, `icon`, `href?` | Mono tnum value. Click navigates to filtered customer list. |
| `InsightCard` | `components/dashboard/insight-card.tsx` | `title`, `frictionPoint`, `affectedCount`, `churnLift`, `ctaHref` | Domain-specific. "Synthetic data" label. |
| `ChartFrame` | `components/shared/chart-frame.tsx` | `title`, `children`, `loading?`, `error?` | Wrapper with title, loading skeleton, inline error. |
| `FrictionRanking` | `components/dashboard/friction-ranking.tsx` | `data` | Horizontal bar chart (Recharts `BarChart`). |
| `EscalationPairChart` | `components/dashboard/escalation-pair-chart.tsx` | `data` | Bar chart showing source→dest channel pairs. |
| `ChurnCorrelation` | `components/dashboard/churn-correlation.tsx` | `data` | Grouped bar: with-vs-without pattern lift + n. |

#### SHOULD charts (build if time permits)

| Component | Chart type |
|---|---|
| `EventsByChannel` | Bar chart (6 channels) |
| `ResolutionMixPie` | Pie chart (deterministic/probabilistic/new/conflict) |
| `ConfidenceHistogram` | Histogram (4 bands) |
| `DropOffsByProcess` | Bar chart (3 processes) |

#### States

| State | Render |
|---|---|
| Empty | "No events ingested yet. Seed the demo dataset from the CLI…" + `npm run seed` code block |
| Loading | Skeleton KPI row (matching count) + skeleton charts with visible axes |
| Error | Screen-level error block with Retry; per-chart errors inline in ChartFrame |
| Success | KPIs populated; charts rendered; filters reflected in header |

---

## 3. S-02 — Customer List

| Item | Detail |
|---|---|
| **Route** | `/customers` (`app/customers/page.tsx`) |
| **Components** | `PageHeader`, `FilterRail`, `FilterChips`, `DataTable`, `Pagination`, `DensityToggle` |
| **Data** | Paginated customer profiles with pattern/channel/churn summaries |
| **API** | `GET /api/v1/customers?page=&pageSize=&pattern=&channel=&churnRisk=&minConfidence=&dateFrom=&dateTo=&sortBy=&sortOrder=` |
| **State** | All filter/sort/page state in URL params. Server component reads params. |
| **Responsive** | `≥lg`: full columns + left filter rail; `md`: hides low-priority columns, filters → drawer; `<md`: rows become stacked record-cards, filters → full-screen sheet |

#### Components to build

| Component | File | Props | Notes |
|---|---|---|---|
| `FilterRail` | `components/customers/filter-rail.tsx` | `filters`, `onApply` | Pattern (multi-checkbox), channel (multi-checkbox), churn risk (select), min confidence (slider 0–1), date range. |
| `FilterChips` | `components/shared/filter-chips.tsx` | `active`, `onRemove`, `onClearAll` | Active-filter chips + "Clear all". Reusable. |
| `DataTable` | `components/customers/customer-table.tsx` | `data`, `sortBy`, `sortOrder`, `onSort` | 7 columns (see Screen Spec §4). Sortable headers. Row click → navigate. |
| `CustomerRow` | `components/customers/customer-row.tsx` | `customer` | Name (or masked email), ChannelBadge cluster, events (mono), last active (relative + IST tooltip), ConfidenceMeter compact, PatternBadge cluster, ChurnRiskPill. |
| `Pagination` | `components/shared/pagination.tsx` | `page`, `pageSize`, `total`, `onChange` | "Showing 1–25 of N". Reusable. |
| `DensityToggle` | `components/shared/density-toggle.tsx` | `density`, `onChange` | Compact/comfortable. Optional. |

#### Shared badge/indicator components (used across screens)

| Component | File | Notes |
|---|---|---|
| `ChannelBadge` | `components/shared/channel-badge.tsx` | Icon + channel accent color. Lucide: Globe (web), Smartphone (mobile), Phone (call_center), Mail (email), MessageSquare (chat), MapPin (in_store). |
| `ConfidenceMeter` | `components/shared/confidence-meter.tsx` | 4-segment bar. High (≥0.95) green, Medium (0.80–0.94) teal, Low (0.70–0.79) warning, Origin (<0.70) muted. Compact variant for table cells. |
| `PatternBadge` | `components/shared/pattern-badge.tsx` | Icon + pattern accent. TrendingDown (drop-off/error), ArrowUpRight (escalation/warning), RefreshCw (repeat/warning), AlertCircle (unresolved/info). |
| `ChurnRiskPill` | `components/shared/churn-risk-pill.tsx` | High (error), Medium (warning), None (muted). Text + color + icon. |
| `MethodBadge` | `components/shared/method-badge.tsx` | Deterministic / Probabilistic / Origin / Conflict. Styled badge. |

#### States

| State | Render |
|---|---|
| Empty (no data) | "No customer profiles yet. Ingest events…" + command hint |
| Empty (no matches) | "No customers match these filters." + "Clear filters" |
| Loading | 10 skeleton rows; filter rail interactive |
| Error | "Unable to load customers." + Retry |

---

## 4. S-03 — Customer Shell (tabbed layout)

| Item | Detail |
|---|---|
| **Route** | `/customers/[id]` (layout wrapping tabs) |
| **Components** | `IdentityCard`, `ChurnBanner`, `ConflictAlert`, `QuickStats`, `TabNav` |
| **Data** | Customer profile (name, identifiers, churn risk, conflict status, stats) |
| **API** | `GET /api/v1/customers/:id` |
| **State** | Profile data from server component. Tab routing via Next.js nested layouts. |
| **Responsive** | `≥lg`: two-pane (summary left + tab content right); `md`/`<md`: summary collapses to sticky expandable header above tabs |

#### Components to build

| Component | File | Props | Notes |
|---|---|---|---|
| `IdentityCard` | `components/customer/identity-card.tsx` | `profile` | Display name, linked identifiers grouped by type with source-channel badges. **Full values** (detail screen, not masked). Confidence meter (weakest link). `Anonymous` badge if no strong ID. |
| `ChurnBanner` | `components/customer/churn-banner.tsx` | `risk`, `rules` | Profile-level. Risk pill + matched rules as evidence text. |
| `ConflictAlert` | `components/customer/conflict-alert.tsx` | `hasConflict` | Warning alert: "This customer has an identity conflict. Review →" (links to Identity tab). |
| `QuickStats` | `components/customer/quick-stats.tsx` | `profile` | Events, channels (icon cluster), first/last seen IST, silence days. |
| `TabNav` | `components/customer/tab-nav.tsx` | `activeTab` | Overview / Journey / Identity. Teal underline + weight on active. URL-routed. |

#### States

| State | Render |
|---|---|
| 404 | "Customer not found." + "Back to Customers" link |
| Loading | Skeleton identity card + skeleton tab content |
| Error | Summary and tab error independently with Retry |

---

## 4a. S-03a — Overview tab

| Item | Detail |
|---|---|
| **Route** | `/customers/[id]` (default tab, `app/customers/[id]/page.tsx`) |
| **Components** | `JourneyStats`, pattern summary tiles (reuse `KpiCard`) |
| **Data** | Profile stats + pattern counts |
| **API** | Data from parent shell's `GET /api/v1/customers/:id` (no additional fetch) |
| **State** | None beyond parent |
| **Responsive** | Tiles: 4 across (lg) → 2 (md) → 1 (sm) |

#### Components to build

| Component | File | Props | Notes |
|---|---|---|---|
| `JourneyStats` | `components/customer/journey-stats.tsx` | `profile` | Total events, channels used, first/last seen, active duration, silence days. |
| Pattern tiles | Reuse `KpiCard` | `label`, `value`, `icon`, `href` | Drop-offs, Escalations, Repeat contacts, Unresolved. Click → `…/journey?pattern={type}`. |

#### Actions

| Action | Target |
|---|---|
| "View Journey" (Accent button) | Journey tab |
| "View Identity" (Secondary button) | Identity tab |
| Click pattern tile | `…/journey?pattern={type}` |

---

## 5. S-04 — Journey Timeline tab

| Item | Detail |
|---|---|
| **Route** | `/customers/[id]/journey` (`app/customers/[id]/journey/page.tsx`) |
| **Components** | `JourneyThread`, `JourneyNode`, `TransitionConnector`, `SessionBoundary`, `JourneyBoundary`, `SilenceMarker`, `EventCard`, `TimelineFilterBar` |
| **Data** | Events with session/journey indexes, transitions, patterns, silence_days |
| **API** | `GET /api/v1/customers/:id/journey?channel=` (P0 filter) |
| **State** | URL params (`channel`; `eventType`, `dateFrom`, `dateTo`, `pattern` are ONLY-IF-TIME). Scroll position maintained on expand/collapse. |
| **Responsive** | `≥lg`: full thread + inline expand; `md`: narrower nodes, expand as drawer; `<md`: condensed thread, event → bottom sheet |

#### Components to build

| Component | File | Props | Notes |
|---|---|---|---|
| `JourneyThread` | `components/journey/journey-thread.tsx` | `events`, `patterns` | The vertical spine (Convergent Thread motif). Container for all nodes/connectors. |
| `JourneyNode` | `components/journey/journey-node.tsx` | `event` | Channel-colored ring + icon, event type, relative timestamp + IST tooltip, 1-line metadata, pattern badges. Click → expand EventCard. |
| `TransitionConnector` | `components/journey/transition-connector.tsx` | `from`, `to` | Channel-gradient stitch between different-channel consecutive events. |
| `SessionBoundary` | `components/journey/session-boundary.tsx` | `gapMinutes` | 30-min gap marker. Subtle divider with "Session break · {duration} gap". |
| `JourneyBoundary` | `components/journey/journey-boundary.tsx` | `gapHours` | 24-hour gap marker. Stronger divider with "New journey · {duration} gap". |
| `SilenceMarker` | `components/journey/silence-marker.tsx` | `days` | End-of-thread churn tail. "Silent {N} days" with fading opacity. |
| `EventCard` | `components/journey/event-card.tsx` | `event`, `expanded`, `onToggle` | Collapsed: 1-line summary. Expanded: full metadata grid, resolution block (MethodBadge + ConfidenceMeter + evidence), patterns, raw JSON collapsible. See S-06 below. |
| `TimelineFilterBar` | `components/journey/timeline-filter-bar.tsx` | `filters`, `onChange` | Channel multi-select (P0). "Showing N of M events". Active-filter chips + "Clear". |

#### Pattern rendering within timeline

| Pattern | Visual |
|---|---|
| Drop-off | Error accent, interrupted/fading route, terminal cap |
| Escalation | Warning accent, doubled upward route, source→dest label |
| Repeat contact | Warning accent, dashed connector, count chip "2nd contact in 3 days" |
| Unresolved | Info accent, dotted open segment, "Open ticket TKT-XXXX" |
| Churn | Banner in shell (not event badge) + silence tail at thread end |

#### States

| State | Render |
|---|---|
| Empty (after filter) | "No events match these filters." + "Clear filters" |
| Loading | 5 skeleton nodes with channel color bars on skeleton thread; top→bottom "Flow" animation |
| Error | "Couldn't load journey." + Retry |

---

## 5a. S-06 — Event Detail (inline expansion)

| Item | Detail |
|---|---|
| **Route** | Inline within S-04 (expanded `EventCard`) |
| **Components** | `EventCard` expanded state |
| **Data** | Full event: metadata, resolution, patterns, raw JSON |
| **API** | `GET /api/v1/events/:id` (SHOULD — fetch on expand) |
| **State** | Expanded/collapsed per event (local component state) |
| **Responsive** | `≥lg`: inline expand; `md`/`<md`: drawer or bottom-sheet |

#### Expanded EventCard sections

| Section | Content |
|---|---|
| Header | Channel icon+accent, event type, full timestamp IST, event ID (mono) |
| Metadata | All non-null key/values (page_url, product_id, amount ₹, agent_id, etc.) |
| Resolution | MethodBadge + ConfidenceMeter + score + evidence rows (including non-matches) |
| Patterns | Badges for patterns anchored to this event, with detail text |
| Raw data | Collapsible JSON (mono, IBM Plex Mono) |

---

## 6. S-05 — Identity tab

| Item | Detail |
|---|---|
| **Route** | `/customers/[id]/identity` (`app/customers/[id]/identity/page.tsx`) |
| **Components** | `FragmentsPanel`, `ConvergenceGraph`, `ResolutionChain`, `EvidenceRow`, `ConflictNotice`, inset tabs (Fragments / Chain / Evidence) |
| **Data** | Identifiers with confidence, resolution logs with evidence, conflict details |
| **API** | `GET /api/v1/customers/:id/identity` |
| **State** | URL param `view=fragments|chain|evidence` (inset tab). Local expand/collapse on evidence rows. |
| **Responsive** | `≥lg`: full graph + chain side-by-side; `md`: graph scrollable, chain below; `<md`: fragments as stacked cards, graph → simplified link list, chain as scrollable list |

#### Components to build

| Component | File | Props | Notes |
|---|---|---|---|
| `FragmentsPanel` | `components/identity/fragments-panel.tsx` | `identifiers`, `events` | "Before" view. One FragmentCard per source system. Dotted connectors. Convergence → unified node (teal). |
| `FragmentCard` | `components/identity/fragment-card.tsx` | `source`, `identifier`, `events` | Channel icon+accent, masked identifier, event list from that system. |
| `ConvergenceGraph` | `components/identity/convergence-graph.tsx` | `identifiers`, `links` | Center = unified profile (teal). Identifier nodes colored by source channel. Edges = links with MethodBadge + confidence. CSS/SVG layout. |
| `ResolutionChain` | `components/identity/resolution-chain.tsx` | `logs` | Chronological rows. Each row: timestamp, event, method, confidence, identifiers added, evidence. |
| `EvidenceRow` | `components/identity/evidence-row.tsx` | `evidence` | Per-signal evidence: signal type, value, weight, score, matched boolean, detail text. Includes non-matches. |
| `ConflictNotice` | `components/identity/conflict-notice.tsx` | `conflict` | Warning alert. Both profiles, matched fields, winner rationale. "Pending review — no merge in MVP." |

#### States

| State | Render |
|---|---|
| Loading | Skeleton graph + skeleton chain |
| Error | Retry |
| Success | Graph + chain rendered; "Converge" animation on first load (respects `prefers-reduced-motion`) |

---

## 7. S-08 — Notification Center (dropdown)

| Item | Detail |
|---|---|
| **Route** | Dropdown panel (not a route) |
| **Components** | `NotificationPanel`, `NotificationItem` |
| **Data** | Notifications (latest 20), unread count |
| **API** | `GET /api/v1/notifications` (SWR 30s poll); `POST /api/v1/notifications/read` |
| **State** | SWR cache. Open/closed (local state on bell). |
| **Responsive** | `≥md`: ≤400px panel anchored under bell; `<md`: full-width sheet from top |

#### Components to build

| Component | File | Props | Notes |
|---|---|---|---|
| `NotificationPanel` | `components/notifications/notification-panel.tsx` | `notifications`, `onMarkRead`, `onMarkAllRead` | Scrollable list. "Mark all read" action. |
| `NotificationItem` | `components/notifications/notification-item.tsx` | `notification`, `onOpen` | Severity accent + icon, title, message (masked identifiers), relative time, unread dot. Click → mark read + deep-link. |

#### Notification types (only 2)

| Type | Severity | Deep link |
|---|---|---|
| `identity_conflict` | Warning (amber) | `/customers/:id/identity` |
| `churn_risk_high` | Critical (error red) | `/customers/:id` |

---

## 8. S-09 — Global Search (dropdown)

| Item | Detail |
|---|---|
| **Route** | Dropdown (not a route) |
| **Components** | `SearchDropdown`, `SearchResult` |
| **Data** | Search results (customer matches) |
| **API** | `GET /api/v1/customers/search?q=` (≥3 chars, 300ms debounce) |
| **State** | SWR with debounced key. Open/closed. Selected index for keyboard nav. |
| **Responsive** | `≥lg`: ~480px dropdown; `<md`: icon-trigger → full-width overlay |

#### Components to build

| Component | File | Props | Notes |
|---|---|---|---|
| `SearchDropdown` | `components/search/search-dropdown.tsx` | — | Input + results list. ⌘K/Ctrl-K to open. ↑/↓ navigate, Enter opens, Esc closes. |
| `SearchResult` | `components/search/search-result.tsx` | `result` | Display name (or masked email), matched-field chip, channel icon cluster, event count, churn pill. |

---

## 9. S-07 — Pipeline Health (P2 / ONLY-IF-TIME)

| Item | Detail |
|---|---|
| **Route** | `/pipeline` (`app/pipeline/page.tsx`) |
| **Components** | `StageFlowDiagram`, `IdentityStats`, `ErrorTable` |
| **Data** | Pipeline stage counts, identity stats, recent errors |
| **API** | `GET /api/v1/pipeline/health` |
| **State** | Server component. Manual refresh button. |
| **Responsive** | Stage diagram: horizontal scroll on narrow. Table → record cards. |

---

## 10. Loading / Error / Empty states

Every screen implements all three. Skeletons preserve layout shape.

| Screen | Loading | Empty | Error |
|---|---|---|---|
| Dashboard | Skeleton KPIs + skeleton charts with visible axes | "No events ingested yet…" + `npm run seed` | Screen-level Retry + per-chart inline error |
| Customer List | 10 skeleton rows; filter rail interactive | "No customer profiles yet…" / "No matches…" + "Clear filters" | "Unable to load customers." + Retry |
| Customer Shell | Skeleton identity card + skeleton tab | 404: "Customer not found." + back link | Summary + tab error independently |
| Overview tab | Skeleton tiles | Not-empty by definition (≥1 event) | Retry |
| Journey | 5 skeleton nodes on skeleton thread | "No events match…" + "Clear filters" | Retry |
| Identity | Skeleton graph + skeleton chain | Not-empty by definition | Retry |
| Notifications | 3 skeleton items | "No notifications. You're all caught up." | "Unable to load notifications." inline |
| Search | 3 skeleton rows | "No customers match '{q}'." | Inline error |
| Pipeline | Skeleton diagram + table | "No events processed yet…" | Retry |

---

## 11. SWR hooks

| Hook | File | Endpoint | Refresh | Notes |
|---|---|---|---|---|
| `useAnalytics` | `hooks/use-analytics.ts` | `GET /analytics/summary` | None (server component, re-fetches on filter change via navigation) | Dashboard uses server fetch |
| `useCustomers` | `hooks/use-customers.ts` | `GET /customers` | None (server component) | List uses server fetch |
| `useCustomer` | `hooks/use-customer.ts` | `GET /customers/:id` | None (server component) | Shell uses server fetch |
| `useJourney` | `hooks/use-journey.ts` | `GET /customers/:id/journey` | None (server component) | Timeline uses server fetch |
| `useIdentity` | `hooks/use-identity.ts` | `GET /customers/:id/identity` | None (server component) | Identity uses server fetch |
| `useSearch` | `hooks/use-search.ts` | `GET /customers/search?q=` | Debounced (300ms) | Client-side SWR. ≥3 chars. |
| `useNotifications` | `hooks/use-notifications.ts` | `GET /notifications` | 30s poll (`refreshInterval`) | Client-side SWR. Unread count for bell badge. |

> **SoT §4.1:** Server-rendered from params. Only search dropdown and notification bell use SWR.

---

## 12. Shared / reusable components summary

| Component | Used by screens | Priority |
|---|---|---|
| `PageHeader` | Dashboard, Customer List | MUST |
| `FilterBar` | Dashboard | MUST |
| `FilterChips` | Customer List, Journey (IF-TIME) | MUST |
| `ChartFrame` | Dashboard | MUST |
| `Pagination` | Customer List | MUST |
| `ChannelBadge` | Customer List, Customer Shell, Journey, Identity, Search | MUST |
| `ConfidenceMeter` | Customer List, Customer Shell, Identity, Event Detail | MUST |
| `PatternBadge` | Customer List, Overview, Journey | MUST |
| `ChurnRiskPill` | Customer List, Customer Shell, Search | MUST |
| `MethodBadge` | Event Detail, Identity | MUST |
| `EmptyState` | All screens | MUST |
| `ErrorDisplay` | All screens | MUST |
| `SkeletonCard` / `SkeletonRow` | All screens | MUST |

---

## 13. Implementation order

Build in this sequence — each step produces a visible, testable increment:

```
Step 1:  F-00a–e  Setup (Tailwind tokens, shadcn, fonts, fetcher)
Step 2:  Shell    IconRail + TopBar + layout → app renders with nav
Step 3:  Shared   ChannelBadge, ConfidenceMeter, PatternBadge, ChurnRiskPill, MethodBadge,
                  PageHeader, FilterChips, Pagination, EmptyState, ErrorDisplay
Step 4:  S-01     Dashboard (KpiCards + MUST charts)
Step 5:  S-02     Customer List (table + filters + pagination)
Step 6:  S-03     Customer Shell (IdentityCard + ChurnBanner + tabs)
Step 7:  S-03a    Overview tab (stats + pattern tiles)
Step 8:  S-04     Journey Timeline (thread + nodes + patterns)
Step 9:  S-06     Event Detail (expanded card)
Step 10: S-05     Identity tab (fragments + graph + chain)
Step 11: S-09     Search dropdown
Step 12: S-08     Notification center
Step 13: States   Loading skeletons + error boundaries for all screens
Step 14: Dark     Dark mode pass (verify all tokens, contrast, charts)
Step 15: S-07     Pipeline Health (P2 — only if ahead)
```

---

## 14. Color token quick reference

### Brand (do not modify)

| Token | Light | Dark |
|---|---|---|
| `--jx-ink-900` | `#0B1220` | `#0B1220` |
| `--jx-slate-700` | `#344054` | `#344054` |
| `--jx-teal-500` | `#10B7A5` | `#10B7A5` |
| `--jx-bg` | `#F7F8FA` | `#0B1220` (ink) |
| `--jx-surface` | `#FFFFFF` | `#1D2739` |
| `--jx-border` | `#D9DEE7` | `#2D3A4F` |

### Channel accents (subordinate to brand — identification only)

| Channel | Token | Hex |
|---|---|---|
| Web | `--jx-channel-web` | Per design system §4 |
| Mobile | `--jx-channel-mobile` | Per design system §4 |
| Call Center | `--jx-channel-call-center` | Per design system §4 |
| Email | `--jx-channel-email` | Per design system §4 |
| Chat | `--jx-channel-chat` | Per design system §4 |
| In-Store | `--jx-channel-in-store` | Per design system §4 |

### Usage rules (locked)

- Signal Teal = primary CTAs, navigation active, brand accent
- Channel colors = channel identification ONLY (never CTAs, never nav)
- Semantic states (success/warning/error/info) = separate from channels
- Not color alone: every state uses color + shape/glyph + label

---

## 15. Accessibility checklist (per screen)

| Requirement | Standard |
|---|---|
| Color contrast | WCAG 2.1 AA (4.5:1 text, 3:1 UI/graphics) — both themes |
| Keyboard nav | Full keyboard-complete; visible teal focus ring |
| ARIA | Roles on interactive elements; live regions for notifications |
| Not color alone | Every channel, pattern, confidence, churn state has icon + label |
| Reduced motion | `prefers-reduced-motion`: disable Converge animation, Flow load, transitions |
| Screen reader | Alt text on SVG graphs; table headers; landmark regions |

---

*Awaiting approval before frontend implementation begins.*
