# Microbatch Incremental Models

**Source:** https://docs.getdbt.com/docs/build/incremental-microbatch
**Type:** Documentation · Checkpoint 1

## What it is
An incremental strategy purpose-built for **large time-series datasets**. Splits each run into independent, idempotent batches defined by an `event_time` column. Available in dbt 1.9+ / Latest release track.

## Why it exists
Traditional incremental strategies operate on "all new data" in one query. Microbatch lets dbt:
- Process new data in small, time-bounded queries.
- Reprocess failed batches independently (`dbt retry`).
- Run batches in parallel (auto-detected or `concurrent_batches: true`).
- Do backfills without writing custom conditional Jinja.

## How a microbatch model works
- You declare `event_time`, `begin`, and `batch_size`.
- dbt splits the run into one query per batch (default `day`).
- Each batch query filters refs/sources to that batch's time window.
- dbt then inserts/replaces the batch atomically using the most efficient adapter-specific mechanism.

## Per-adapter mechanism
| Adapter | Underlying op |
|---|---|
| postgres | `merge` |
| redshift | `delete+insert` |
| snowflake | `delete+insert` |
| bigquery | `insert_overwrite` |
| spark | `insert_overwrite` |
| databricks | `replace_where` |

## Required config
```sql
{{ config(
    materialized='incremental',
    incremental_strategy='microbatch',
    event_time='session_start',
    begin='2020-01-01',
    batch_size='day'   -- hour | day | month | year
) }}
```

| Config | Required? | Default | Notes |
|---|---|---|---|
| `event_time` | ✅ | – | column on the model AND on direct parents to be filtered |
| `begin` | ✅ | – | first batch's start date (used for initial / full-refresh) |
| `batch_size` | ✅ | – | `hour`, `day`, `month`, `year` |
| `lookback` | optional | `1` | reprocess N prior batches to catch late-arriving data |
| `concurrent_batches` | optional | auto | force parallel/sequential execution |

### Adapter-specific extras
- `dbt-postgres`: `unique_key` required (uses merge).
- `dbt-spark`, `dbt-bigquery`: `partition_by` required.

## You must also set `event_time` on upstream models
For dbt to filter a ref to a batch's window, that upstream must declare an `event_time` too. Dimensional/static parents (e.g. `customers`) can be left unset — they'll do a full scan in each batch.

```yaml
models:
  - name: page_views
    config:
      event_time: page_view_start
```

## Worked example
```sql
-- models/sessions.sql
{{ config(
    materialized='incremental',
    incremental_strategy='microbatch',
    event_time='session_start',
    begin='2020-01-01',
    batch_size='day'
) }}

with page_views as ( select * from {{ ref('page_views') }} ),  -- auto-filtered
     customers  as ( select * from {{ ref('customers') }} )      -- not filtered

select
  page_views.id as session_id,
  page_views.page_view_start as session_start,
  customers.*
from page_views
left join customers on page_views.customer_id = customers.id
```

For an Oct 1 batch, dbt compiles `where page_view_start >= '2024-10-01' and < '2024-10-02'`. For Oct 2, the next bounded window — totally independent of Oct 1.

## Idempotency
Each batch is atomic and idempotent: same input data → same output table for that batch, no matter how many times you run it.

## Full-refresh behavior
- Best practice: set `full_refresh: false` on microbatch models — they're designed to backfill from `begin` instead.
- `dbt run --full-refresh` alone won't reset data unless `begin` is set.

## Backfills
Run a model over an arbitrary range with explicit time bounds (CLI flags / `--event-time-start` and `--event-time-end`) without writing conditional Jinja.

## Retry
`dbt retry` reruns only the failed batches — not the entire model. Each batch's success/failure is tracked independently.

## When NOT to use microbatch
- No reliable `event_time` column.
- You need custom merge logic across non-time keys.
- Updates are random in time (not append-mostly).

## Key takeaways
- Microbatch = time-windowed, idempotent incremental for big time-series.
- Required: `event_time`, `begin`, `batch_size`.
- Set `event_time` on parents you want filtered; static parents stay un-filtered.
- Adapter-specific extras: `unique_key` (postgres), `partition_by` (spark/bigquery).
- Failed batches retry independently; backfills are first-class.
- Pair with `full_refresh: false` so you don't accidentally blow the table away.

## Related
- `event_time` resource config.
- `dbt retry`.
- Parallel batch execution (`concurrent_batches`).
- Incremental strategy (the parent doc).
