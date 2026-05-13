# Test Smarter — Where Should Tests Go?

**Source:** https://docs.getdbt.com/blog/test-smarter-where-tests-should-go
**Type:** Reading · Checkpoint 3

## What it is
The follow-up to *Test smarter not harder*. Once you've prioritized **what** to test, this post tells you **where** in the pipeline each test belongs — mapped to dbt Labs' canonical staging / intermediate / marts / CI structure.

## The headline rules
- **Sources** — tests should catch **fixable-at-the-source-system** issues.
- **Staging** — business-focused anomalies on individual tables; clean up nulls/dupes/outliers that *can't* be fixed at source.
- **Intermediate & marts** — anomaly tests resulting from joins/calculations + extra primary-key/not-null where grain protection matters.
- Don't re-test passthrough columns at every layer.
- Don't add tests that validate your own cleanup work (e.g., `not_null` on a column you just filtered nulls from).

## "Fixable" defined
A source issue is fixable if either:
- *You* can correct it at the source system, OR
- You know the right person and have a strong-enough relationship to actually get it fixed.

If a problem is technically fixable but won't realistically happen this planning cycle → mitigate in **staging**, not via a source test that just rings the alarm bell.

## Per-layer guidance

### Sources

**Source freshness**
- Sources feeding **high-impact** outputs (customer-facing / financial / executive) → `dbt source freshness` in your job, severity = **error**. Stale source = failed job.
- Sources NOT feeding high-impact outputs → severity = **warn**. You still get visibility; pipeline keeps running.

**Source data tests** (must be source-fixable)
- Duplicate records that can be deleted at the source.
- Nulls that can be filled in at the source (e.g., missing customer email).
- PK uniqueness when duplicates are removable upstream.

### Staging

- **Data cleanup** — use the standard staging best practices (rename, recast, categorize). **No test on your own cleanup**: don't write `not_null` on a column whose nulls you're filtering out.
- **Business anomaly tests** — single-table, define expected boundaries:
  - Accepted ranges (e.g., a store can't sell more units than it received).
  - Sign expectations (negative transactions only on returns).
  - Volume bounds outside seasonal norms.

### Intermediate (when present)

Focus on **new** columns and **grain changes**.
- **Primary key tests** on any model that re-grains.
- PK tests on enriched-but-same-grain models too — documents intent for future devs.
- After joins/aggregations, simple anomaly tests:
  - `accepted_values` on new categorical columns.
  - `mutually_exclusive_ranges` (`dbt_utils`) for related range columns (e.g., age brackets).
  - `not_constant` (`dbt_utils`) for columns that should always change (e.g., page-view counters).
- Consider **unit tests** for particularly complex SQL.

### Marts

Same hygiene-or-anomaly pattern, focused on new columns.
- **Unit tests** for transformation logic with branching/CASE-WHEN (forecasting dates, customer segmentation).
- **PK tests** where mart grain differs from upstream — or where grain matches but intent should be documented.
- **Business anomaly tests** on new calculated fields:
  - Singular tests for specific high-impact concerns (e.g., fuzzy-matching to detect free-trial abuse).
  - "This calculation can't move by more than X% week-over-week."
  - Ledger-style invariants ("today's running total ≥ yesterday's").

### CI/CD

This is where the testing framework gets **automated**.
- Use **Slim CI**: `dbt build --select state:modified+ --defer --state path/to/prod`.
- All your prioritized, well-placed tests run on every change, but only against modified models and their descendants.
- With CI + scheduled prod runs, the framework is on autopilot.

### Advanced CI (dbt Cloud)
- Start with the built-in **modified / added / removed** flags in the "compare changes" UI.
- These are gut-check evidence for reviewers — easy review baseline.
- More advanced row-level diffing is available but goes beyond the post's scope.

## Mental model
> Testing is like marathon training. Random testing = running 20 miles a day with no plan and getting injured. Smart testing = a training plan, revised as your needs evolve.

## Key takeaways
- Source tests guard things you can fix at the source — everything else moves to staging.
- Staging fixes data and tests **business anomalies on single tables**.
- Intermediate/marts test **new** logic only — don't retest passthroughs.
- PK tests where grain changes OR where enrichment happens (intent signaling).
- Unit tests at the layer doing complex transformations (often marts, sometimes intermediate).
- Slim CI automates the framework; Advanced CI gives reviewer evidence.

## Related
- *Test smarter not harder* (the prerequisite framework post).
- *How we structure our dbt projects* (the layer definitions this post depends on).
- Data tests, unit tests, custom generic tests, source freshness.
- Slim CI / state selection.
