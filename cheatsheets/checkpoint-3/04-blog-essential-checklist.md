# Your Essential dbt Project Checklist

**Source:** https://docs.getdbt.com/blog/essential-dbt-project-checklist
**Type:** Reading · Checkpoint 3

## What it is
A field-tested audit checklist for cleaning up dbt projects. After seven client audits, dbt Labs found the same opportunities in every project: better performance, better maintainability, easier onboarding. Use this list to score your own project.

## The audit checklist (compressed)

### dbt_project.yml
- **Project name** is meaningful (`my_company_analytics`, not `my_new_project`).
- No `materialized: view` clutter — that's the default; don't declare it.
- Set materializations at the folder level when whole subdirs share one, not per-model.
- Strip placeholder comments from `dbt init`.
- Use `on-run-end` post-hooks to **grant** permissions to BI/analyst roles.
- Use **tags sparingly** — they should mark exceptions, not enumerate the norm. Folder selectors usually replace tag-based selection.
- Consider **YAML selectors** for complex multi-criteria selection — they read better than chained tag expressions.

### Package management
- `packages.yml` versions are current — check against `hub.getdbt.com`.
- `dbt_utils` installed. It's the de facto standard kit.

### Code style
- Documented, **enforced** style (SQL formatting, field naming).
- Make use of window functions and aggregations instead of manual loops/CTEs.

### Project structure
- Staging / intermediate / marts present, with `stg_`, `int_`, `fct_`/`dim_` prefixes.
- One transformation per model; one transformation per CTE.
- **Filter early** — pushing filters upstream is the most common missed optimization.
- Macro file names clearly indicate the macros inside.

### dbt
- Recent dbt version. The further behind, the more painful upgrading becomes.
- Know your longest-running models — are they good candidates for incremental?
- Every model runs in every run? Circular references? Models defined but never built are a smell.
- Sources are used everywhere; **no model selects from raw tables**.
- Source freshness configured for critical sources.
- `dbt test` runs in dev *and* in production jobs.
- Jinja is readable: `set` statements at the top, whitespace tidy (`{{ this }}` not `{{this}}`), in-line comments via `{# #}`.
- Incremental models use `unique_key` + `is_incremental()` guard.
- Tags exist for a reason and get used; otherwise delete them.

### Testing & CI
- ✅ **100% test coverage** as an ideal. Minimum: every model has `not_null` + `unique` on the primary key.
- Tests reflect real assumptions — both about source data and about business logic.
- All changes flow through **PRs with mandatory review**.
- PR template in place.

### Documentation
- Every model has a description; complex transformations have explanations.
- Column-level descriptions use **doc blocks** (`_<dir>__docs.md`).
- README exists and is current.
- Onboarding a new person should not require tribal knowledge.

### dbt Cloud specifics
- Jobs inherit dbt version from the environment (eases upgrades).
- Jobs make sense — no orphan/unused projects.
- Run frequency matches data update frequency (don't run hourly when source updates daily).
- Periodic full-refresh of production exists.
- Scheduled tests run regularly.
- Longest-running jobs identified; CI job exists (GitHub).
- dbt Cloud has its own warehouse user with a defined default warehouse/role.
- Slack/email notifications on failed jobs are wired up.

## Why this matters in CP3
CP3 is about pipelines that survive: tests where they belong, CI that catches what should be caught, deploys that are repeatable. This checklist is the *operational* counterpart to "test smarter" — it surfaces structural debts that make resilience harder.

## How to use the checklist
- Print it / save it as a markdown file in the repo.
- Run through it section-by-section quarterly.
- Treat each ❌ as a discrete refactor; file a ticket per one.
- The points marked "default" or "should not" (`materialized: view` declarations, tagging every model) are the cheapest wins.

## "Where's Waldo"-style framing
The original post calls this a Waldo book — it tells you what to look for, but you still have to find Waldo in your project. The value is in the **named patterns** of decay, not the search itself.

## Key takeaways
- Naming, tagging, and macro hygiene drift fastest — audit them first.
- Sources + freshness + `is_incremental()` are non-negotiable for resilient pipelines.
- Tests: minimum PK uniqueness/not-null on every model; ideal is 100%.
- CI + PR review + doc blocks make on-boarding linear instead of tribal.
- dbt Cloud audits: env-inherited dbt version, scheduled tests, run cadence matching source cadence.

## Related
- *Test smarter not harder* / *Where should tests go?*
- *How we structure our dbt projects*.
- `dbt_project_evaluator` and `dbt_meta_testing` packages — automate the checklist.
- Slim CI, `--defer`, `state:modified+` for CI economy.
