# JourneyX — Project Source of Truth

**Status:** DRAFT: waiting for team approval. No application code has been written.
**Date:** 2026-09-19
**Hackathon:** BIT N BUILD'26, Gujarat Round, PS-4 (Cross-Channel Journey Stitching)
**Authority:** Once approved, this document overrides PRD, TRD, ARCHITECTURE, DATA_MODEL, APP_FLOW, IMPLEMENTATION_PLAN, the CHANGELOG and the Analytics mockup wherever they disagree. After approval, update those documents to match it (see D-03).

---

## 0. Scope of the audit

### 0.1 Materials audited (read in full)

| File | Lines | Stated version |
|---|---|---|
| `docs/PRD.md` | 1,490 | 1.0 |
| `docs/TRD.md` | 3,148 | 1.0 |
| `docs/ARCHITECTURE.md` | 1,746 | 1.0 |
| `docs/DATA_MODEL.md` | 1,680 | 1.0 |
| `docs/APP_FLOW.md` (includes features and notifications) | 1,537 | 1.0 |
| `docs/IMPLEMENTATION_PLAN.md` | 2,553 | 1.0 |
| `CHANGELOG.md` | 40 | "revision 1.1" |
| `Journey Analytics — Sankey + funnel-html/` (mockup, README, runtime) | — | — |

### 0.2 Listed materials that are NOT in the project folder

| Material | Status | Consequence |
|---|---|---|
| Official PS-4 problem statement (verbatim) | **Missing** | Priority rule #1 can't be applied directly. PRD §1–2 is used as a *provisional* proxy. |
| Deep research | **Missing** | Priority rule #2 can't be applied. |
| UI/UX Design Brief | **Missing** | The mockup is the only design input. |
| Brand assets / logo / palette / typography / fonts | **Missing** | The palette is chosen in D-38. |
| Standalone Notifications / Features document | Not separate | Covered by APP_FLOW §4–6. No gap. |

---

## 1. Document consistency report

Legend: ✅ consistent · ⚠️ minor drift · ❌ material conflict (an implementer would build different things)

| # | Dimension | Status | Summary |
|---|---|---|---|
| 1 | Problem statement | ⚠️ | All documents paraphrase PS-4 the same way, but the verbatim PS-4 text is missing. The PRD claims "which experiences correlate with churn", yet no document defines a churn *outcome*, so correlation can't be computed (D-30). |
| 2 | Product vision | ✅ | Every document agrees: identity resolution + stitching + journey intelligence for analysts. No CRM, chatbot or marketing features. |
| 3 | Features | ❌ | The documents disagree on which drop-off processes exist, how churn rules work, what counts as a repeat contact, dashboard KPI sets, notification types and whether probabilistic matching is P0 (D-14, D-25…D-29, D-37, D-40). |
| 4 | User roles | ⚠️ | There are 4 personas but no authentication. The Pipeline page (Data Admin) is P2, so only the Analyst and CX Manager are demo-relevant. The mockup shows a user avatar ("KP"), which implies login (D-41). |
| 5 | App flow | ⚠️ | The route structure is consistent. Conflicts: a "Seed Demo Data" button, `/customers?q=` search, a churn badge "on the last event", and "CRM lookup" narration (D-13, D-31, D-33, D-42). |
| 6 | Database schema | ❌ | The global `UNIQUE(identifier_type, identifier_value)` breaks identifier expansion. The `unknown` category is missing from the CHECK constraint. `resolution_logs` lacks the `identifiers_added` field that the API returns. There is no pattern-level uniqueness, so duplicates pile up. Notification columns differ between the TRD and DATA_MODEL (D-06, D-16, D-24, D-32). |
| 7 | API | ⚠️ | Notification endpoints are missing from the TRD. ARCHITECTURE calls an undefined `/notifications/count`. Endpoint counts don't match. Search routing differs. Server Components are told to fetch their own API routes (D-32…D-36). |
| 8 | Architecture | ✅/⚠️ | Everyone agrees on a monolith with a synchronous pipeline and no broker. Problems: "SSR at the edge" is incompatible with Prisma. The transaction ordering in the ARCH sequence diagram violates a foreign key. ARCH §14.6 wrongly says there are no contradictions (D-03, D-18, D-50). |
| 9 | UI/UX | ❌ | The mockup is dark-only with IBM Plex and its own channel palette. TRD/IMPL specify light+dark, Inter/JetBrains Mono and a *different* palette. The mockup's marketing funnel and fintech content contradict DATA_MODEL §1.1 (D-38…D-41). |
| 10 | Tech stack | ⚠️ | The stack itself is consistent: Next.js, Prisma, Postgres, shadcn, Recharts, SWR, Zod, Vitest. Pinned majors (Next 14, Tailwind 3, Prisma 5) are dated by 2026-09 (D-49). |
| 11 | AI/ML | ⚠️ | The TRD says "one lightweight ML technique", ARCH says "AI/ML in two places", and both then say "not ML". The confidence formula itself conflicts across 4 documents (D-04, D-53). |
| 12 | Notifications | ❌ | The PRD has 3 notification types, APP_FLOW has 8 (with auto-expiry that needs a scheduler), and IMPL has 4. The PRD explicitly *forbids* repeat-contact notifications, which APP_FLOW and IMPL require (D-37). |
| 13 | Implementation plan | ❌ | IMPL re-specifies detectors, churn rules, taxonomy, confidence bands and the demo fixture differently from the PRD/TRD. It forbids updating the docs during the build. It assumes a 48-hour, 3-person team, which no other document confirms (D-03, D-52). |

### 1.1 The root cause

The CHANGELOG ("revision 1.1") says six corrections were applied: fixed evidence scores capped at 0.94, per-profile link uniqueness, `asOf` time evaluation, reconciled pattern snapshots, a mockup banner, and a corrected Priya fixture (4 channels, mean 0.8667). It also says the "TRD and DATA_MODEL SQL blocks [were] synchronized" (69 columns / 9 CHECKs / 27 indexes).

**None of those changes appear in PRD, TRD, ARCHITECTURE, DATA_MODEL, APP_FLOW or the mockup.** All six documents still say v1.0. DATA_MODEL still reports 68 columns, 8 CHECKs and 19 indexes, and the mockup has no banner. IMPLEMENTATION_PLAN picked up some of the changes (0.94 cap, `asOf`) and bolted them onto the old formulas. The CHANGELOG also lists files as `ARCHITECTURE(1).md`, `DATA_MODEL(1).md` and `Analytics.dc(1).html`, which suggests the corrected files were never copied into this folder.

**Result:** the project has **three incompatible identity-scoring models, three Priya fixtures, three event taxonomies, two churn rule sets and two drop-off definitions.**

### 1.2 Duplications (not conflicts, but maintenance risk)

- The full DDL appears in both TRD §3.2 and DATA_MODEL §15 (and they have already drifted).
- The resolution algorithm is written out four times: PRD §9, TRD §7, ARCH §6 and IMPL §6.
- The demo script appears three times: PRD §18, APP_FLOW §7 and IMPL §16.
- **Decision:** after approval, each topic lives in one place: schema in DATA_MODEL, algorithms in TRD, demo in APP_FLOW. Every other document links to it instead of copying it.

### 1.3 Missing dependencies (needed by some document, defined by none)

1. **A churn outcome definition.** It's needed for "correlates with churn" (D-30).
2. **Anonymous-to-known bridging (cookie continuity).** Without it, pre-login browsing is orphaned (D-05).
3. **A time source for time-window detectors (`asOf`).** Without one, results depend on the seeding date and never refresh (D-23).
4. **Pattern idempotency.** Without it, patterns are re-inserted on every event (D-24).
5. **Ground truth for "Resolution Accuracy"** (PRD §17). The generator must emit a true person ID (D-45).
6. **Notification endpoints in the TRD API spec** (D-32).
7. **A fixed demo clock** so screen contents are reproducible on demo day (D-23).
8. **Protection for write endpoints** on a public deployment (D-21).
9. **Hackathon build window and team size** (D-52).

---

## 2. Decision register

Precedence applied: PS-4 → Research → PRD → TRD → Architecture → Data Model → App Flow → UI/UX → Implementation Plan. PS-4 and Research are missing, so the PRD is the highest available authority. A lower-ranked document wins only where the higher one is **internally contradictory or unimplementable**, and each such case says so.

### A. Governance

**D-01 — Document revision drift**
- CONFLICT: The CHANGELOG describes rev 1.1 fixes that are absent from the documents.
- DOCUMENT A: CHANGELOG items 1–6 and "Related consistency fixes".
- DOCUMENT B: PRD, TRD, ARCH, DATA_MODEL and APP_FLOW (all v1.0, unchanged); the mockup (no banner).
- WHY IT CONFLICTS: Implementers can't tell which version is real. IMPL mixes both.
- RECOMMENDED DECISION: Treat all documents as v1.0. This Source of Truth supersedes them. Adopt the *intent* of CHANGELOG items 1–5 through D-04, D-05, D-06, D-23 and D-24. Ignore the CHANGELOG's statistics.
- REASON: The CHANGELOG's direction is sound, but its claims can't be verified against the files.
- IMPACTED DOCUMENTS: All.

**D-02 — Missing primary sources**
- CONFLICT: The priority rules rank PS-4 and Research first, but neither is present.
- DOCUMENT A: The task brief (lists PS-4, Research, UI/UX brief and brand assets).
- DOCUMENT B: The project folder (contains none of them).
- WHY IT CONFLICTS: The product can't be verified against the official statement.
- RECOMMENDED DECISION: Use PRD §1–2 as the provisional PS-4 proxy. The team supplies the verbatim PS-4 text before M2. Any mismatch reopens D-30.
- REASON: Avoids silently inventing requirements.
- IMPACTED DOCUMENTS: PRD, this document.

**D-03 — False consistency claims and the doc-freeze rule**
- CONFLICT: ARCH §14.6 says "No structural contradictions found". IMPL §14.1 says the PRD, TRD and others get "No changes during implementation".
- DOCUMENT A: ARCH §14.6, IMPL §14.1.
- DOCUMENT B: This audit (dozens of material conflicts).
- WHY IT CONFLICTS: Freezing contradictory documents locks the contradictions in.
- RECOMMENDED DECISION: Withdraw ARCH §14.6. After approval, update the documents once to match this register, then freeze them. Log any later change here first.
- REASON: A single source of truth needs a change process.
- IMPACTED DOCUMENTS: ARCH, IMPL.

### B. Identity resolution

**D-04 — Probabilistic confidence formula**
- CONFLICT: There are four incompatible formulas.
- DOCUMENT A: PRD §9.4, TRD §7.3/7.5/7.6, ARCH §6.2 and DATA_MODEL §4.3 use `score / max_possible`, normalized over the signals present. A cookie-only match scores **1.0**.
- DOCUMENT B: IMPL T-018 and §6.1 normalize *and* cap at 0.94. The CHANGELOG uses fixed contributions capped at 0.94 with *no* normalization. TRD §16.2 expects a cookie-only match to fall below threshold, which contradicts the TRD's own formula.
- WHY IT CONFLICTS: Under normalization, any single weak signal (a shared cookie, or a matching name) produces a maximum-confidence link. That is the false-positive risk TRD §19.2 warns about.
- RECOMMENDED DECISION: **Additive fixed-contribution evidence score, no normalization, cap 0.94, match threshold 0.70.** Contributions: device_id exact 0.60 · cookie_id exact 0.30 · session continuity 0.50 (D-05) · name Jaro-Winkler ≥ 0.85 → 0.20 × similarity · cross-channel temporal proximity (±2 h) 0.10. Name and temporal signals can only *corroborate*; they never generate candidates. Deterministic matches stay at 1.00. The full specification is in §4.6.
- REASON: This is the only option that satisfies the TRD's own test expectations and TRD §19.2 ("prefer precision"). It keeps deterministic (1.0) distinct from probabilistic (≤0.94), and it's simple to explain on screen. Overriding the PRD formula is justified because the PRD formula contradicts PRD §19 (conservative thresholds).
- IMPACTED DOCUMENTS: PRD §9.4–9.5, TRD §7, §11.2, §16.2; ARCH §6, §9.4; DATA_MODEL §4.3, §8.2; IMPL §6.

**D-05 — Linking anonymous sessions to known customers (cookie continuity)**
- CONFLICT: This case is undefined everywhere, yet every demo fixture depends on it.
- DOCUMENT A: TRD §7.3. With 0 strong matches the event goes to probabilistic scoring. A cookie on the same channel scores 0.30/0.30 = 1.0 under the TRD, or 0.30 under the CHANGELOG, which creates a new profile.
- DOCUMENT B: DATA_MODEL §13.3 labels evt_004 "probabilistic 0.85", but under the TRD's own rules that event would create a *new* profile (see D-43). IMPL §11.3 says "Deterministic via cookie", but cookies aren't strong identifiers.
- WHY IT CONFLICTS: Without a defined rule, pre-login browsing either links at 1.0 (unsafe) or orphans into a separate profile (breaks the journey).
- RECOMMENDED DECISION: Add a **session-continuity signal (+0.50)**. It applies when the candidate profile has an event on the *same channel* with the *same cookie_id/device_id* within 30 minutes of this event. A login event carrying cookie + a new email therefore links to the anonymous browsing profile at 0.80 and adds the email (the "authenticated-session bridge"). The same cookie on a different day scores 0.30 and stays separate. **No profile merges.** This is a documented limitation.
- REASON: It matches CHANGELOG item 3's intent ("limited same-session cookie-continuity rule") and is honest about identity.
- IMPACTED DOCUMENTS: TRD §7, ARCH §6, DATA_MODEL §4.4, IMPL §6.

**D-06 — Identifier uniqueness**
- CONFLICT: The global unique constraint contradicts identifier expansion.
- DOCUMENT A: TRD §3.2 and DATA_MODEL §3.2/§15 define `UNIQUE(identifier_type, identifier_value)` for **all** types, including cookie, device and name.
- DOCUMENT B: TRD §7.9 and ARCH §6.2 say to insert every new identifier on a match. The CHANGELOG says links are unique per profile, with global uniqueness only for email, phone and loyalty_id.
- WHY IT CONFLICTS: Two customers named "Priya Sharma", or one family laptop, would cause an insert that violates the constraint, and the event ingestion fails (500). DATA_MODEL's own fixture would hit this at evt_005.
- RECOMMENDED DECISION: Use `UNIQUE(profile_id, identifier_type, identifier_value)`, plus a partial unique index on `(identifier_type, identifier_value) WHERE identifier_type IN ('email','phone','loyalty_id')`.
- REASON: Strong identifiers must point to a single person. Weak keys and names are legitimately shared.
- IMPACTED DOCUMENTS: TRD §3.2, DATA_MODEL §2.3, §3.2, §15.

**D-07 — Contradiction and ambiguity guards**
- CONFLICT: These guards exist only in the CHANGELOG.
- DOCUMENT A: CHANGELOG item 3 ("ambiguity and contradiction checks").
- DOCUMENT B: The TRD/ARCH algorithms (no guards).
- WHY IT CONFLICTS: A shared family device can link an event carrying email B into the profile of person A.
- RECOMMENDED DECISION: (1) **Contradiction:** discard a candidate that owns a strong identifier of a type present on the event with a *different* value. (2) **Ambiguity:** if the best score ≥ 0.70 but is within 0.05 of the runner-up, create a new profile and log `ambiguous: true` with the candidates.
- REASON: Cheap to implement, high trust payoff, and visible in the explainability view.
- IMPACTED DOCUMENTS: TRD §7, ARCH §6.

**D-08 — Choosing the winning profile in a conflict**
- CONFLICT: The PRD and the other documents pick the winner differently.
- DOCUMENT A: PRD §9.6 ("highest-confidence match").
- DOCUMENT B: TRD §7.8, ARCH §6.2, DATA_MODEL §4.5 and IMPL T-022 ("most events").
- WHY IT CONFLICTS: In a conflict every candidate is a deterministic 1.0 match, so the PRD rule has no tie-breaker.
- RECOMMENDED DECISION: Most events wins, then the earliest `first_seen_at`. Confidence is 0.75 and `conflict = true`. The conflicting strong identifier is **not** moved. Both profiles get `has_identity_conflict = true`. No automatic merge.
- REASON: The PRD rule can't be implemented as written.
- IMPACTED DOCUMENTS: PRD §9.6.

**D-09 — Confidence bands**
- CONFLICT: The PRD and the Implementation Plan use different bands.
- DOCUMENT A: PRD §9.5: High 0.95–1.0 · Medium 0.80–0.94 · Low 0.70–0.79 · no match below 0.70.
- DOCUMENT B: IMPL T-021: high ≥ 0.90 · medium 0.70–0.89 · low < 0.70. IMPL §6.3 differs again.
- WHY IT CONFLICTS: The same link would carry a different label on different screens.
- RECOMMENDED DECISION: Use the PRD bands. With the 0.94 cap, High means deterministic only.
- REASON: Higher precedence, and it fits D-04 exactly.
- IMPACTED DOCUMENTS: IMPL T-021, §6.3.

**D-10 — Profile-level confidence**
- CONFLICT: The formula and the demo claim don't agree.
- DOCUMENT A: TRD and DATA_MODEL: `avg_confidence` = mean of event confidences, *including* the 0.0 new-profile event.
- DOCUMENT B: APP_FLOW scene 3 ("98% confidence"). DATA_MODEL §13.1 says 0.98, but its own events average 0.904.
- WHY IT CONFLICTS: Every profile is dragged down by its creation event, so the number is meaningless.
- RECOMMENDED DECISION: Profile **identity confidence = its weakest identifier link** (for Priya: 0.80, "email ↔ anonymous web session via session continuity"). The dashboard KPI "average link confidence" excludes `new_profile` events.
- REASON: A weakest-link number is honest and easy to explain.
- IMPACTED DOCUMENTS: TRD §3.2, §10; DATA_MODEL §3.1, §13; APP_FLOW §7.

**D-11 — Phone normalization**
- CONFLICT: Two formats are specified.
- DOCUMENT A: PRD F-02 (E.164).
- DOCUMENT B: PRD §9.2, TRD §6.1 and IMPL T-014 (digits only). The fixtures use `9198765432`, which is ambiguous.
- WHY IT CONFLICTS: The same number stored two ways produces missed deterministic matches.
- RECOMMENDED DECISION: E.164 with default region IN (for example `+919876543210`).
- REASON: Unambiguous, and it matches the Gujarat context.
- IMPACTED DOCUMENTS: PRD §9.2, TRD §6, DATA_MODEL §13, IMPL.

**D-12 — Masking personal data on detail views**
- CONFLICT: DATA_MODEL masks the identity endpoint; the other documents show full values.
- DOCUMENT A: DATA_MODEL §12.2 (mask values in `/customers/:id/identity`).
- DOCUMENT B: PRD NFR-009, TRD §14.3 and ARCH §10.5 (full values in detail/profile views).
- WHY IT CONFLICTS: The same screen would render differently depending on which document you follow.
- RECOMMENDED DECISION: Show full values on the profile, identity and event detail screens. Mask values in the list, search dropdown, notifications and logs.
- REASON: PRD precedence. All data is synthetic.
- IMPACTED DOCUMENTS: DATA_MODEL §12.2, APP_FLOW S-05.

**D-13 — The "CRM lookup"**
- CONFLICT: The phone link is narrated as a CRM lookup, but no CRM source exists.
- DOCUMENT A: PRD §18.2, TRD §12.3/§16.4, APP_FLOW scene 3 ("CRM lookup matched email").
- DOCUMENT B: PRD §4 (no CRM) and the channel list (no CRM source).
- WHY IT CONFLICTS: The demo would narrate a data source that doesn't exist.
- RECOMMENDED DECISION: The call-center event itself carries the email captured by the agent. Evidence text: "Exact email match on call-center record".
- REASON: Keeps the story truthful.
- IMPACTED DOCUMENTS: PRD §18, TRD §16.4, APP_FLOW §7.

**D-14 — Priority of probabilistic matching**
- CONFLICT: The PRD makes it mandatory; the Implementation Plan makes it optional.
- DOCUMENT A: PRD F-04 (P0, deterministic + probabilistic).
- DOCUMENT B: IMPL §6.1 step 4 ("add only if time permits").
- WHY IT CONFLICTS: The cookie-continuity path (D-05) needs probabilistic scoring.
- RECOMMENDED DECISION: MUST BUILD, using the D-04 scorer.
- REASON: PRD precedence and a hard dependency of the demo.
- IMPACTED DOCUMENTS: IMPL §6.1, §18C.

### C. Event pipeline

**D-15 — Deduplication and idempotency**
- CONFLICT: Three different mechanisms are specified.
- DOCUMENT A: TRD §6.4 and DATA_MODEL: minute-precision hash of channel + type + primary identifier, checked against `created_at` in the last 5 minutes.
- DOCUMENT B: TRD §17.3 uses an in-memory Map, which doesn't persist across serverless instances.
- WHY IT CONFLICTS: Re-running the seed after 5 minutes duplicates every event, and two page views in the same minute collapse into one.
- RECOMMENDED DECISION: Accept an optional `source_event_id` from the producer. `dedup_key` = sha256(channel|source_event_id) when present; otherwise sha256 of the full normalized event (millisecond timestamp, type, all identifiers, canonical metadata). Enforce it with a **UNIQUE index**, permanently.
- REASON: Replay-safe, stateless and simpler.
- IMPACTED DOCUMENTS: PRD F-03, FR-009/010; TRD §6.4–6.5, §17.3; DATA_MODEL §3.3.

**D-16 — Unknown event types**
- CONFLICT: Three different behaviours are specified.
- DOCUMENT A: PRD §10.5 (accept and map to `unknown`).
- DOCUMENT B: TRD/DATA_MODEL: the `event_category` CHECK has no `unknown`, so the insert fails. IMPL §7.3 falls back to `browse`.
- WHY IT CONFLICTS: The same event would be rejected, crash the insert, or be misfiled.
- RECOMMENDED DECISION: Keep `event_type` as received (lowercased) and set `event_category = 'unknown'`. Add `unknown` to the CHECK. Log a warning. Detectors ignore unknown events.
- REASON: PRD precedence. Mapping to `browse` would pollute analytics.
- IMPACTED DOCUMENTS: TRD §3.2, DATA_MODEL §3.3/§15, IMPL §7.3.

**D-17 — Event taxonomy**
- CONFLICT: There are three different lists.
- DOCUMENT A: PRD §10.3.
- DOCUMENT B: DATA_MODEL §5.4 adds `navigation`, `refund_requested` and `appointment_booked` and renames engagement events. IMPL §7.3 uses `cart_add`, `register`, `complaint`, `pos_purchase`, and files `chat_start` under *engagement*.
- WHY IT CONFLICTS: Detectors key on exact type strings.
- RECOMMENDED DECISION: Use PRD §10.3 verbatim, plus `account_closed` (category account, D-30), plus the `unknown` category. Chat events are **support**.
- REASON: PRD precedence.
- IMPACTED DOCUMENTS: DATA_MODEL §5.4, IMPL §7.3.

**D-18 — Transaction boundaries**
- CONFLICT: The documents describe different write orders and transaction scopes.
- DOCUMENT A: The ARCH §14.4 sequence diagram inserts `resolution_log` *before* the event (a foreign-key violation) and inserts the event outside the resolver's writes.
- DOCUMENT B: DATA_MODEL §6.4 puts stages ①–⑤ *including metrics* in one transaction, so failure metrics would roll back. ARCH §6.2 differs again.
- WHY IT CONFLICTS: Each version fails differently.
- RECOMMENDED DECISION: Transaction 1 covers the profile create/update, identifiers, event, and resolution_log (written after the event). Transaction 2 covers pattern reconciliation, profile flags and notifications (best-effort). The `ingestion_log` row is written *outside* both.
- REASON: Correct foreign-key order, and failures stay visible.
- IMPACTED DOCUMENTS: ARCH §6.2, §14.4; DATA_MODEL §6.4; IMPL §7.2.

**D-19 — Synchronous processing vs a queue**
- CONFLICT: The PRD mentions a queue; everything else is synchronous.
- DOCUMENT A: PRD F-01 ("Event queue/buffer for downstream processing").
- DOCUMENT B: TRD TR-003, ARCH §7.2 (synchronous).
- WHY IT CONFLICTS: One wording implies async infrastructure.
- RECOMMENDED DECISION: Synchronous, in-process. Delete the PRD wording.
- REASON: At this scale a queue adds only failure modes.
- IMPACTED DOCUMENTS: PRD F-01.

**D-20 — Batch size and timeouts**
- CONFLICT: The numbers don't agree.
- DOCUMENT A: TRD TR-017 (< 5 s for 100 events).
- DOCUMENT B: ARCH §11.1 (100 × 200 ms = 20 s, which may hit the host timeout).
- WHY IT CONFLICTS: The target is impossible under the stated per-event cost.
- RECOMMENDED DECISION: Batch maximum is 50 events. **The seed calls `processEvent()` in-process (a script), not over HTTP.** Latencies are measured and reported, not promised.
- REASON: Removes the timeout risk from the critical path.
- IMPACTED DOCUMENTS: PRD FR-002, TRD §2.3/§6.2, ARCH §7.3/§11.

**D-21 — Rate limiting and write protection**
- CONFLICT: Two different limits, and neither works on serverless.
- DOCUMENT A: TRD TR-021, §14.5 and ARCH §10.6 (100 req/s).
- DOCUMENT B: DATA_MODEL §12.2 (100 req/min). Both are in-memory, which is ineffective on serverless.
- WHY IT CONFLICTS: The values disagree and neither would actually limit anything.
- RECOMMENDED DECISION: Drop rate limiting. Instead, write endpoints (`POST /events`, `/events/batch`, `/notifications/read`) require an `x-ingest-token` header matching `INGEST_TOKEN` (SHOULD, needed only if deployed).
- REASON: The real risk on a public URL is vandalism of the demo data, not load.
- IMPACTED DOCUMENTS: TRD §2.4, §14.5; ARCH §10.6; DATA_MODEL §12.2; IMPL T-011.

**D-22 — Pipeline metrics granularity**
- CONFLICT: One row per event per stage vs aggregate counts.
- DOCUMENT A: TRD §15.2 and DATA_MODEL §13.7 (one row per event per stage, about 7× the event count).
- DOCUMENT B: DATA_MODEL §2.2 ("aggregate counts").
- WHY IT CONFLICTS: Two incompatible shapes for the same table.
- RECOMMENDED DECISION: Rename to `ingestion_log`: one row per ingestion attempt with the outcome (accepted / duplicate / rejected / failed), the last stage reached, a PII-free error, and latency.
- REASON: Same observability, about 7× fewer rows, and it directly feeds the P2 Pipeline page.
- IMPACTED DOCUMENTS: TRD §3.2, §15; DATA_MODEL §3.6.

### D. Journey intelligence

**D-23 — How time is evaluated**
- CONFLICT: Detectors read the wall clock at ingestion only.
- DOCUMENT A: TRD §9.3, §9.6, §9.7 (`new Date()` / `Date.now()` inside detectors that run only when an event is ingested).
- DOCUMENT B: IMPL T-029…T-033 (`asOf` parameter) and CHANGELOG item 1.
- WHY IT CONFLICTS: A drop-off only appears if a *later* event arrives. Churn evidence ("15 days") freezes at seeding time and is wrong on demo day. DATA_MODEL §13.5 hard-codes `detected_at: 2026-09-19`.
- RECOMMENDED DECISION: Detectors are **pure functions of (events, asOf)**. `asOf` = `DEMO_AS_OF` env var if set, otherwise `now()`. Seed timestamps are generated *relative to* `DEMO_AS_OF`, so the demo is identical on any day. Re-evaluation runs (a) on every ingestion for that profile, (b) on profile or journey read when `patterns_evaluated_at < asOf`, and (c) as a full pass at the end of seeding. No scheduler or worker.
- REASON: Deterministic, testable and demo-safe.
- IMPACTED DOCUMENTS: TRD §9, ARCH §4.6, DATA_MODEL §13.5, IMPL §4.

**D-24 — Pattern persistence**
- CONFLICT: Append-only vs reconciled patterns.
- DOCUMENT A: TRD §9.2 (`detectedPattern.create` for every detected pattern after every event, so drop-offs and unresolved issues are re-inserted each time) and ARCH §5.2 ("immutable, never updated").
- DOCUMENT B: CHANGELOG item 4 and IMPL T-034 (reconcile, stable IDs, remove stale).
- WHY IT CONFLICTS: Duplicate rows inflate every KPI. TRD's churn rule "3+ repeat_contact" counts duplicated rows.
- RECOMMENDED DECISION: Each detector emits a deterministic `pattern_key`. A per-profile transaction upserts on `UNIQUE(profile_id, pattern_key)` and deletes keys that are no longer emitted. Notification dedupe keys are derived from pattern keys, and read state is preserved.
- REASON: Idempotent and replay-safe.
- IMPACTED DOCUMENTS: TRD §9.2, ARCH §5.2–5.3, DATA_MODEL §3.5.

**D-25 — Drop-off processes**
- CONFLICT: Different process lists.
- DOCUMENT A: PRD §11.1 and TRD §9.3 (checkout 2 h, onboarding 7 d, support_resolution 7 d).
- DOCUMENT B: IMPL T-029 (checkout, `form_start`/`form_submit`, `application_start`/`application_complete`).
- WHY IT CONFLICTS: IMPL's events don't exist in any taxonomy. The PRD's support_resolution duplicates the unresolved-issue detector.
- RECOMMENDED DECISION: **Checkout** (MUST): `checkout_start` without `purchase_complete` on *any* channel within 2 h. Onboarding (SHOULD). Drop support_resolution and the IMPL processes.
- REASON: PRD precedence, minus the duplicate.
- IMPACTED DOCUMENTS: PRD §11.1, TRD §9.3, IMPL T-029.

**D-26 — Escalation window, triggers and tiers**
- CONFLICT: Different windows and triggers.
- DOCUMENT A: PRD §11.2, TRD §9.4 and APP_FLOW N-03 (48 h, triggered by any higher-tier event).
- DOCUMENT B: IMPL T-030 (24 h, assisted-contact starts only). ARCH §9.2 omits mobile and email tiers. PRD §18.2 Scenario 2 calls email "Tier 1", but PRD §11.2 says Tier 2.
- WHY IT CONFLICTS: The TRD code flags `call_ended` and outbound `email_received` as escalations, which gives Priya 3+ escalations instead of 1.
- RECOMMENDED DECISION: 48 h window. The destination must be an **assisted-contact start** (`call_started`, `chat_started`, inbound `email_sent`, `complaint_filed`, or `store_visit` with purpose support/return). The source is the most recent lower-tier event. Tiers: web/mobile 1, email/chat 2, call_center 3, in_store 4. At most one escalation per 48 h episode.
- REASON: PRD window plus IMPL/CHANGELOG trigger precision (CHANGELOG: "a call-ended event does not create another escalation").
- IMPACTED DOCUMENTS: PRD §18.2, TRD §9.4, ARCH §9.2, IMPL T-030.

**D-27 — Repeat contact**
- CONFLICT: Different definitions of a contact.
- DOCUMENT A: PRD §11.3 and TRD §9.5 (types: ticket_created, call_started, chat_started, email_sent, complaint_filed).
- DOCUMENT B: IMPL T-031 (any support-category event, which includes call_ended and ticket_resolved).
- WHY IT CONFLICTS: IMPL's rule inflates counts. The PRD list double-counts a ticket created *during* a call.
- RECOMMENDED DECISION: Use the PRD types. Contact starts within 30 minutes of each other collapse into one contact. Two or more contacts within 7 days form one pattern per cluster (key = first contact). The badge reads "Nth contact in D days".
- REASON: PRD precedence plus a fix for double-counting.
- IMPACTED DOCUMENTS: TRD §9.5, IMPL T-031.

**D-28 — Unresolved issue**
- CONFLICT: Different initiation and resolution types.
- DOCUMENT A: PRD §11.4 and TRD §9.6 (initiation ticket_created or complaint_filed; resolution ticket_resolved or ticket_closed).
- DOCUMENT B: IMPL T-032 (ticket_created and ticket_resolved only). IMPL §11.3 flags "unresolved" after 6 days, before the 7-day window ends.
- WHY IT CONFLICTS: The sets differ, and nothing correlates a resolution with the right ticket.
- RECOMMENDED DECISION: Use the PRD sets. Correlate by `metadata.ticket_id` when present. **Only issues still open past the window count.** A late resolution is recorded in the details but not counted.
- REASON: PRD precedence plus CHANGELOG ("current unresolved vs historical missed deadline").
- IMPACTED DOCUMENTS: TRD §9.6, IMPL T-032, §11.3.

**D-29 — Churn-risk rules**
- CONFLICT: Three rule sets.
- DOCUMENT A: PRD §11.6 (repeated frustration: 3+ contacts / 30 d, high · escalation abandonment: 14 d, high · process abandonment: 7 d, medium · unresolved complaint, medium · activity decline, low).
- DOCUMENT B: TRD §9.7 (4 rules, counts *pattern rows*). IMPL T-033 (4 *different* rules: "3 support + unresolved", "2+ drop-offs", "30 days inactivity").
- WHY IT CONFLICTS: Different customers would be flagged.
- RECOMMENDED DECISION: Use PRD rules 1–4, evaluated on collapsed contacts and `asOf` (full specification in §4.8). Drop "activity decline" for the MVP. Risk levels are high, medium or none.
- REASON: PRD precedence. Fixes the TRD row-counting bug.
- IMPACTED DOCUMENTS: TRD §9.7, IMPL T-033, §11.2.

**D-30 — Measuring correlation with churn (a gap)**
- CONFLICT: The PRD asks which experiences correlate with churn, but only a rule-based risk *score* is defined.
- DOCUMENT A: PRD §1, US-019 ("patterns that correlate with churn").
- DOCUMENT B: All documents define churn *risk* rules, never a churn *outcome*.
- WHY IT CONFLICTS: You can't show correlation without an outcome to correlate against.
- RECOMMENDED DECISION: Define **churned** = an `account_closed` event, OR no activity for 30 days or more as of `asOf` (only for customers first seen at least 30 days before `asOf`). Add a **churn-correlation panel**: for each pattern type, the churn rate *with* vs *without* the pattern, the lift, and n. Always label it "synthetic dataset".
- REASON: Answers the PS directly for a few SQL queries, and it becomes the "actionable insight" in the demo.
- IMPACTED DOCUMENTS: PRD §11–12, TRD §10, APP_FLOW S-01.

**D-31 — Where churn appears in the UI**
- CONFLICT: Where the churn signal is anchored.
- DOCUMENT A: APP_FLOW FLOW 12 and §8.1 ("churn signal badge on the last event").
- DOCUMENT B: DATA_MODEL §3.5 (churn patterns have `event_id = NULL`).
- WHY IT CONFLICTS: A profile-level pattern can't be attached to an event badge.
- RECOMMENDED DECISION: Show churn as a profile-level banner (risk level plus the matched rules), and add a computed "silence since …" marker at the end of the timeline.
- REASON: Consistent with the data model.
- IMPACTED DOCUMENTS: APP_FLOW §2.4, §3, §8.

### E. API

**D-32 — Notification endpoints**
- CONFLICT: Missing or divergent endpoints.
- DOCUMENT A: TRD §12 (none).
- DOCUMENT B: ARCH §4.1 (`GET /notifications`, `POST /notifications/read`), but ARCH §3.4 calls `/notifications/count`, which is undefined. IMPL T-045 returns the count inside the list.
- WHY IT CONFLICTS: Nobody can build the notification bell from these specs.
- RECOMMENDED DECISION: `GET /api/v1/notifications` → `{ items, unread_count }`, and `POST /api/v1/notifications/read` with `{ ids } | { all: true }`.
- REASON: Minimal and covers the whole UX.
- IMPACTED DOCUMENTS: TRD §12, ARCH §3.4.

**D-33 — Search routing**
- CONFLICT: Where search results go.
- DOCUMENT A: APP_FLOW §1.4 (`/customers?q=`) and IMPL T-058 (Enter navigates to `/customers?q=`).
- DOCUMENT B: TRD §12 (only `/customers/search?q=`; the list endpoint has no `q`).
- WHY IT CONFLICTS: The target route doesn't exist.
- RECOMMENDED DECISION: Search is a type-ahead dropdown only. Enter opens the top result. There is no `q` parameter on the list.
- REASON: Fewer code paths.
- IMPACTED DOCUMENTS: APP_FLOW, IMPL.

**D-34 — Server Components calling their own API**
- CONFLICT: Server Components are told to fetch their own API routes.
- DOCUMENT A: TRD §3.3 and ARCH §3.5 ("fetch from API route (same process, no network hop)").
- DOCUMENT B: How Next.js actually behaves: a server-side `fetch` to your own route is a real HTTP call and needs an absolute URL.
- WHY IT CONFLICTS: The documented premise is false.
- RECOMMENDED DECISION: Server Components call `lib/queries/*` directly. API routes serve client components and external producers.
- REASON: Correctness and less latency.
- IMPACTED DOCUMENTS: TRD §3.3, §4.3; ARCH §3.5.

**D-35 — Canonical endpoint list**
- CONFLICT: The documents give different endpoint counts.
- DOCUMENT A: TRD §20 ("9 REST endpoints", while listing 10 plus health).
- DOCUMENT B: ARCH §4.1 (13) and IMPL (13).
- WHY IT CONFLICTS: The counts don't match any one list.
- RECOMMENDED DECISION: Use the route list in §4.4 (13 routes, 12 table rows).
- REASON: A single list.
- IMPACTED DOCUMENTS: TRD, ARCH, IMPL.

**D-36 — Analytics filters**
- CONFLICT: Filter coverage differs.
- DOCUMENT A: PRD US-022 and §12.3 (date, channel, event type, pattern type).
- DOCUMENT B: TRD §10.3 and §12 (date and channel only).
- WHY IT CONFLICTS: The PRD asks for filters the API doesn't support.
- RECOMMENDED DECISION: Date range and channel for the MVP. Pattern type is handled by clicking through to the customer list.
- REASON: Scope.
- IMPACTED DOCUMENTS: PRD §12.3.

### F. Notifications

**D-37 — Which notifications to build**
- CONFLICT: Three different sets.
- DOCUMENT A: PRD §14 (high/medium churn P1, identity conflict P1, escalation P2). PRD §14.4 says individual repeat contacts do **not** notify.
- DOCUMENT B: APP_FLOW §5 (8 types including low-confidence match, repeat 3+, system alerts, 7/14-day auto-expiry, volume throttling). IMPL §17 (conflict, high churn, escalation, repeat 3+).
- WHY IT CONFLICTS: Auto-expiry needs a scheduler that no document defines. Repeat notifications contradict the PRD.
- RECOMMENDED DECISION: SHOULD BUILD: **N-01 identity conflict (warning) and N-05 high churn (critical)** only. `dedupe_key` is UNIQUE and read state is preserved. The bell polls every 30 s while the tab is visible. No expiry, no toasts, no escalation, low-confidence, repeat or system alerts.
- REASON: PRD precedence plus the minimum that demonstrates the feature.
- IMPACTED DOCUMENTS: APP_FLOW §5–6, IMPL T-034, T-059, §17.

### G. UI/UX

**D-38 — Visual system**
- CONFLICT: The mockup and the TRD/IMPL specify different visual systems.
- DOCUMENT A: Mockup: dark-only (#0A0E17), IBM Plex Sans/Mono. Channels: web #4F7CFF, mobile #22D3B0, email #F5A524, chat #A855F7, call #DC2E5F.
- DOCUMENT B: TRD §4.9 and IMPL §9: light+dark, Inter/JetBrains Mono. Channels: web #3B82F6, mobile **#8B5CF6**, call **#10B981**, email #F59E0B, chat **#14B8A6**, in-store #F43F5E. TRD churn #E11D48 is nearly identical to in-store #F43F5E.
- WHY IT CONFLICTS: Mobile, chat and call colors are swapped between the two, and one pattern color collides with a channel color.
- RECOMMENDED DECISION (**needs team confirmation, since no brand assets were supplied**): Use the mockup's surfaces and typography (the only real design artifact), dark-first, with no light mode in the MVP. Channel palette (avoids the five pattern hues): web #4F7CFF · mobile #22D3B0 · email #38BDF8 · chat #A855F7 · call_center #84CC16 · in_store #D4A373. Pattern palette: drop-off #EF4444 · escalation #F97316 · repeat #EAB308 · unresolved #818CF8 · churn #F43F5E. Icons and labels always accompany color (NFR-016). Contrast is validated in M3.
- REASON: One palette, no collisions, and it matches the only visual reference.
- IMPACTED DOCUMENTS: TRD §4.9, IMPL §9, mockup.

**D-39 — Mockup content scope**
- CONFLICT: The mockup shows content the data model rejects.
- DOCUMENT A: The mockup shows an Awareness→Retention marketing funnel, KPIs not in the PRD (completion rate, average duration), sub-channels ("Web (paid)", "Mobile (org.)"), and fintech hotspots ("KYC step 3", "fraud rule 02").
- DOCUMENT B: DATA_MODEL §1.1 (rejects funnel stages), the PRD channel list, and the retail domain.
- WHY IT CONFLICTS: Following the mockup would mean building data the system doesn't have.
- RECOMMENDED DECISION: The mockup is a **styling reference only**. The channel-transition Sankey is ONLY IF TIME REMAINS. Don't build the marketing funnel. The domain is omnichannel retail.
- REASON: CHANGELOG item 5's intent, and data integrity.
- IMPACTED DOCUMENTS: Mockup README.

**D-40 — Dashboard KPIs and charts**
- CONFLICT: Three KPI sets.
- DOCUMENT A: PRD §12 (9 KPIs, 6 charts).
- DOCUMENT B: IMPL T-053 (a different 9 KPIs, including "events today" and "unique channels", plus a churn pie) and the mockup (5 KPIs).
- WHY IT CONFLICTS: Different dashboards.
- RECOMMENDED DECISION: The §4.9 set. Based on the PRD, but "Identity Resolution Rate" is replaced by "fragments unified" (identifiers → profiles), because a per-event match rate is trivially high.
- REASON: PRD precedence, with one metric fixed.
- IMPACTED DOCUMENTS: PRD §12.1, IMPL T-053.

**D-41 — Navigation shell**
- CONFLICT: Different navigation layouts.
- DOCUMENT A: ARCH §3.2 and IMPL §9.5 (240 px sidebar).
- DOCUMENT B: The mockup (56 px icon rail and an avatar).
- WHY IT CONFLICTS: Different layout, and the avatar implies users exist.
- RECOMMENDED DECISION: 56 px icon rail (Dashboard, Customers, Pipeline) and a top bar with search and the bell. No avatar.
- REASON: Matches the design reference without implying authentication.
- IMPACTED DOCUMENTS: ARCH, IMPL.

**D-42 — "Seed Demo Data" button**
- CONFLICT: A destructive public action.
- DOCUMENT A: APP_FLOW S-01 and FLOW 01 (a UI button seeds 500 customers).
- DOCUMENT B: The no-auth security posture (TRD §14) and seeding cost (D-20).
- WHY IT CONFLICTS: Anyone could wipe or reseed the demo.
- RECOMMENDED DECISION: Seed via CLI only. The empty state shows the command.
- REASON: Safety.
- IMPACTED DOCUMENTS: APP_FLOW.

### H. Demo and data

**D-43 — The Priya fixture**
- CONFLICT: Three incompatible fixtures.
- DOCUMENT A: DATA_MODEL §13: running shoes ₹4,999, 12 events. It claims 3 channels but its events span 4. evt_004 is labeled "probabilistic 0.85", but TRD rules would create a new profile there. The cookie expansion at evt_005 would violate the UNIQUE constraint. It claims 0.98 average; the actual average is 0.904.
- DOCUMENT B: IMPL §11.3: laptop ₹89,999, 12 events, 6 channels listed but declared "4" and "5" elsewhere. The phone is linked on **name alone** at 0.94. It says "deterministic via cookie". A second drop-off is flagged before its window expires. Churn is flagged at a store visit, which is *activity*. The CHANGELOG describes a third version (4 channels, mean 0.8667).
- WHY IT CONFLICTS: The golden test and the demo can't both pass.
- RECOMMENDED DECISION: Use the canonical fixture in §7.3, recomputed by hand against the D-04…D-29 rules.
- REASON: Every value has been checked against the approved rules.
- IMPACTED DOCUMENTS: DATA_MODEL §13, APP_FLOW §7–8, IMPL §10.4, §11.3, §16.

**D-44 — Scenario 2**
- CONFLICT: Three versions.
- DOCUMENT A: PRD §18.2 "Support Loop": email Tier 1 (wrong per D-26), "unresolved" at 3 days (the window is 7).
- DOCUMENT B: IMPL §11.4 "Rajesh Patel": the calls carry phone + name only, so they'd never link to his email profile. APP_FLOW §6.2 uses "Rahul Mehta".
- WHY IT CONFLICTS: None of the versions shows what it claims to.
- RECOMMENDED DECISION: Use the canonical Scenario 2 in §7.4 (Rajesh Patel, *resolved* in store). It's the contrast case and the PRD's second story (PRD §17 requires 2 or more).
- REASON: PRD §17 compliance.
- IMPACTED DOCUMENTS: PRD §18.2, IMPL §11.4, APP_FLOW.

**D-45 — Dataset size and ground truth**
- CONFLICT: The seed size and method are impractical.
- DOCUMENT A: TRD §18.4 and IMPL §11 (500 customers and 15,000 events through the pipeline, sequentially).
- DOCUMENT B: PRD §17 ("accuracy vs ground truth"), which has no mechanism behind it.
- WHY IT CONFLICTS: Sequential remote seeding is slow (about 15k × network round-trips), and accuracy can't be measured.
- RECOMMENDED DECISION: About 300 customers and about 6–8k events, from a deterministic seeded random generator run in-process against the DB. Each synthetic person carries `metadata.synthetic_person_id`, which the resolver never reads. `scripts/evaluate-identity.ts` reports pairwise precision and recall.
- REASON: Fast, reproducible, and it turns the "accuracy" claim into a measured number.
- IMPACTED DOCUMENTS: TRD §18.4, IMPL §11.

**D-46 — Numbers spoken in the demo**
- CONFLICT: The narration uses invented numbers.
- DOCUMENT A: APP_FLOW §7 (500 customers, 15,000 events, 87%, 0.92, 230, 85, 45), copied from the TRD example payload.
- DOCUMENT B: The CHANGELOG ("placeholders to replace with actual seed results").
- WHY IT CONFLICTS: The narrated numbers would be false.
- RECOMMENDED DECISION: The script uses `{placeholders}`, filled from the final seed output.
- REASON: Honesty.
- IMPACTED DOCUMENTS: APP_FLOW §7.

**D-47 — Demo structure**
- CONFLICT: Different scene order and content.
- DOCUMENT A: APP_FLOW §7 (scene 2 is the dashboard; one story).
- DOCUMENT B: IMPL §16.3 (scene 2 is a live `curl` ingest). PRD §18.1 includes pipeline health (a P2 feature) and requires 2 or more stories.
- WHY IT CONFLICTS: The scripts differ, and the PRD's demo depends on a P2 feature.
- RECOMMENDED DECISION: Use the §7 script: a live late-event ingest, one hero story, a 10-second second story, and an insight finish. No P2 screens.
- REASON: Meets PRD §17 and all 7 required demo beats.
- IMPACTED DOCUMENTS: PRD §18, APP_FLOW §7, IMPL §16.

**D-48 — Currency and domain**
- CONFLICT: USD vs INR, and retail vs fintech content.
- DOCUMENT A: TRD examples (USD 99.99).
- DOCUMENT B: DATA_MODEL and APP_FLOW (INR ₹4,999). The mockup's fintech content.
- WHY IT CONFLICTS: The demo data would be inconsistent.
- RECOMMENDED DECISION: INR. Omnichannel retail (web store, app, call center, email, chat, physical stores with loyalty). Timestamps stored in UTC, displayed in IST.
- REASON: The Gujarat audience and the majority of the documents.
- IMPACTED DOCUMENTS: TRD examples.

### I. Stack and deployment

**D-49 — Library versions**
- CONFLICT: Pinned versions are dated.
- DOCUMENT A: TRD §20 (Next 14+, Tailwind 3.x, Prisma 5.x) and IMPL (a `tailwind.config.ts` token file).
- DOCUMENT B: The date is 2026-09. Current `create-next-app` and `shadcn init` generate newer majors, and newer Tailwind configures tokens in CSS.
- WHY IT CONFLICTS: Following the documents literally means fighting the current tooling.
- RECOMMENDED DECISION: Use whatever current stable versions the scaffolders produce at M1, record them in the README, and define tokens as CSS variables.
- REASON: Avoids version fights.
- IMPACTED DOCUMENTS: TRD §20, IMPL §2, §9.

**D-50 — Hosting**
- CONFLICT: Deployment details and priority.
- DOCUMENT A: TRD, ARCH and IMPL (Vercel + Neon primary, Railway fallback; ARCH §11 "SSR at the edge"; IMPL treats "Live" deployment as P0).
- DOCUMENT B: Prisma needs the Node runtime. The project brief marks live deployment as *optional*.
- WHY IT CONFLICTS: Edge rendering would break the database layer, and P0 contradicts optional.
- RECOMMENDED DECISION: **The demo runs locally first (recorded video).** Deployment is SHOULD: Vercel (Node runtime only) + Neon. Migrations and seed run from a laptop over Neon's direct connection. `DEMO_AS_OF` is identical everywhere.
- REASON: Removes deployment from the critical path.
- IMPACTED DOCUMENTS: ARCH §11, IMPL §12, §15.2.

**D-51 — Test database**
- CONFLICT: Real-Postgres tests but "no Docker".
- DOCUMENT A: TRD §16 and IMPL T-025 (integration tests on real Postgres).
- DOCUMENT B: TRD §20 ("no Docker"). The development machine runs Windows.
- WHY IT CONFLICTS: No test database strategy is defined.
- RECOMMENDED DECISION: A Neon dev branch (or a native local Postgres) with a separate test schema, reset before each integration suite.
- REASON: Works on Windows without Docker.
- IMPACTED DOCUMENTS: TRD §16, IMPL §10.

**D-52 — Build window and team**
- CONFLICT: An assumption that appears in only one document.
- DOCUMENT A: IMPL §3 and §5 (48 hours, 3 people, feature freeze at hour 36).
- DOCUMENT B: No other document states the window or team size.
- WHY IT CONFLICTS: The MVP tiers depend on it.
- RECOMMENDED DECISION: **Open. The team must confirm.** The tiers in §5 assume roughly 48 hours with 2–3 people, and the SHOULD tier is sized to be droppable.
- REASON: Scope must follow capacity.
- IMPACTED DOCUMENTS: IMPL.

**D-53 — How to describe AI/ML**
- CONFLICT: Contradictory framing.
- DOCUMENT A: TRD §11.1 ("one area where a lightweight ML technique is justified") and ARCH §9.1 ("AI/ML in exactly two places").
- DOCUMENT B: The same sections: "not a trained model", "not ML".
- WHY IT CONFLICTS: Judges will probe this.
- RECOMMENDED DECISION: Describe it as "explainable heuristic evidence scoring + Jaro-Winkler string similarity. No ML models, no LLMs." Accuracy is measured against synthetic ground truth (D-45).
- REASON: Claims that can be defended.
- IMPACTED DOCUMENTS: TRD §11, ARCH §9, pitch deck.

**D-54 — Arithmetic and claims errors (fix during the doc update)**
- ARCH §9.4: "0.78/1.10 = 0.85 after temporal bonus" is wrong. 0.78/1.10 = 0.709.
- IMPL §6.4: the fuzzy-name case gives 0.99 while claiming a 0.94 cap.
- PRD §13.1 / NFR-001 say 100k profiles; TRD TR-014 says 10k. Use 10k as a measured target, not a promise.
- TRD §20 says "9 REST endpoints" (see D-35).
- DATA_MODEL §15.2 schema statistics are superseded by §4.3 here.

---

## 3. Canonical product definition (PRODUCT SOURCE OF TRUTH)

| Item | Definition |
|---|---|
| **Problem** | Customer interactions are recorded in separate channel systems (web analytics, app analytics, call center, email/helpdesk, chat, store POS/loyalty), each with its own identifier. The organization can't see one customer's full journey, so it can't see where customers drop off, where they escalate, which issues stay unresolved, who keeps contacting support, or which experiences precede churn. *(Provisional wording, pending verbatim PS-4, D-02.)* |
| **Target user** | **Journey Analyst** (primary, demo persona) on a retail CX team. The CX Manager uses the dashboard. Support Ops and Data Admin are secondary and not demoed. |
| **Product** | JourneyX, an analyst workbench that ingests multi-channel events, resolves them to unified customers with **explainable, conservative identity resolution**, stitches them into timelines, and **detects and quantifies journey problems**. |
| **Core workflow** | Events → validate → normalize → deduplicate → **resolve identity** → store → **stitch** → **detect patterns** → Analyst: Dashboard (insight) → Customer list → Customer (identity + journey) → back to insight. |
| **Core features** | (1) Event ingestion API. (2) Deterministic + probabilistic identity resolution with evidence. (3) Unified timeline with sessions, journeys and channel transitions. (4) Detectors: checkout drop-off, escalation, repeat contact, unresolved issue, churn risk. (5) Customer search and profile. (6) Dashboard with friction ranking and churn correlation. |
| **Technical differentiator** | **Identity decisions you can audit.** Every link shows its method, evidence and score. The scorer refuses weak links (name-only, next-day cookie), guards against shared devices (contradiction check) and against ties (ambiguity check), never auto-merges, and its accuracy is *measured* against synthetic ground truth. All detectors are pure, replayable functions of (events, asOf). |
| **MVP** | See §5 MUST BUILD. |
| **Non-goals** | CRM, marketing automation, billing, chatbots or LLM querying, ML churn prediction, collection SDKs, authentication/RBAC, real-time streaming, message brokers, profile merge/split UI, production scale. |
| **AI/ML role** | **None in the ML sense.** Heuristic weighted evidence scoring (Fellegi-Sunter-*style*, uncalibrated, labeled as a heuristic) + Jaro-Winkler. Scores are heuristics, not probabilities. |
| **Expected demo** | 3 minutes. Priya's fragments across 3 systems become one explainable profile. A late call-center record arrives live and is stitched in. Her journey shows a cross-channel checkout failure → escalation → repeat contact → open ticket → HIGH churn risk. The dashboard shows the same failure is the top friction point platform-wide and how much more churn it is associated with (synthetic data). A 10-second second customer shows a resolved contrast. See §7. |

---

## 4. Canonical technical architecture (TECHNICAL SOURCE OF TRUTH)

### 4.1 Tech stack

| Layer | Choice | Status |
|---|---|---|
| Runtime / framework | Node.js LTS, Next.js App Router (current stable at M1), TypeScript strict | KEEP |
| UI | shadcn/ui + Tailwind (current), Lucide icons, IBM Plex Sans/Mono via `next/font` | KEEP |
| Charts | Recharts (bar, pie, histogram; its Sankey only if time remains) | KEEP |
| DB / ORM | PostgreSQL + Prisma (raw SQL migration for CHECKs and partial indexes) | KEEP |
| Validation | Zod | KEEP |
| Client data | SWR **only** for the search dropdown and notification bell. Everything else is server-rendered from URL params. | REDUCE |
| Tests | Vitest (unit + integration against Neon branch/local PG) | KEEP |
| Hosting | Local-first; Vercel (Node runtime) + Neon as SHOULD | KEEP (demoted) |

**Technologies explicitly rejected for the MVP**

| Technology | Verdict | Why |
|---|---|---|
| Kafka / RabbitMQ / Redis Streams / SQS | ❌ Not needed | Synchronous ingestion at <10 events/s. A broker adds failure modes and eventual consistency (ARCH §7.2 is right). |
| Neo4j / graph DB | ❌ Not needed | The identity graph is a star (profile → identifiers) with no merges and no traversal depth. Two indexed tables cover it. |
| Redis / cache | ❌ Not needed | Analytics over about 8k events in Postgres is well under a second. |
| Elasticsearch / vector DB | ❌ Not needed | Search is a prefix/exact match on identifiers. No semantic search. |
| Trained ML models | ❌ Not needed | No labels exist. Rules are more explainable and match the PS. |
| LLMs (summaries, NL query, chatbot) | ❌ Do not build | PRD non-goal. It would send customer data to an external service (NFR-012). |
| WebSockets / SSE | ❌ Not needed | Bell polling is enough. |
| In-memory rate limiter | ❌ Removed | Ineffective on serverless. Replaced by the ingest token (D-21). |
| Docker / K8s / CI/CD | ❌ Not needed | Git push → host auto-deploy is enough. |

### 4.2 Repository structure

```
journeyx/
├── app/
│   ├── layout.tsx                 # icon rail + top bar (search, bell)
│   ├── page.tsx                   # → /dashboard
│   ├── dashboard/page.tsx
│   ├── customers/page.tsx         # filtered list
│   ├── customers/[id]/layout.tsx  # identity card + churn banner + tabs
│   ├── customers/[id]/page.tsx            # Overview tab
│   ├── customers/[id]/journey/page.tsx    # Journey tab
│   ├── customers/[id]/identity/page.tsx   # Identity tab
│   ├── pipeline/page.tsx          # P2
│   └── api/v1/...                 # routes in §4.4
├── components/{layout,dashboard,customers,journey,identity,shared,ui}/
├── lib/
│   ├── shared/     # types, taxonomy, constants, errors, logger, db, clock (asOf)
│   ├── pipeline/   # validator, normalizer, dedup, processor, ingestion-log
│   ├── identity/   # candidates, scorer, jaro-winkler, resolver, explain
│   ├── journey/    # sessionize, detectors/*, churn, reconcile
│   ├── analytics/  # kpis, charts, correlation, friction
│   ├── notifications/
│   └── queries/    # read models used by Server Components AND API routes
├── prisma/{schema.prisma, migrations/}
├── scripts/
│   ├── fixtures/priya.ts, rajesh.ts   # canonical demo fixtures (§7)
│   ├── seed.ts                        # generator + fixtures, in-process
│   ├── replay.ts                      # ingest a fixture event via HTTP (demo)
│   └── evaluate-identity.ts           # precision/recall vs ground truth
├── tests/{unit,integration}/
└── docs/
```

### 4.3 Database (supersedes TRD §3.2 and DATA_MODEL §15)

> **Implementation note (2026-09-22).** The schema below is implemented by
> `supabase/migrations/0003_intelligence.sql`, which keeps the physical table
> names introduced in `0001_init.sql` rather than renaming tables the whole
> query and UI layer already reads: `customers` ≙ `customer_profiles`,
> `patterns` ≙ `detected_patterns`, and `ingestion_log` as specified in D-22.
> `customers.id` and `events.id` are `TEXT` (`cust_…`, `evt_…`) rather than
> UUID; every other column, constraint and index is as written here. The
> superseded `journeys`, `identity_links` and `churn_signals` tables are
> dropped — journeys are computed at read time (§4.7), link provenance moved
> onto `customer_identifiers`, and churn is a `churn_signal` pattern (§4.8).
> See `supabase/README.md` for the full mapping.

Seven tables. The changes from DATA_MODEL §15 are marked ★.

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL,
  last_seen_at  TIMESTAMPTZ NOT NULL,
  event_count   INTEGER NOT NULL DEFAULT 0,
  channel_count INTEGER NOT NULL DEFAULT 0,
  channels_used TEXT[] NOT NULL DEFAULT '{}',
  is_anonymous  BOOLEAN NOT NULL DEFAULT TRUE,                     -- ★ no strong identifier yet
  identity_confidence REAL NOT NULL DEFAULT 1.0,                   -- ★ weakest link (D-10), replaces avg_confidence
  has_identity_conflict BOOLEAN NOT NULL DEFAULT FALSE,            -- ★
  churn_risk TEXT NOT NULL DEFAULT 'none' CHECK (churn_risk IN ('high','medium','low','none')),
  has_drop_off BOOLEAN NOT NULL DEFAULT FALSE,
  has_escalation BOOLEAN NOT NULL DEFAULT FALSE,
  has_repeat_contact BOOLEAN NOT NULL DEFAULT FALSE,
  has_unresolved BOOLEAN NOT NULL DEFAULT FALSE,
  patterns_evaluated_at TIMESTAMPTZ,                               -- ★ asOf of last evaluation (D-23)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_profiles_last_seen ON customer_profiles(last_seen_at);
CREATE INDEX idx_profiles_churn ON customer_profiles(churn_risk);
CREATE INDEX idx_profiles_channels ON customer_profiles USING GIN(channels_used);

CREATE TABLE customer_identifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('email','phone','loyalty_id','device_id','cookie_id','name')),
  identifier_value TEXT NOT NULL,
  source_channel TEXT NOT NULL,
  link_method TEXT NOT NULL CHECK (link_method IN ('origin','deterministic','probabilistic','conflict')), -- ★
  link_confidence REAL NOT NULL,                                   -- ★ (renamed from confidence)
  first_seen_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, identifier_type, identifier_value)           -- ★ (D-06)
);
CREATE UNIQUE INDEX uq_strong_identifier ON customer_identifiers(identifier_type, identifier_value)
  WHERE identifier_type IN ('email','phone','loyalty_id');         -- ★
CREATE INDEX idx_identifiers_type_value ON customer_identifiers(identifier_type, identifier_value text_pattern_ops); -- ★ prefix search
CREATE INDEX idx_identifiers_profile ON customer_identifiers(profile_id);

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  source_event_id TEXT,                                            -- ★ producer idempotency key (D-15)
  channel TEXT NOT NULL CHECK (channel IN ('web','mobile','call_center','email','chat','in_store')),
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL CHECK (event_category IN ('browse','commerce','account','support','engagement','in_store','unknown')), -- ★
  timestamp TIMESTAMPTZ NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  identifiers JSONB NOT NULL DEFAULT '{}',
  resolution_method TEXT NOT NULL CHECK (resolution_method IN ('deterministic','probabilistic','new_profile')), -- ★ NOT NULL
  resolution_confidence REAL NOT NULL,
  dedup_key TEXT NOT NULL UNIQUE,                                  -- ★ permanent idempotency
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- ★ removed: session_id, journey_id (computed at read time; never stored)
);
CREATE INDEX idx_events_profile_time ON events(profile_id, timestamp);
CREATE INDEX idx_events_timestamp ON events(timestamp);
CREATE INDEX idx_events_channel ON events(channel);
CREATE INDEX idx_events_type ON events(event_type);

CREATE TABLE resolution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,  -- ★ 1:1 enforced
  profile_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('deterministic','probabilistic','new_profile')),
  confidence REAL NOT NULL,
  evidence JSONB NOT NULL DEFAULT '[]',
  candidates JSONB NOT NULL DEFAULT '[]',
  identifiers_added JSONB NOT NULL DEFAULT '[]',                   -- ★ (API already returns it)
  ambiguous BOOLEAN NOT NULL DEFAULT FALSE,                        -- ★ (D-07)
  conflict BOOLEAN NOT NULL DEFAULT FALSE,
  conflict_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_resolution_profile ON resolution_logs(profile_id);

CREATE TABLE detected_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('drop_off','escalation','repeat_contact','unresolved_issue','churn_signal')),
  pattern_key TEXT NOT NULL,                                       -- ★ deterministic key (D-24)
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,          -- anchor event; NULL for churn_signal
  related_event_ids UUID[] NOT NULL DEFAULT '{}',                  -- ★ source/destination/contacts, for highlighting
  details JSONB NOT NULL DEFAULT '{}',
  evaluated_as_of TIMESTAMPTZ NOT NULL,                            -- ★
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, pattern_key)                                 -- ★
);
CREATE INDEX idx_patterns_type ON detected_patterns(pattern_type);

CREATE TABLE ingestion_log (                                        -- ★ replaces pipeline_metrics (D-22)
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  channel TEXT, event_type TEXT,
  outcome TEXT NOT NULL CHECK (outcome IN ('accepted','duplicate','rejected','failed')),
  stage_reached TEXT NOT NULL CHECK (stage_reached IN ('parsed','validated','normalized','deduplicated','resolved','stored','patterns')),
  error_code TEXT, error_message TEXT,                             -- PII-free
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  latency_ms INTEGER
);
CREATE INDEX idx_ingestion_time ON ingestion_log(received_at);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL CHECK (notification_type IN ('identity_conflict','churn_risk_high')),
  severity TEXT NOT NULL CHECK (severity IN ('info','warning','critical')),
  dedupe_key TEXT NOT NULL UNIQUE,                                 -- ★ (D-24/D-37)
  title TEXT NOT NULL, message TEXT NOT NULL,                      -- masked identifiers only
  profile_id UUID REFERENCES customer_profiles(id) ON DELETE SET NULL,
  deep_link TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_read ON notifications(read, created_at);
```

### 4.4 Backend architecture and API

A modular monolith in one Next.js app (Node runtime). **Transaction 1** (resolve and store) and **Transaction 2** (reconcile patterns) follow D-18. Server Components read through `lib/queries`; API routes are thin wrappers over the same functions (D-34).

| # | Method | Route | Tier |
|---|---|---|---|
| 1 | POST | `/api/v1/events` (token when deployed) | MUST |
| 2 | POST | `/api/v1/events/batch` (≤ 50) | MUST |
| 3 | GET | `/api/v1/customers` (page, pageSize, pattern, channel, churnRisk, minConfidence, dateFrom, dateTo, sortBy, sortOrder) | MUST |
| 4 | GET | `/api/v1/customers/search?q=` (≥ 3 chars; exact on strong IDs, prefix on others) | MUST |
| 5 | GET | `/api/v1/customers/:id` | MUST |
| 6 | GET | `/api/v1/customers/:id/journey` | MUST |
| 7 | GET | `/api/v1/customers/:id/identity` | MUST |
| 8 | GET | `/api/v1/events/:id` | SHOULD |
| 9 | GET | `/api/v1/analytics/summary` (dateFrom, dateTo, channel) | MUST |
| 10 | GET / POST | `/api/v1/notifications`, `/api/v1/notifications/read` | SHOULD |
| 11 | GET | `/api/v1/health` | SHOULD |
| 12 | GET | `/api/v1/pipeline/health` | ONLY IF TIME |

Errors use `{ error: { code, message, details? } }`. Response payloads follow TRD §12 except where the decisions above change them.

### 4.5 Event pipeline

`parse → validate (Zod) → normalize → dedup → [T1: resolve → expand identifiers → insert event → insert resolution_log → update profile counters] → [T2: evaluate(asOf) → reconcile patterns → flags → notifications] → ingestion_log`

- **Normalize:** timestamp to UTC (reject more than 1 h in the future); email lowercased and trimmed; phone to E.164 with IN default; loyalty_id uppercased; name trimmed and title-cased; event_type lowercased and mapped to a category (or `unknown`); `dedup_key` per D-15.
- **Outcomes:** 202 accepted · 202 `{duplicate: true, event_id}` · 400 with field errors · 500 generic. Every attempt writes one `ingestion_log` row.
- **Batches** run sequentially. Partial success is allowed.

### 4.6 Identity-resolution pipeline

1. **Strong lookup** (email, phone, loyalty_id) → the set P of profiles that own any of them.
   - |P| = 1 → **deterministic, 1.00**.
   - |P| ≥ 2 → **conflict**: winner = most events, then earliest; confidence **0.75**; strong identifiers owned by others are not moved; N-01; both profiles flagged.
   - |P| = 0 → step 2.
2. **Candidates** = profiles sharing an *exact* device_id or cookie_id with the event. (Name and time never generate candidates.)
3. **Contradiction filter:** drop a candidate that owns a strong identifier of a type present on the event with a different value.
4. **Score** = min(0.94, Σ contributions):

   | Signal | Contribution | Condition |
   |---|---|---|
   | device_id | 0.60 | exact match |
   | cookie_id | 0.30 | exact match |
   | session continuity | 0.50 | candidate has an event on the same channel with the same device/cookie within ±30 min |
   | name | 0.20 × JW | Jaro-Winkler ≥ 0.85 against the candidate's name |
   | temporal proximity | 0.10 | candidate has an event on a *different* channel within ±2 h |

5. **Decide:** best ≥ 0.70 and (best − runner-up) ≥ 0.05 → **probabilistic**. Best ≥ 0.70 but the margin is under 0.05 → **new profile**, `ambiguous = true`. Otherwise → **new profile** (confidence recorded as 0.00, method `new_profile`).
6. **Expand:** add the event's identifiers that the profile lacks (`link_method`, `link_confidence` = the event's decision). Set `is_anonymous = false` once a strong identifier is present. `identity_confidence` = min(link_confidence).
7. **Explain:** `resolution_logs` stores every signal (including non-matches), candidates with scores, identifiers added, and the ambiguity/conflict details.

**Reference outcomes (these become unit tests):**

| Case | Score | Result |
|---|---|---|
| Cookie, same channel, 4 min after the last event | 0.30 + 0.50 = 0.80 | probabilistic (Medium) |
| Cookie only, next day | 0.30 | new profile |
| Device only, different day | 0.60 | new profile |
| Device + name "Prya Sharma" vs "Priya Sharma" (JW ≈ 0.96) | 0.60 + 0.19 = 0.79 | probabilistic (Low) |
| Device + cross-channel event within 2 h | 0.70 | probabilistic (Low) |
| Name only | no candidate | new profile |
| Cookie matches a profile with a *different* email | filtered | new profile |
| Two candidates at 0.80 and 0.78 | margin 0.02 | new profile, ambiguous |

### 4.7 Journey engine (computed at read time; never stored)

- **Session** = consecutive events on the same channel with gaps ≤ 30 min. **Journey** = gaps ≤ 24 h across all channels. **Transition** = the channel changes between consecutive events.
- Late events need no special handling (ordering is by timestamp).
- The journey API returns events with `session_index`, `journey_index`, `is_transition`, `transition_from` and their patterns (anchor + related), plus `silence_days` = asOf − last_seen_at.

### 4.8 Detectors (pure functions of `(events, asOf)` → `Pattern[]` with `pattern_key`)

| Detector | Rule | Key |
|---|---|---|
| Checkout drop-off | `checkout_start` with no `purchase_complete` (any channel) within 2 h, evaluated only once asOf ≥ start + 2 h. Retries inside an open window don't open a new one. Anchor = last commerce event in the window. | `drop_off:checkout:{start_event_id}` |
| Onboarding drop-off (SHOULD) | `signup` with no non-account event within 7 d | `drop_off:onboarding:{id}` |
| Escalation | Assisted-contact start at tier T, with a lower-tier event within the preceding 48 h. Source = most recent lower-tier event. One per 48 h episode. | `escalation:{dest_event_id}` |
| Repeat contact | Contact starts {ticket_created, call_started, chat_started, email_sent, complaint_filed}. Those within 30 min collapse into one. A cluster of ≥ 2 within 7 d of the first contact counts. | `repeat:{first_contact_event_id}` |
| Unresolved issue | ticket_created or complaint_filed with no ticket_resolved/closed (same ticket_id when present) within 7 d, and still open at asOf | `unresolved:{initiation_event_id}` |
| Churn risk | R1 ≥ 3 collapsed contacts in any 30 d (high) · R2 an escalation within 30 d before last_seen AND asOf − last_seen ≥ 14 d (high) · R3 checkout drop-off with no later purchase AND asOf − last_seen ≥ 7 d (medium) · R4 an open unresolved issue (medium). Risk = highest matched, else none. | `churn:{profile_id}` |
| Churn outcome (analytics only) | `account_closed` OR asOf − last_seen ≥ 30 d (only for profiles with first_seen ≤ asOf − 30 d) | not stored; computed in queries |

**Clock:** `asOf = DEMO_AS_OF ?? now()`, read from one module (`lib/shared/clock.ts`).

### 4.9 Analytics layer (live SQL over the DB; no materialization)

**KPIs:** unified customers (known / anonymous) · events processed · **fragments unified** (distinct identifiers → known profiles, with the % of known customers seen on ≥ 2 channels) · average link confidence (excluding new_profile) · checkout drop-offs · escalations · repeat-contact rate · open unresolved issues · churn-risk customers (high / medium).

**MUST charts:** (1) **Top friction points**: pattern anchors grouped by channel · event_type · reason (`metadata.error_code | reason`), ranked by affected customers. (2) **Escalations by channel pair.** (3) **Churn correlation**: churn rate with vs without each pattern, the lift, and n, with a "synthetic data" label. Plus an **Insight card**: the top friction point, its affected customers, and those customers' churn rate vs the baseline, computed deterministically (no LLM).

**SHOULD charts:** events by channel, resolution method mix, confidence histogram, drop-offs by process.

**ONLY IF TIME:** channel-transition Sankey.

### 4.10 Notification system

Created in Transaction 2 or by the resolver. Only two types: `identity_conflict` (warning, deep link `/customers/:id/identity`) and `churn_risk_high` (critical, deep link `/customers/:id`). `dedupe_key` = `conflict:{event_id}` / `churn_high:{profile_id}`, and `ON CONFLICT DO NOTHING` preserves read state. The bell uses SWR with a 30 s refresh, paused when the tab is hidden. It shows the latest 20 notifications, and "mark all read" is available.

### 4.11 Deployment architecture

- **Canonical demo:** local `next start` + a Postgres database (Neon dev branch or local) seeded by `scripts/seed.ts` with `DEMO_AS_OF` fixed. The video is recorded from this setup.
- **Hosted (SHOULD):** Vercel, all routes `runtime = 'nodejs'`, plus Neon. Migrations and seed run from a laptop using `DIRECT_URL`. The same `DEMO_AS_OF`.
- **Env:** `DATABASE_URL`, `DIRECT_URL`, `DEMO_AS_OF`, `INGEST_TOKEN` (hosted only).

---

## 5. MVP boundary

### MUST BUILD
1. Schema (§4.3), migrations, Prisma client, taxonomy and constants, the clock.
2. Ingestion: `POST /events` and `/events/batch`, Zod validation, normalization (E.164 phone), permanent deduplication, ingestion_log.
3. Identity resolver per §4.6, including continuity, contradiction and ambiguity guards, conflicts, expansion and full evidence logs.
4. Journey read model (sessions, journeys, transitions, silence) and detectors: checkout drop-off, escalation, repeat contact, unresolved issue, churn risk, with `asOf` and reconciliation.
5. Seed: the Priya and Rajesh fixtures plus about 300 generated customers with ground-truth IDs.
6. Screens: Dashboard (KPIs, friction points, escalation pairs, churn correlation, insight card) · Customer list (pattern / churn / channel filters) · Customer (identity card, churn banner, **Journey tab**, **Identity tab with "fragments" view and resolution chain**) · Search dropdown.
7. `scripts/replay.ts` for the live ingestion beat. Unit tests for the scorer and detectors, plus the Priya golden integration test.
8. README with setup and demo instructions. Public repo with continuous commits.

### SHOULD BUILD
1. Notifications (N-01, N-05) and the bell.
2. `scripts/evaluate-identity.ts` and a "measured accuracy" KPI tile.
3. Event detail expansion (`GET /events/:id`, raw JSON).
4. Onboarding drop-off.
5. SHOULD charts (events by channel, resolution mix, confidence histogram, drop-offs by process).
6. Hosted deployment (Vercel + Neon) with the ingest token.
7. `GET /health`, loading skeletons and error boundaries on every page.

### ONLY IF TIME REMAINS
1. Channel-transition Sankey (the mockup's hero chart, built on real transition data).
2. Pipeline Health page (from `ingestion_log`).
3. Timeline filters beyond channel (event type, date, pattern).
4. Journey-to-journey comparison, CSV/JSON export.
5. Mobile-responsive polish.

### DO NOT BUILD
Authentication/RBAC · profile merge/split actions · message brokers, Redis, graph DB, search engine, vector DB · ML or LLM features of any kind · WebSockets/SSE/toasts · notification auto-expiry, throttling, system alerts, repeat/escalation/low-confidence notifications · "Seed Demo Data" button · marketing funnel (Awareness → Retention) · light mode · in-memory rate limiter · activity-decline churn rule · data-collection SDKs · CRM, marketing or billing features.

---

## 6. Change control

- A decision changes only through a new entry here (D-55 onwards) that names the decision it supersedes. Don't edit other documents first.
- A change to a MUST item or to the §7.3 fixture needs team sign-off and must update the golden test in the same commit.
- Numbers shown in the product or the demo come from code and seed output, never from documents.

---

## 7. Demo definition (canonical, 3:00)

### 7.1 Demo clock
`DEMO_AS_OF` = the moment the seed runs (for example `2026-10-10T04:30:00Z`, which is 10:00 IST). All fixture times below are offsets from **D0 = DEMO_AS_OF − 19 days, 10:00 IST**. Store UTC and display IST.

### 7.2 Required beats → where they occur

| # | Required beat | Time | Screen |
|---|---|---|---|
| 1 | Fragmented cross-channel events | 0:00–0:25 | Customer → Identity tab, "Fragments" panel |
| 2 | Identity resolution | 0:25–0:55 | Identity tab, resolution chain |
| 3 | Confidence / explanation | 0:25–0:55 | Identity tab, evidence rows and weakest-link card |
| 4 | Event stitching | 0:55–1:20 | Terminal `replay` → Journey tab |
| 5 | Unified journey | 1:20–1:45 | Journey tab |
| 6 | Meaningful problem detected | 1:45–2:20 | Journey badges and churn banner |
| 7 | Actionable insight | 2:20–2:55 | Dashboard insight card and churn correlation → filtered list → second customer |

### 7.3 Hero fixture: Priya Sharma "Frustrated Shopper" (canonical, supersedes D-43 sources)

Identifiers: cookie `ck_priya_01` · email `priya.sharma@example.com` · name `Priya Sharma` · device `dev_priya_m1` · phone `+919876543210`. Product: Running Shoes Pro, ₹4,999.

| # | When (IST) | Channel | Event | Identifiers on event | Key metadata | Expected resolution |
|---|---|---|---|---|---|---|
| E1 | D0 10:00 | web | page_view | cookie | `/products/running-shoes-pro` | new_profile (0.00); origin cookie |
| E2 | D0 10:04 | web | product_view | cookie | SKU-1234 | probabilistic **0.80** (cookie 0.30 + continuity 0.50) |
| E3 | D0 10:07 | web | add_to_cart | cookie | cart ₹4,999 | probabilistic 0.80 |
| E4 | D0 10:15 | web | login | cookie, email, name | method: password | probabilistic 0.80 → **adds email, name** (session bridge) |
| E5 | D0 10:20 | web | checkout_start | cookie, email | cart ₹4,999 | deterministic 1.00 |
| E6 | D0 10:24 | web | payment_attempt | cookie, email | `error_code: card_declined` | deterministic 1.00 |
| E7 | D0 11:05 | mobile | login | device, email | — | deterministic 1.00 → **adds device** |
| E8 | D0 11:08 | mobile | payment_attempt | device, email | `error_code: card_declined` | deterministic 1.00 |
| E9 | D0 13:00 | call_center | call_started | phone, email | reason payment_failure, wait 240 s | deterministic 1.00 → **adds phone** |
| E10 | D0 13:09 | call_center | ticket_created | phone | ticket TKT-8891, payment_failure | deterministic 1.00 |
| E11 | D0 13:12 | call_center | call_ended | phone | disposition pending | deterministic 1.00 |
| E12 | D0+3d 14:00 | call_center | call_started | phone | reason ticket_followup, ticket TKT-8891 | deterministic 1.00. **Ingested LIVE in the demo (late arrival).** |
| E13 | D0+3d 14:15 | call_center | call_ended | phone | disposition unresolved | deterministic 1.00 |
| E14 | D0+4d 19:30 | web | page_view | cookie, email | `/account/orders` | deterministic 1.00 (last activity) |

**Expected end state (golden-test assertions):**
- 1 profile · 14 events · channels {web, mobile, call_center} · identifiers {cookie (origin 1.00), email 0.80, name 0.80, device 1.00, phone 1.00} · **identity confidence 0.80**, with the weakest link "email ↔ anonymous web session (session continuity)".
- Mean resolution confidence: (0 + 0.8 × 3 + 1.0 × 10) / 14 = **0.886**. Excluding new_profile: 12.4 / 13 = 0.954.
- **Drop-off:** checkout from E5; no purchase by D0 12:20; anchor E8 (a *cross-channel* failure: web → app); reason card_declined.
- **Escalation:** E8 (mobile, tier 1) → E9 (call, tier 3), 1 h 52 m. E11, E12 and E13 do not add escalations: call_ended isn't a contact start, and E12 has no lower-tier event in the 48 h before it.
- **Repeat contact:** contacts E9+E10 collapse into one (within 30 min), then E12 → "2nd contact in 3 days". Before E12 is replayed this pattern is absent; after the replay it appears.
- **Unresolved issue:** TKT-8891, open since D0 13:09, past its 7-day window.
- **Churn risk HIGH:** R2 (escalation, then 14.6 days of silence) + R3 (drop-off, no purchase, ≥ 7 days silent) + R4 (open ticket). R1 is not matched (only 2 contacts).
- **Notification:** N-05 "High churn risk: Priya S." (critical).
- **Fragments panel:** web analytics sees `ck_priya_01` (E1–E6, E14); the app sees `dev_priya_m1` (E7–E8); the call center sees `+91 98765 43210` (E9–E13). That's 3 systems and 3 separate "customers" until JourneyX unifies them.

### 7.4 Second customer: Rajesh Patel "Support Loop, resolved" (contrast; also PRD §17's second story)

Times are relative to **A = DEMO_AS_OF** (not D0), so Rajesh is recently active.

| # | When (IST) | Channel | Event | Identifiers | Expected |
|---|---|---|---|---|---|
| R1 | A−12d 18:00 | email | email_sent (inbound) | email `rajesh.patel@example.in`, name | new_profile |
| R2 | A−12d 18:02 | email | ticket_created | email | det (TKT-7702, return_refund). Collapses with R1 as one contact. |
| R3 | A−10d 11:00 | chat | chat_started | email | det · **repeat, 2nd contact in 2 days**. No escalation (email and chat are both tier 2). |
| R4 | A−9d 17:30 | in_store | store_visit (purpose return) | loyalty `LYL-RP-4410`, phone `+919812345678`, email | det via email → adds loyalty and phone · **escalation chat (2) → in_store (4), 30.5 h** |
| R5 | A−9d 17:45 | in_store | return_processed | loyalty | det via loyalty |
| R6 | A−9d 17:50 | email | ticket_resolved (TKT-7702) | email | det. **Resolved in under 3 days, so no unresolved issue** |
| R7 | A−2d 12:00 | web | purchase_complete | email, cookie | det → adds cookie. Silent only 2 days, so churn risk **none** |

Takeaway for the viewer: Rajesh also escalated, but his issue was resolved and he came back to buy. That contrast is the point.

### 7.5 Population dataset
About 300 generated customers over 90 days before `DEMO_AS_OF`, from a seeded random generator, with all 6 channels. It includes about 10% anonymous-only browsers, a few shared-device households (so contradiction and conflict cases occur naturally), 2–3 deliberate strong-ID conflicts, and near-miss names. The generator *encodes* elevated churn after unresolved card-decline journeys. The narration must say "synthetic data". **Every number spoken in the demo is read from the seed output, not from this document** (D-46).

### 7.6 Script (3:00)

| Time | Screen | Action | Narration (core line) |
|---|---|---|---|
| 0:00 | Customer → Identity tab (Priya), Fragments panel | Open directly via a bookmark | "Three systems, three strangers: a cookie in web analytics, a device in the app, a phone number in the call center." |
| 0:25 | Identity tab, resolution chain | Walk E1 → E4 → E7 → E9 | "Same-session browsing links at 0.80: cookie plus continuity. The login bridges it to her email. Email matches are exact, 1.00, and bring in her device and phone. The weakest link is shown: 0.80. Name-only or next-day cookie matches are refused." |
| 0:55 | Terminal | `npm run replay -- priya E12` | "A call-center record arrives late, three days after the fact. It's validated, deduplicated and resolved by phone at 1.00, and the response already reports a repeat contact." |
| 1:05 | Journey tab | Refresh | "Stitched into place chronologically, even though it arrived last." |
| 1:20 | Journey tab | Scroll; point out sessions and transitions; expand E6 | "One journey: web browsing, checkout, card declined, retried on the app, declined again…" |
| 1:45 | Journey tab badges + churn banner | Drop-off → Escalation → Repeat → Unresolved → banner | "No purchase within 2 hours, so a drop-off, across two channels. She escalated to phone in under 2 hours, called again 3 days later, and ticket 8891 is still open. It's been 15 days of silence, so HIGH churn risk, with each rule listed." |
| 2:20 | Dashboard | Insight card + friction ranking | "Across {N} customers, 'payment declined → no recovery' is the #1 friction point, affecting {n} customers." |
| 2:35 | Dashboard, churn correlation | Point to the lift bar | "Customers with an unresolved issue churned {x}% vs {y}% baseline, {lift}× higher (synthetic data)." |
| 2:45 | Escalations-by-pair chart → filtered list (has escalation) → Rajesh | Click through | "Rajesh escalated too, but his return was resolved in store within 3 days, and he's buying again." |
| 2:55 | — | — | "JourneyX: explainable identity, stitched journeys, and the friction that costs you customers." |

**Screens required:** Identity tab (Fragments, Chain, Evidence), Journey tab (badges, banner, silence marker, expandable card), Dashboard (Insight card, Friction ranking, Escalations by pair, Churn correlation, KPIs), Customer list (filtered), plus a terminal. Pipeline Health isn't needed.

**Rehearsal note:** E12 is left out of the seed on purpose. Replaying it a second time returns `duplicate: true`, which is itself a good idempotency beat. To rehearse the "new" arrival again, reseed.

---

## 8. Implementation readiness

### Verdict: **NOT READY. It becomes READY for Milestone 1 as soon as items 1–2 below are approved.**

The documents as they stand specify contradictory identity scoring, schema constraints that break expansion, duplicating detectors and three different demo fixtures. Coding against them would bake the contradictions in.

**Must be resolved before any code:**
1. **Approve this decision register**, especially D-04…D-08 (identity model), D-06/D-15/D-16 (schema), D-23/D-24 (asOf and reconciliation), D-25…D-30 (detector and churn definitions) and D-43 (canonical fixture). Changing any of these after M1 means rework.
2. **Provide the verbatim PS-4 text** (or confirm that PRD §1–2 matches it). This mainly affects D-30 (churn correlation).

**Must be resolved before M2 / M3 (not blocking M1):**
3. Confirm the build window and team size (D-52). This decides whether the SHOULD tier is realistic.
4. Confirm the visual direction and palette (D-38), or supply brand assets.
5. Choose the dev/test database: a Neon branch or native Postgres on Windows (D-51).

**After approval:** update PRD, TRD, ARCH, DATA_MODEL, APP_FLOW and IMPL to match (one pass, D-03), or add a banner to each pointing here.

---

## 9. First build milestone: M1, "Identity core, end-to-end, no UI"

**Goal:** A raw event goes in over HTTP. A correctly resolved, explainable, idempotent record comes out. It's proven by the Priya golden test.

**In scope:**
- Repository scaffold (Next.js, TypeScript strict, Prisma, Zod, Vitest), `.env.example`, `.gitignore`, README skeleton, public GitHub repo.
- Prisma schema and a raw SQL migration exactly as in §4.3 (all 7 tables; CHECKs, partial unique index, unique dedup_key).
- `lib/shared`: types, taxonomy (PRD §10.3 + `account_closed` + `unknown`), constants (weights, thresholds, windows, tiers), AppError, a PII-safe logger, the db singleton, `clock.ts`.
- `lib/pipeline`: validator, normalizer (E.164 IN), dedup key, processor (Transaction 1 only), ingestion_log.
- `lib/identity`: candidates, Jaro-Winkler, scorer, resolver (deterministic, conflict, contradiction, ambiguity, continuity, expansion), evidence builder.
- `POST /api/v1/events`, `POST /api/v1/events/batch`.
- `scripts/fixtures/priya.ts` (E1–E14 exactly as in §7.3) and `scripts/replay.ts`.

**Out of scope:** detectors, the journey read model, analytics, notifications, seed generator, any UI.

**Acceptance criteria (all must pass):**
1. Unit tests: validator (≥ 10 cases), normalizer (≥ 8, including E.164 and the `unknown` category), Jaro-Winkler reference values, and **every row of the §4.6 reference table**.
2. Integration tests (real Postgres): new profile; deterministic match; expansion; conflict (winner and flags, no identifier moved); contradiction filter; ambiguity; next-day cookie creates a new profile; name-only creates a new profile.
3. **Priya golden test:** ingest E1–E11, E13, E14, then E12 last. Assert: 1 profile · 14 events · the exact per-event method and confidence from §7.3 · identifiers and link confidences as listed · `identity_confidence = 0.80` · one resolution_log per event, with evidence listing every scored signal.
4. **Idempotency:** re-ingesting all 14 events returns 14 × `duplicate: true` and adds 0 rows (except `ingestion_log`).
5. Invalid payloads (missing channel, no identifiers, bad timestamp, a timestamp more than 1 h in the future) return 400 with field errors and an `ingestion_log` row marked `rejected`. A forced database error returns 500, leaves no partial rows, and logs `failed`.
6. The measured single-event latency (local) is recorded in the README. It's reported, not gated.
7. At least 8 meaningful commits on `main`.

**Hand-off to M2:** journey read model, detectors with `asOf`, reconciliation, the rest of the Priya golden test (patterns and churn), Rajesh fixture, seed generator, ground-truth evaluation. **M3:** screens. **M4:** analytics, insight, demo polish and recording.
