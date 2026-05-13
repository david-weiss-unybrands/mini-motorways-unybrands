# The `--sample` Flag

**Source:** https://docs.getdbt.com/docs/build/sample-flag
**Type:** Documentation · Checkpoint 1

## What it is
A CLI flag that runs models against a **time-bounded slice** of real data — a step beyond `--empty` (which uses zero rows). Builds tables with a sampling of real records, so you can validate transformations without paying to scan full datasets.

## Where it's supported
- `dbt run`
- `dbt build`

❌ **Not supported on Python models** (silently ignored).

ℹ️ **Seeds** are created normally, but **referenced** seeds get sampled when downstream models read them.

## How it works
Sample mode generates **filtered** refs and sources, filtered by the model's `event_time` column. For this to work:
- Every `ref()` you want sampled must point to a model that declares `event_time`.
- Sources can also declare `event_time` for the same purpose.

## Two sample-spec formats

### Relative time spec
Filter from "now" backwards by a granularity:
- `hours`, `days`, `months`, `years`
```bash
dbt run --select path/to/stg_customers --sample="3 days"
dbt run --select path/to/stg_orders    --sample="6 hours"
```

### Static time spec
Filter between two explicit boundaries (date or timestamp):
```bash
dbt run --sample="{'start': '2024-07-01', 'end': '2024-07-08 18:00:00'}"
```
Use this when you want to replay a specific historical window — your busiest week, a known-bad day, etc.

## Opting a single ref out of sampling
Append `.render()` to a `ref()` to bypass sampling for that one reference:
```sql
with source as (
    select * from {{ ref('stg_customers').render() }}    -- unfiltered
)
```
Common for dimensional joins where you need the full lookup table even when fact tables are sampled.

## What sample mode is good at
- Faster dev/CI cycles than full builds.
- Validating logic against representative real data.
- Reducing warehouse spend during development.

## What it can't fix
- Joins where the sample window misses matching rows on one side — you can end up with incomplete or empty joins.
- Calculations that need full historical context (window functions over all time, lifetime values, etc.).
- Non-time-based data filtering — currently only **time-based sampling** is supported.

## Examples
```bash
# Last 3 days of data
dbt run --select stg_customers --sample="3 days"

# Specific historical window for the whole project
dbt run --sample="{'start': '2024-07-01', 'end': '2024-07-08'}"

# Build (includes tests) with a 6-hour sample
dbt build --sample="6 hours"
```

## `--sample` vs `--empty` vs full run

| Flag | Input data | Use case |
|---|---|---|
| `--empty` | 0 rows | Schema/compile validation; CI |
| `--sample` | Time-bounded slice | Realistic dev iteration with cheap reads |
| (none) | All rows | Production builds |

## Requirements checklist
- Models being sampled must have `event_time` configured.
- Any upstream ref you want filtered must also declare `event_time`.
- Use `.render()` to bypass on individual refs.

## Key takeaways
- `--sample` builds models with a **time-bounded subset** of real data.
- Supported on `run` and `build`; not on Python models.
- Requires `event_time` on sampled models and their parents.
- Relative (`"3 days"`) or static (`{'start':..., 'end':...}`) specs.
- `.render()` bypasses sampling for one ref.

## Related
- `--empty` flag — zero-row companion for cheaper compile validation.
- `event_time` resource config.
- Microbatch incremental strategy (same `event_time` plumbing).
