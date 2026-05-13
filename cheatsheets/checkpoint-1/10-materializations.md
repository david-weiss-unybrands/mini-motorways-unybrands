# Materializations

**Source:** https://docs.getdbt.com/docs/build/materializations
**Type:** Documentation · Checkpoint 1

## What it is
Materializations are the *strategy* dbt uses to persist a model in the warehouse. Five built-ins plus custom materializations.

| Materialization | What it is | Best for |
|---|---|---|
| **view** (default) | `create view as ...` each run | Cheap transforms; staging |
| **table** | `create table as ...` each run | BI-queried marts; reused downstream |
| **incremental** | Inserts/updates new rows since last run | Big event-style data |
| **ephemeral** | Inlined as a CTE into refs; not materialized | Light DRY logic early in DAG |
| **materialized_view** | Native warehouse MV (where supported) | Like incremental but warehouse refreshes it |

Default: **view**.

## How to configure

In `dbt_project.yml` (cascades by folder):
```yaml
models:
  my_project:
    events:
      +materialized: table
    csvs:
      +materialized: view
```

In the model SQL:
```sql
{{ config(materialized='table', sort='timestamp', dist='user_id') }}
select * from ...
```

In `properties.yml`:
```yaml
models:
  - name: events
    config:
      materialized: table
```

## The five built-ins in depth

### View
- `create view as`. No storage.
- ✅ Always fresh, cheap.
- ❌ Slow to query for heavy transforms or stacked views.
- 💡 Default. Use for staging and anything not heavy.

### Table
- `create table as`. Stored.
- ✅ Fast to query.
- ❌ Rebuilds fully each run (can be slow); no auto-pickup of new source rows.
- 💡 Use for BI-queried marts and slow-built models reused downstream.

### Incremental
- Adds/updates rows since the last run.
- ✅ Build time scales with new data, not all data.
- ❌ Advanced — needs `unique_key`, `incremental_strategy`, etc.
- 💡 Use only when full-refresh tables get too slow. Best for event-style/append-mostly data.

### Ephemeral
- Inlined into ref-ing models as a CTE (prefixed `__dbt__cte__`).
- ✅ DRY, no warehouse clutter.
- ❌ Cannot `select` directly. Operations (e.g. `dbt run-operation`) can't `ref()` it. Harder to debug. **Does not support model contracts.**
- 💡 Use sparingly: light transforms early in DAG, referenced by one or two models.

### Materialized View
- Native warehouse MV. Combines view ergonomics with table speed.
- ✅ Most platforms auto-refresh; `dbt run` becomes deploy-only (like a view) — no need to schedule refreshes.
- ❌ Fewer per-platform config knobs; not supported everywhere.
- 💡 Use when incremental would work but you'd prefer the platform manages the refresh.
- Uses `on_configuration_change` config to decide whether to alter or recreate when a setting changes.

> Note: `dbt-snowflake` doesn't support materialized views — it uses **Dynamic Tables** instead.

## Python models — materialization limits
- ✅ `table`, `incremental` only.
- ❌ Cannot be `view` or `ephemeral`.
- Incremental Python models support the same `incremental_strategy` options as SQL (adapter-dependent).
- BigQuery/Dataproc: incremental Python supports `merge` but **not** `insert_overwrite`.

## Decision flow (the canonical progression)
1. **Start with view.**
2. When the view is too slow to *query* → **table**.
3. When the table is too slow to *build* → **incremental**.
4. If the warehouse supports it and you want managed refresh → **materialized view**.

## Custom materializations
You can define your own via macros — covered in *Creating new materializations*.

## Key takeaways
- Default is view; only escalate when there's a real problem.
- Pick based on (a) query speed needed, (b) build time tolerable, (c) whether you want managed refresh.
- Ephemeral has real limitations: no direct select, no `ref` from operations, no contracts.
- Python = table or incremental, never view/ephemeral.
- Configure at the directory level via `dbt_project.yml` whenever possible.

## Related
- Materializations best practices — when to escalate.
- Incremental models overview / strategy / microbatch.
- Snapshots — for SCD Type-2 (separate doc).
