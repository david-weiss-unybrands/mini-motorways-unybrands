# `dbt test` (CP3 angle)

**Source:** https://docs.getdbt.com/reference/commands/test
**Type:** Documentation · Checkpoint 3 (also covered in CP1)

> ℹ️ Full command reference cheat sheet lives at `checkpoint-1/15-cmd-test.md`. This sheet emphasizes what CP3 cares about: type filtering, indirect selection, and where `dbt test` fits in the resilience story.

## Recap of what `dbt test` does
Runs **data tests** (generic + singular) AND **unit tests** declared on SQL models. Doesn't build models — expects them to already exist (or use `dbt build` which orchestrates both).

## CP3 essentials

### Filter by test type
```bash
dbt test                                           # everything
dbt test --select test_type:data                   # only data tests
dbt test --select test_type:unit                   # only unit tests
dbt test --select test_type:generic                # only generic data tests
dbt test --select test_type:singular               # only singular data tests
```

`test_type` selection works on both Core and Fusion. v1.9+ Core also supports `dbt test --resource-type test` (filters to *all* test types) and `--resource-type unit_test`.

### Indirect selection
`dbt test --select my_model` pulls in:
- Tests defined directly on the model's columns/properties.
- Generic tests referencing the model (e.g., a `relationships` test pointing at it).
- Tests are excluded if their other parents aren't selected.

This is the same indirect-selection rule used by `dbt build` — selecting the model gives you its tests for free.

### Combine selectors
```bash
# Unit tests on one model
dbt test --select "dim_customers,test_type:unit"

# Failed tests from last run
dbt test --select result:fail --state path/to/prod

# Slim CI: only test modified things
dbt test --select state:modified --defer --state path/to/prod
```

## Result-based selection (CP3 favorite)
Pair `result:` selectors with `--state` to rerun failures cheaply.

```bash
dbt test --select result:fail --state path/to/prod
dbt test --select result:fail --exclude my_known_flaky_test --state path/to/prod
```

⚠️ **Gotcha**: `dbt test` writes a new `run_results.json` over the previous one. So `result:fail` + `result:error` won't both work in a sequence of separate `dbt run` + `dbt test` invocations — `dbt test` clobbers the earlier results. To compose them, use `dbt build` instead (it writes one combined results file).

## Where this fits in resilience
CP3's testing story is:
1. Write the right tests (Test smarter not harder).
2. Put them in the right places (Where should tests go?).
3. Run them with discipline:
   - In dev: `dbt test --select my_changes+`
   - In CI: `dbt build --select state:modified+ --defer --state path/to/prod`
   - On failure: `dbt test --select result:fail --state path/to/prod`

The command is the same; the *selection* is what makes the workflow resilient and cost-aware.

## Storing failures for inspection
```bash
dbt test --store-failures
```
Failures get persisted to a `dbt_test__audit` schema table (or wherever you configure). Subsequent runs replace prior failures for the same test. See *Data test configurations* for `store_failures` / `store_failures_as` configs.

## When `dbt build` is the better choice
- Production runs — `dbt build` runs unit tests before materializing models and data tests after, in DAG order, with failing tests skipping downstream.
- Combining run + test result selection (`result:error+ result:fail+`) — only works inside one `dbt build` invocation.

`dbt test` standalone fits when:
- You're iterating on tests themselves (not models).
- Tests-only CI jobs.
- Replaying a failed test set from a prior run.

## Examples (CP3 patterns)
```bash
# Source-freshness-driven test
dbt source freshness
dbt test --select source_status:fresher+ --state path/to/prod

# Test only what an exposure depends on
dbt test --select +exposure:weekly_kpis

# Slim CI test only
dbt test --select state:modified --defer --state path/to/prod
```

## Key takeaways
- `dbt test` runs both data tests and unit tests; filter via `test_type:`.
- Indirect selection: pick the model, get the tests.
- `result:fail` / `result:error` rerun failed tests cheaply (with `--state`).
- `dbt test` overwrites `run_results.json` — for combined run+test result selection use `dbt build`.
- For production, prefer `dbt build` so test failures skip downstream models.

## Related
- Full `dbt test` reference in CP1 cheat sheet.
- Data tests, unit tests, custom generic tests, data test configs.
- Slim CI / `--defer` / `state:` / `result:` selectors.
- `dbt build` for integrated DAG execution.
