# `dbt build`

**Source:** https://docs.getdbt.com/reference/commands/build
**Type:** Documentation · Checkpoint 1

## What it does
Runs **models, tests, snapshots, seeds** (and, in 1.11+/Fusion, **functions**) in DAG order — all in one command. The canonical production deploy command.

## When to use
Almost always, in production. `build` replaces the older pattern of `seed && run && snapshot && test` and adds the critical safety property: a failing test on a model **skips downstream models**.

## Output artifacts
Writes one `manifest.json` and one combined `run_results.json` covering everything that was selected.

## Skipping behavior
- A failing **test** on a model **skips** that model's downstream resources.
- Want a test to warn instead of block? Set [`severity: warn`](/reference/resource-configs/severity).
- Test with multiple parents (e.g. a `relationships` test): blocks/skips children of the most-downstream parent only.
- (v1.12+) A failing **model** also skips its downstream models — but you can override with `on_error: continue` on a model to let descendants run anyway.

## Selection
- Standard syntax: `--select`, `--exclude`, `--selector` (the last dropped in 1.12+).
- `--resource-type` final filter: `dbt build --select "resource_type:function"`.
- **Tests use indirect selection**: `dbt build -s model_a` runs `model_a` *and* its tests (so long as those tests don't depend on unselected parents).
- Filter by test type: `--select test_type:unit` or `--select test_type:data`.

## The `--empty` flag
Schema-only dry run: refs/sources are limited to zero rows. dbt still executes the SQL against the warehouse but avoids expensive reads. Validates that models *would* build without paying for the data. Pairs with seeds (`dbt seed --empty`) for CI.

## Unit tests + data tests in one run
When unit tests are defined, `dbt build` processes:
1. Unit tests on the SQL model.
2. Materializes the model (only if unit tests pass).
3. Data tests on the materialized model.

Net effect: warehouse spend is skipped when unit tests catch bugs first.

## Shared flags
`build` inherits all flags from `run`, `test`, `snapshot`, `seed`. Shared flags like `--full-refresh` apply across resource types — both models and seeds get full-refreshed.

## Functions (v1.11+ / Fusion)
```bash
dbt build --select "resource_type:function"
```
Builds user-defined functions (UDFs) as part of the DAG.

## Example output
```
1 of 7 OK loaded seed file dbt_jcohen.my_seed          [INSERT 2 in 0.09s]
2 of 7 OK created view model dbt_jcohen.my_model       [CREATE VIEW in 0.12s]
3 of 7 PASS not_null_my_seed_id                        [PASS in 0.05s]
...
Done. PASS=7 WARN=0 ERROR=0 SKIP=0 TOTAL=7
```

## Common commands
```bash
dbt build                                          # everything
dbt build --select staging.stripe+                 # downstream of a folder
dbt build --select state:modified+ --defer --state path/to/prod
dbt build --select source_status:fresher+ --state path/to/prod
dbt build --select test_type:unit                  # unit tests only
dbt build --empty                                  # schema dry run
```

## Key takeaways
- `build` = run + test + snapshot + seed + (functions) in DAG order.
- Failing tests on parents skip downstream children — this is what makes `build` safer than separate commands.
- Tests are indirectly selected when you select the model.
- `--empty` is the cheap CI validation flag.
- v1.12+ adds model-level `on_error: continue` to opt out of downstream skipping.

## Related
- `dbt run`, `dbt test`, `dbt seed`, `dbt snapshot` — the individual operations.
- Slim CI pattern: `state:modified+ --defer --state path`.
- `severity` config — control whether tests warn or error.
