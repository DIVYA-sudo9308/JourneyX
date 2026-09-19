# JourneyX — corrections, revision 1.1

Date: 2026-09-19

These changes update the supplied requirements, examples, and design reference. Application implementation is still pending the implementation plan.

## Corrections

1. **Time-based detection:** Added evaluation on ingestion and relevant reads, a shared server `asOf`, visible-screen polling, evaluated timestamps, explicit no-client behavior, and failure handling. No scheduler or worker is required for the bounded demo.
2. **Shared identifiers:** Made links unique per profile, with global uniqueness only for email/phone/loyalty ID. Different customers can share a name, cookie, or device. Strong conflicts remain explicit; no automatic profile merge.
3. **Evidence scores:** Replaced available-signal normalization with fixed contributions capped at 0.94. Added ambiguity and contradiction checks. Documented a limited same-session cookie-continuity rule so anonymous browsing can still form a journey without pretending to verify a human identity. UI scores are heuristics, not probabilities.
4. **Pattern and notification duplication:** Replaced append-only insertion with transactionally reconciled snapshots, stable UUIDs, stale-pattern removal, and preservation of notification read state. Added failure, concurrent-refresh, repeated-read, and late-event acceptance cases.
5. **Dashboard scope:** Kept PRD/APP_FLOW as the functional MVP contract. Marked the Sankey/funnel export as a styling reference with illustrative metrics and static controls; deferred extras are not implicit implementation requirements. Added a visible banner.
6. **Mockup loading:** Changed all script references to match the actual uploaded filenames in the same directory. Updated viewing instructions.

## Related consistency fixes

- Synchronized TRD and DATA_MODEL SQL blocks, including notification severity/deep links and the accepted `unknown` event category.
- Corrected schema statistics: 7 tables, 69 columns, 7 foreign keys, 9 CHECK constraints, 27 indexes including primary-key/UNIQUE backing indexes.
- Corrected the Priya fixture: authenticated web-session bridge precedes deterministic mobile email matching; 12 events across 4 channels; mean event evidence score 0.866667 (86.7/100).
- Corrected matching evidence arithmetic and demo narration. Platform-wide demo counts remain placeholders to replace with actual seed results.
- Distinguished a current unresolved issue from a historical missed deadline, and required process/issue correlation during reconciliation.
- Limited escalation triggers to assisted-contact starts/visits so a call-ended event does not create another escalation.
- Updated document links to the supplied filenames and labeled abbreviated API payloads as illustrative text.
- Preserved the three rendering libraries byte-for-byte.

## Verification performed

- Identical canonical SQL blocks in the two schema-bearing documents; structural counts checked. SQL was not executed against a PostgreSQL server.
- Fixture JSON parsed; event count, distinct channels, bridge identifiers, and average score checked.
- Complete JSON examples parsed, Markdown code fences balanced, and local document links checked.
- HTML and all three script URLs served successfully over local HTTP with exact matching file bytes; JavaScript syntax checks passed.
- Browser rendering check could not run because a browser executable is unavailable in this environment. No visual-rendering claim is made.
- No backend exists in the supplied files, so end-to-end application behavior and performance remain future implementation gates. The TRD includes the acceptance cases for those gates.

## Files

Updated: PRD.md, TRD.md, APP_FLOW.md, ARCHITECTURE(1).md, DATA_MODEL(1).md, README(1).md, Analytics.dc(1).html.

Unchanged dependencies included: react(1).js, react-dom(1).js, support(1).js.
