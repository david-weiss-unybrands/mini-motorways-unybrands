# `dbt run`

**Source:** https://docs.getdbt.com/reference/commands/run
**Type:** Documentation · Checkpoint 1

## What it does
Compiles and executes **models only** against the target database. Does NOT run tests, snapshots, or seeds.

If you want everything in one go, use `dbt build`.

## How it works
1. Compiles each model's SQL.
2. Resolves dependencies into a DAG.
3. Materializes models in dependency order, multi-threaded.
4. For replace-style materializations (table), dbt builds with a temporary name, then drops and renames in a single transaction (on adapters that support transactions). This minimizes downtime.

## The `--full-refresh` flag
Forces incremental models to be rebuilt as full tables.

```bash
dbt run --full-refresh
dbt run -f                       # short form
```

Use when:
- An incremental model's schema changed and needs to be recreated.
- The model's logic changed and you need to reprocess history.

Behavior inside compiled models:
- `flags.FULL_REFRESH` is `true`.
- `is_incremental()` returns `false` for **all** models — so the incremental branch is skipped.

```sql
select * from all_events
{% if is_incremental() %}
   where collector_tstamp > (select coalesce(max(max_tstamp), '0001-01-01') from {{ this }})
{% endif %}
```

## Selecting models
Use node selection syntax to limit what runs:
```bash
dbt run --select my_model            # one model
dbt run --select my_model+           # model + downstream
dbt run --select +my_model           # upstream + model
dbt run --select staging.stripe+     # folder + downstream
dbt run --exclude my_model
```

## The `--empty` flag
Schema-only dry run: refs/sources limited to zero rows. SQL still executes but won't scan input data. Validates compilation and dependency wiring.

## Related global configs
- **Treat warnings as errors** — see `warn_error` / `warn_error_options`.
- **Failing fast** — `--fail-fast` to abort on first error.
- **Colorized logs** — `print_color` global config.

## Status codes (dbt Cloud API)
When polling `list_runs`:
| Code | Meaning |
|---|---|
| 1 | Queued |
| 2 | Starting |
| 3 | Running |
| 10 | Success |
| 20 | Error |
| 30 | Canceled |
| 40 | Skipped |

## When to choose `run` over `build`
- You're iterating on model logic and don't want to wait for tests/seeds/snapshots.
- You have a workflow that handles tests as a separate concern.
- You only care about materializing models (e.g., a one-off backfill).

## Common patterns
```bash
dbt run                                           # all models
dbt run --select my_model+                        # this and downstream
dbt run --full-refresh --select my_incremental    # rebuild incremental
dbt run --select state:modified+ --defer --state path/to/prod    # slim
dbt run --empty                                   # compile-and-dry-run
dbt run --fail-fast                               # stop on first error
```

## Key takeaways
- Models only — for everything use `build`.
- `--full-refresh` makes `is_incremental()` return false everywhere.
- Replace-style materializations swap atomically via a temp name + rename.
- `--empty` is your "does this compile and wire up?" check.
- Selection syntax (`+`, folder-path, `state:modified+`) is the productivity multiplier.

## Related
- `dbt build` — superset.
- Node selection syntax / graph operators.
- Incremental models — the audience for `--full-refresh`.
