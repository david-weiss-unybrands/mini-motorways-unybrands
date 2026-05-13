# Incremental Strategy

**Source:** https://docs.getdbt.com/docs/build/incremental-strategy
**Type:** Documentation · Checkpoint 1

## What it is
`incremental_strategy` configures *how* dbt writes new/changed rows in an incremental model. The right choice depends on volume, unique-key reliability, and adapter support.

## Strategy support matrix (paraphrased)

| Adapter | append | merge | delete+insert | insert_overwrite | microbatch |
|---|:--:|:--:|:--:|:--:|:--:|
| postgres | ✅ | ✅ | ✅ | – | ✅ |
| redshift | ✅ | ✅ | ✅ | – | ✅ |
| bigquery | – | ✅ | – | ✅ | ✅ |
| spark | ✅ | ✅ | – | ✅ | ✅ |
| databricks | ✅ | ✅ | ✅ | ✅ | ✅ |
| snowflake | ✅ | ✅ | ✅ | ✅ | ✅ |
| trino | ✅ | ✅ | ✅ | – | ✅ |
| fabric | ✅ | ✅ | ✅ | – | – |
| athena | ✅ | ✅ | – | ✅ | ✅ |

## Configuring
```yaml
# dbt_project.yml — project-wide default
models:
  +incremental_strategy: insert_overwrite
```
```sql
-- per-model
{{ config(
    materialized='incremental',
    unique_key='date_day',
    incremental_strategy='delete+insert'
) }}
select ...
```

## Built-in strategies

### `append`
Just `INSERT` new rows. No upserts, no dedup.
- ✅ Simple, cheap.
- ❌ Duplicates if a row repeats. Not SCD1, only loosely SCD2-ish (adds rows but no versioning).

### `merge`
`MERGE` — insert new, update existing — matched by `unique_key`. Conceptually SCD1 (overwrite).
- Configurable: `merge_update_columns` (only update these), `merge_exclude_columns` (update all except these).
- Default = overwrite *all* columns of matched rows.

```sql
{{ config(
    materialized = 'incremental',
    unique_key = 'id',
    merge_update_columns = ['email', 'ip_address']
) }}
```
or:
```sql
{{ config(
    merge_exclude_columns = ['created_at']
) }}
```
- In `incremental_predicates`, alias columns with `DBT_INTERNAL_DEST` (existing) and `DBT_INTERNAL_SOURCE` (new) when disambiguation is needed.

### `delete+insert`
`DELETE` matching `unique_key`, then `INSERT`. Useful when `merge` isn't supported or the key isn't truly unique.
- Less efficient on large tables than `merge`.
- Not SCD-anything — overwrites without history.
- ⚠️ For true SCD2, use **snapshots**, not this.

### `insert_overwrite`
Replace entire partitions identified by `partition_by`. Most efficient strategy on partition-aware adapters (BigQuery, Spark, Databricks, Snowflake) for time-partitioned data.
- Requires partitions (e.g., a date column).
- Works well with predictable backfill granularities.

### `microbatch`
Specialized strategy for large time-series. Splits each run into independent, idempotent batches over an `event_time` column. (Full coverage in its own doc.)

## `incremental_predicates`
Additional filter conditions dbt applies during MERGE / DELETE+INSERT. Reduces the rows the warehouse compares — big perf win on large tables.

## Custom strategies
Define a macro named `get_incremental_<strategy>_sql(arg_dict)` and reference it by `incremental_strategy='<strategy>'`. The built-ins have these names:

| Strategy | Macro |
|---|---|
| `append` | `get_incremental_append_sql` |
| `delete+insert` | `get_incremental_delete_insert_sql` |
| `merge` | `get_incremental_merge_sql` |
| `insert_overwrite` | `get_incremental_insert_overwrite_sql` |
| `microbatch` | `get_incremental_microbatch_sql` |

## Picking one (quick guide)
- **Append-only event log, can tolerate dupes, want speed**: `append`.
- **Need upsert + unique key**: `merge` (or `delete+insert` if merge unsupported/key not unique).
- **Time-partitioned table**: `insert_overwrite` (partition-aware adapters).
- **Large time-series with backfill / late data**: `microbatch`.
- **True SCD2 history**: not a strategy — use a **snapshot**.

## Key takeaways
- `incremental_strategy` controls the write mechanism for incremental models.
- Five built-ins: `append`, `merge`, `delete+insert`, `insert_overwrite`, `microbatch`.
- Adapter support varies; check the matrix.
- `merge_update_columns` / `merge_exclude_columns` give fine-grained MERGE control.
- For SCD2 → snapshots, not `delete+insert`.

## Related
- Incremental microbatch (its own doc).
- Snapshots — for SCD2.
- Adapter resource configs — per-platform specifics.
