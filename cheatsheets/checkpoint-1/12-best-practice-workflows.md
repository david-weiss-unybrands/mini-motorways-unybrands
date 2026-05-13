# Best Practice Workflows

**Source:** https://docs.getdbt.com/best-practices/best-practice-workflows
**Type:** Documentation · Checkpoint 1

## What it is
The collective dbt-Labs wisdom on how to *operate* dbt day-to-day: version control, environments, project conventions, and CI workflows that scale.

## Workflow practices

### Version control everything
- All dbt projects in git; PR review required before merging to `main`.
- Feature branches for new work and bug fixes.

### Use separate dev and prod environments
- `dev` target for local CLI work; `prod` target only for scheduled deployments.
- Configured via profile targets — see "Managing environments."

### Adopt a style guide
- Codify SQL style, field naming, file conventions.
- dbt Labs' public style guide is a good starting point.

## Project practices

### Always `ref()`
- `{{ ref('model') }}` lets dbt infer dependency order *and* environment-correctness.
- Never select directly from `my_schema.my_table` for models.

### Limit raw-data references — use sources
- Define raw data as sources (one place to update when schemas drift).
- No direct relation references in dbt Labs' own projects.

### Rename & recast once (at the staging layer)
- Staging models select from a single source, do all renames and type casts, then everything downstream inherits.
- Eliminates duplicated transformation logic.

### Break complex models up
Split when:
- A CTE is duplicated across two models (→ extract a model).
- A CTE changes grain (→ extract, then test it).
- The SQL is too long to hold in your head.

### Group models in directories
Use nested subdirectories — they enable:
- Folder-level config in `dbt_project.yml`.
- Folder-based selection (`--select marts.marketing`).
- Convention enforcement (e.g., "marts can only ref marts or staging").

### Add tests
At a minimum: every model has a primary key tested for `unique` and `not_null`.

### Design the warehouse's information architecture
- Use [custom schemas](/docs/build/custom-schemas) to group related models.
- Use prefixes (`stg_`, `fct_`, `dim_`) so SQL-client users can find query-ready tables.

### Choose materializations wisely
Pattern:
- **views** by default
- **ephemeral** for lightweight not-end-user transforms
- **tables** for BI-queried models and models with many descendants
- **incremental** only when table build time becomes intolerable

## Pro tips

### Model selection when developing locally
Run just what you're touching: `dbt run --select my_model+` (the `+` includes downstream).

### Slim CI — only modified models
```bash
dbt run  -s state:modified+ --defer --state path/to/prod/artifacts
dbt test -s state:modified+ --defer --state path/to/prod/artifacts
```
Reruns only models that changed (+ their descendants), with `--defer` reading unchanged parents from production. Saves time and money in CI.

### Result-status selectors
Combine `state:modified+` with `result:error+`, `result:fail+`, etc.:
```bash
dbt build --select state:modified+ result:error+ --defer --state path/to/prod/artifacts
```
Rerun failures plus modifications in one command.

> Gotcha: `dbt test` overwrites `run_results.json`, so combining `result:error` + `result:fail` only works in a single `dbt build` invocation, not across sequential `dbt run` then `dbt test`.

### Source-freshness-driven builds
```bash
dbt source freshness
dbt build --select source_status:fresher+ --state path/to/prod/artifacts
```
Only build downstream of sources that actually got new data.

### Limit dev data via target
```sql
select * from event_tracking.events
{% if target.name == 'dev' %}
where created_at >= dateadd('day', -3, current_date)
{% endif %}
```
Or use the env var `DBT_CLOUD_INVOCATION_CONTEXT` (`prod`, `dev`, `staging`, `ci`).

### Use `grants` resource config
Codify warehouse permissions in dbt; no more manual `GRANT` statements drifting from version control.

### Separate source-centric from business-centric logic
Two passes:
1. Source-centric: union, dedup, re-alias, re-cast → staging.
2. Business-centric: define entities and metrics → marts.
This is the structural reason for the staging/marts split.

### Manage Jinja whitespace
Compiled SQL in `target/compiled/` showing weird whitespace? See Jinja's whitespace-control docs.

## Key takeaways
- Version control, dev/prod separation, style guide — non-negotiable baselines.
- `ref()` everywhere; sources for raw; rename/recast once.
- Folder structure drives config, selection, and convention.
- Slim CI (`state:modified+ --defer`) is the highest-ROI workflow pattern.
- Match materializations to the speed/build-time trade-off, not to "feels right."

## Related
- *How we structure our dbt projects* — the folder structure this references.
- Slim CI / `--defer` / state selection.
- `grants` resource config; environment variables.
