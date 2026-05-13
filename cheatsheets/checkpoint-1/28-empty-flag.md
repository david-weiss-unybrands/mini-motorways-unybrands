# The `--empty` Flag

**Source:** https://docs.getdbt.com/docs/build/empty-flag
**Type:** Documentation · Checkpoint 1

## What it is
A CLI flag that runs your models against the warehouse but **limits refs and sources to zero rows** — so SQL still compiles and executes, but no input data is scanned. Validates semantic correctness and dependency wiring cheaply.

## Where it's supported
- `dbt run`
- `dbt build`
- `dbt snapshot`
- `dbt compile`
- `dbt seed` (from dbt Core v1.12+)

❌ **Not supported on Python models.** The flag is silently ignored.

## What it does (mechanically)
- Wraps each `ref` and `source` in a CTE that limits to 0 rows.
- The model's SQL still hits the warehouse.
- Schema gets created; tables/views are built with the right column names and types but **no data**.

## Why use it
- **CI / PR validation**: prove that your models will compile and build against the real warehouse without paying to scan/load source data.
- **Dev iteration**: faster than a full run when you just want to check that the model wires up correctly.
- **Schema dry runs**: ensure the table structure exists in dev/CI for downstream unit tests.

## Examples
```bash
# Build the entire project's schemas with empty tables
dbt run --empty

# Empty-build just one model
dbt run --select path/to/your_model --empty

# Compile only (no warehouse execution at all)
dbt compile --empty

# Schema-only seeds (v1.12+) — create the seed table but load no rows
dbt seed --empty

# Combined with dbt build (also includes tests, etc.)
dbt build --empty
```

## How it pairs with other things
- `dbt seed --empty` (v1.12+) lets downstream models that depend on seeds compile/run with the seed table existing-but-empty.
- Useful in CI: run `dbt build --empty` to ensure new SQL compiles end-to-end without spending warehouse credits.
- Different from `--sample`, which gives you a *small slice* of real data instead of zero rows.

## What it doesn't do
- It does not skip the warehouse round-trip — SQL is still sent and executed (just against empty inputs).
- It doesn't validate **runtime** correctness on real data; that requires a regular run or sample-mode run.
- It doesn't skip tests by itself — pair with selection if you want to limit scope.

## Key takeaways
- `--empty` = "build the schema, skip the data."
- Supported on `run`, `build`, `snapshot`, `compile`, and (v1.12+) `seed`.
- Not supported for Python models.
- Cheap CI validation — proves models compile + build without scanning input data.
- Pair with `dbt seed --empty` so downstream-of-seed models can be validated too.

## Related
- `--sample` flag — for time-bounded data sampling.
- `dbt compile` — purely compile, no warehouse hits.
- Slim CI patterns / `state:modified+ --defer`.
