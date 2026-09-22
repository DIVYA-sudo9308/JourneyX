# Repository review — 20 September 2026

Reviewed main at `d8f60284e2f024e7ed55dafa771fe97aab97fc8b`.

## Fixed

- Clean installation failed because the lockfile omitted required emnapi entries.
- Standalone type-checking failed on a clean checkout before Next.js generated route types.
- Dashboard Custom range never revealed its inputs; presets also ignored DEMO_AS_OF.
- Most dashboard KPIs ignored date/channel filters. Metrics now share the documented event-active cohort.
- Aggregate reads and customer journeys stopped at PostgREST's row limit. They now fetch stable ordered pages and propagate page failures.
- Repeat-contact rate counted occurrences instead of people, allowing values above 100%.
- Friction counts included duplicate customers; the insight applied all-drop-off churn rates to a specific failure. Both now use the actual affected customer set.
- Average link confidence used weakest profile scores instead of event resolution confidence. Origin/new-profile events are excluded.
- Fragments included anonymous profiles and duplicate identifier rows; the KPI now counts distinct identifiers linked to known profiles.
- Unified customer totals excluded anonymous profiles despite showing both categories in the breakdown.
- Zero-baseline lift was incorrectly reported as zero risk. It is now unavailable.
- Journey splitting rounded gaps before applying the 30-minute and 24-hour thresholds.
- Filtered journey boundary labels displayed gaps to hidden events instead of the preceding visible event.
- Silence duration was frozen to seed metadata rather than calculated from the current as-of clock.
- Invalid/impossible calendar filters reached database queries; dates now use validated calendar bounds with an exclusive next-day upper bound.
- Mobile and desktop filter controls shared IDs; labels now target their own controls. Invalid confidence parameters no longer yield NaN slider values.
- Rerunning the initial migration tried to drop the wrong policy name, leaving the existing policy and causing CREATE POLICY to fail.
- Setup documentation incorrectly promised a mock fallback and omitted the grants migration.

## Verification and limits

Regression coverage is in `tests/regressions.test.ts`. Run `npm ci`, `npm test`,
`npm run typecheck`, `npm run lint`, and `npm run build`.

No live Supabase credentials were available during this review. Database migrations,
live queries, and seed writes have not been run against the deployed project.
A browser interaction check could not run because this environment has no installed
Playwright Chromium executable. The production build and automated logic tests are
the available verification.

This is still an incomplete MVP: global search, notifications, identity and pipeline
screens contain placeholders, and there are no ingestion/identity-resolution API
routes in this checkout. These are unfinished features, not completed by this bug-fix pass.

Dashboard churn figures use current profile risk, including when a historical date
range is selected. Analytics aggregate paginated rows in server memory, appropriate
for the hackathon dataset; larger deployments should move these aggregates to SQL.
