# Test Smarter Not Harder

**Source:** https://docs.getdbt.com/blog/test-smarter-not-harder
**Type:** Reading · Checkpoint 3

## What it is
A 2024 dbt Labs post that proposes a **testing framework** for dbt projects. The thesis: testing should drive *action*, not accumulate alerts. Bad testing has two failure modes — too few tests (only PKs), or too many (alert fatigue). This guide threads the middle path.

## The two-phase framework

### Phase 1: Identify
Bucket data-quality issues into three categories.

#### Bucket 1: Data hygiene
Issues you fix in the **staging layer**. The data should meet formatting, completeness, and granularity expectations.
- **Granularity** — primary keys unique and not null.
- **Completeness** — columns that should contain text always do.
- **Formatting** — email addresses have valid domains, etc.

#### Bucket 2: Business-focused anomalies
Unexpected behavior relative to known business norms. Human-defined; thresholds drift over time and need updating.

Discovery method: pick 1–3 frequently used BI dashboards/tables. For each, list 1–3 expected behaviors. Examples:
- Revenue shouldn't move >X% in Y time (fraud / OMS signal).
- MAU shouldn't decline >X% post-onboarding (UX signal).
- Exam pass rate shouldn't dip below Y% (content/tech signal).
Also: mine recent data incidents (#data-questions, stakeholder DMs) for 3–4 prior issues to guard against.

#### Bucket 3: Stats-focused anomalies
Distributional fluctuations: volume anomalies, dimensional anomalies (too many products under a line), column anomalies (values >N stdev from mean). Generally requires more advanced tooling — out of scope of this post. Tackle after hygiene + business anomalies are solid.

### Phase 2: Prioritize
For every concern, ask whether the affected data is:
- **Customer-facing?**
- **Used for financial decisions?**
- **Executive-facing?**

These are **high-impact, pipeline-failing** events → severity = **error**.

Everything else is **nice-to-know** → severity = **warn**, or remove entirely. *"If you don't have a specific action you can immediately take when a test fails, the test should be a warning, not an error."* Kept-but-warned tests are only justified if you're using them to inform a decision in the next ~6 months.

## Action plan
For each prioritized concern, write down **1–2 initial debugging steps**. Examples:
> Revenue shouldn't change by more than X% in Y time.
> - Check recent revenue values in staging model.
> - Identify transactions near min/max values.
> - Discuss outliers with sales-ops team.

Add these to:
- A team **testing framework doc** (linked in project README).
- The **test's description** (yes, [singular tests can have descriptions](https://discourse.getdbt.com/t/is-it-possible-to-add-a-description-to-singular-tests/5472/4)).

If you can't define an action step, *delete the test* (or move it to a backlog).

## Recommended packages
After your prioritized list is done, find tests on `hub.getdbt.com`:
- `dbt-expectations`
- `dbt_utils`

## What makes a "good" data quality program
Trusted, frequently used data. No more "let me re-derive the metric myself to double-check." Testing exists to deliver that trust — not to fire alerts into Slack at 3am that everybody mutes.

## Severity, recap
- **error** — pipeline fails. Customer-facing / financial / executive-impacting concerns only.
- **warn** — pipeline continues; result shows up in `run_results.json` and dashboards. Use for genuinely useful informational checks tied to upcoming work.
- **no test** — when you can't articulate the action.

## Tools worth knowing about
- **dbt Advanced Testing course** — deeper coverage.
- **`dbt_meta_testing`** / **`dbt_project_evaluator`** — enforce best practices.
- **dbt Explorer Recommendations** — surfaces missing tests, anti-patterns.

## Key takeaways
- Three buckets: hygiene, business anomalies, stats anomalies.
- Three prioritization questions: customer-facing? financial? executive?
- Tests without actionable debugging steps → drop or downgrade to warn.
- Living framework document, linked in README.
- Pair this *what to test* with the next post (*where to put tests*).

## Related
- *Test smarter — where should tests go?* (the layered placement guide).
- Data tests, custom generic tests, unit tests.
- `severity`, `store_failures` configs.
- Advanced Testing course; `dbt-expectations`, `dbt_utils`.
