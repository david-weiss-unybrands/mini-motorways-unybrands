# `dbt test`

**Source:** https://docs.getdbt.com/reference/commands/test
**Type:** Documentation · Checkpoint 1 (also referenced in Checkpoint 3)

## What it does
Runs **data tests** (on models, sources, snapshots, seeds) and **unit tests** (on SQL models). Expects resources already exist — i.e. you should `dbt run`/`dbt seed`/`dbt snapshot` (or `dbt build`) first.

## Quick reference
```bash
# all tests (data + unit)
dbt test

# only data tests
dbt test --select test_type:data

# only unit tests
dbt test --select test_type:unit

# tests for a specific model (indirect selection)
dbt test --select "one_specific_model"

# tests across a whole package
dbt test --select "some_package.*"

# only singular tests
dbt test --select "test_type:singular"

# only generic tests
dbt test --select "test_type:generic"

# combine selectors with commas (intersection)
dbt test --select "one_specific_model,test_type:data"
dbt test --select "one_specific_model,test_type:unit"
```

## Test type taxonomy
- **Data tests**
  - **Generic** — reusable, parameterizable, declared in YAML (`unique`, `not_null`, package tests, custom ones).
  - **Singular** — a single SQL file in `tests/` that returns failing rows.
- **Unit tests** — declared in YAML; test SQL transformation logic against synthetic input rows. Run separately from data tests (and run *before* materialization when invoked via `dbt build`).

## Indirect selection
`dbt test --select my_model` pulls in:
- Tests defined directly on `my_model`'s columns/properties.
- Generic tests that reference `my_model`.
- Excludes tests whose other parents aren't selected.

This is the same indirect-selection rule used by `dbt build`.

## How tests work under the hood
- A test compiles into a SQL query that returns failing rows.
- 0 rows → pass. >0 → fail (or warn, depending on `severity`).
- Thresholds: `warn_if`, `error_if`, `severity` give fine-grained control (see data test configs).

## Common patterns
```bash
# CI: only modified tests
dbt test --select state:modified --defer --state path/to/prod

# Rerun failed tests
dbt test --select result:fail

# Test smarter — exclude known-failing test
dbt test --select result:fail --exclude my_flaky_test --defer --state path/to/prod

# Test a source
dbt test --select source:jaffle_shop
```

## Test result statuses
- `pass` — 0 failing rows
- `fail` / `error` — >0 failing rows above the error threshold
- `warn` — >0 failing rows, but below error threshold or severity is warn
- `skipped` — depending on upstream failures (when run via build)

## When to use `test` vs `build`
- `dbt test` alone is for: developing new tests, running tests after changing test logic, CI test-only jobs.
- `dbt build` is preferred in production because it interleaves test execution with model builds and skips downstream on failure.

## Key takeaways
- `dbt test` runs both data tests (generic + singular) and unit tests by default.
- Use `test_type:unit` / `test_type:data` / `test_type:generic` / `test_type:singular` to filter.
- Indirect selection: pick the model, get its tests.
- Tests pass when the underlying query returns 0 rows.
- For production, prefer `dbt build` so failures skip downstream models.

## Related
- Data tests, unit tests, custom generic tests, data test configurations.
- `dbt build` — for the integrated build-and-test flow.
- `severity`, `warn_if`, `error_if` configs.
