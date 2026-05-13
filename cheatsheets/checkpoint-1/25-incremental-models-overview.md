# About Incremental Models

**Source:** https://docs.getdbt.com/docs/build/incremental-models-overview
**Type:** Documentation · Checkpoint 1

## What it is
A materialization that updates a warehouse table by transforming and loading **only new or changed rows** since the last run. Instead of rebuilding the whole table every run, append or update only the delta.

## When to use
Reach for incremental only when you have a real problem with table builds:
- Source tables with millions/billions of rows.
- Slow/complex transformations (regex, UDFs, heavy joins) where a full rebuild costs significant time or money.

It's not a default. Quoting the docs verbatim: *"We recommend using them when your dbt runs are becoming too slow."* For everything else, prefer `view` then `table`.

## The standard escalation
1. **view** — cheap, always fresh.
2. **table** — fast queries, full rebuild each run.
3. **incremental** — fast queries, partial rebuild each run.

Only escalate when the prior tier's build time becomes intolerable.

## How it works under the hood
- **Adapters that support MERGE**: dbt emits a `MERGE` to upsert new and changed rows.
- **Adapters without MERGE**: dbt does `DELETE` of matching keys, then `INSERT`.
- **Transaction management**: where supported, dbt runs the operation in a transaction; on failure, the warehouse rolls back so the table stays in a consistent state.

## Configuration shape (minimum)
```sql
{{ config(
    materialized='incremental',
    unique_key='id'
) }}

select *
from {{ ref('events') }}

{% if is_incremental() %}
where event_time > (select max(event_time) from {{ this }})
{% endif %}
```

Two parts:
1. **Config** declares incremental + a `unique_key` (used by the strategy).
2. **A guarded WHERE clause** filters source to "only new rows" on incremental runs. On a first run / `--full-refresh`, the WHERE is skipped and the table is built from scratch.

## What "new" means
You decide. The `is_incremental()` guard runs only when the model already exists and `--full-refresh` isn't set. Inside the guard, compare against `{{ this }}` (the existing table) to pull only rows newer than the last run.

## Trade-offs
**Pros**
- Big drop in build time and warehouse cost on large tables.
- Pairs well with append-mostly event data.

**Cons**
- Extra configuration burden.
- Wrong `unique_key` → duplicate rows.
- Late-arriving data may be missed if your filter is too tight (see `lookback` / microbatch).
- Schema changes require `--full-refresh`.
- Debugging is harder; the model only ever shows you a slice each run.

## Related strategies (separate docs)
- **`merge`** / **`append`** / **`delete+insert`** / **`insert_overwrite`** — the strategy options selecting how dbt actually writes the new rows. See *Incremental strategy*.
- **`microbatch`** — newer strategy for large time-series datasets; processes data in independent, idempotent time batches.

## Limitations & caveats
- Late-arriving data is the classic incremental pitfall. Either widen your `WHERE` (incurring re-scans), or use microbatch with `lookback`.
- "Limits of incrementality" (a Tristan Handy classic) — schema drift, unique-key drift, and incomplete data can silently corrupt incremental output. Test the model's primary key for uniqueness.
- `--full-refresh` rebuilds from scratch — keep it in your runbook.

## Key takeaways
- Incremental = partial rebuild based on a `unique_key` and a `is_incremental()`-guarded filter.
- Don't reach for it until you've felt the pain of full-refresh tables.
- The actual SQL behavior depends on `incremental_strategy` and your adapter's support.
- Microbatch is the modern answer for time-series; pre-existing strategies are still fine elsewhere.
- Use `dbt run --full-refresh` when schema or logic changes.

## Related
- Incremental strategy (which one to pick, per adapter).
- Incremental microbatch (the time-series specialization).
- Materializations best practices (the view→table→incremental ladder).
