# Data Test Configurations

**Source:** https://docs.getdbt.com/reference/data-test-configs
**Type:** Documentation · Checkpoint 3

## What it covers
The full set of configs you can apply to data tests, plus the precedence rules. Configs control severity, where the test runs, how failures are stored, and metadata (tags/meta/enabled).

## Three places to set configs
Most specific wins.

1. **YAML properties** (next to where the test is applied — `models/.../*.yml`)
2. **`config()` block** in the test's SQL definition
3. **`dbt_project.yml`** under `data_tests:`

### Precedence (specific instance of a generic test)
property YAML  >  generic test's SQL `config()`  >  `dbt_project.yml`

### Precedence (singular test)
SQL `config()` in the singular test  >  `dbt_project.yml`
(Singular tests **cannot** be configured from a properties YAML — only via their `config()` block or the project file.)

## The test-specific configs

| Config | Effect |
|---|---|
| `severity: error \| warn` | Whether failure stops the build (`error`) or logs only (`warn`) |
| `error_if: "<expr>"` | Threshold to escalate to error (e.g., `>10`) |
| `warn_if: "<expr>"` | Threshold to warn |
| `fail_calc: "<sql expression>"` | How dbt counts failures (default: `count(*)`) |
| `limit: <int>` | Cap on failing rows the test returns |
| `store_failures: true \| false` | Persist failing rows to a table |
| `store_failures_as: 'view' \| 'table' \| 'ephemeral'` | How to persist them |
| `where: "<sql>"` | Filter rows the test runs over (great for partition pruning) |
| `sql_header: "<string>"` (v1.12+) | Inject SQL before the test query (requires `require_sql_header_in_test_configs` flag) |

## The general configs

| Config | Effect |
|---|---|
| `enabled: true \| false` | Toggle the test |
| `tags: [...]` | Selection / grouping |
| `meta: {...}` | Free-form metadata |
| `database` / `schema` / `alias` | Where to write `store_failures` artifacts |

## Configuring in YAML (the common shape, v1.10.5+)
```yaml
models:
  - name: orders
    data_tests:
      - dbt_utils.equality:
          name: equality_fct_test_coverage
          description: ...
          arguments:
            compare_model: ref('compare_model')
          config:
            severity: warn
            warn_if: ">0"
            error_if: ">100"
            store_failures: true
            tags: ['nightly']
    columns:
      - name: order_id
        data_tests:
          - unique:
              config:
                severity: error
                where: "order_date >= dateadd('day', -30, current_date)"
          - not_null
```

## Configuring in `dbt_project.yml`
```yaml
data_tests:
  my_project:
    +severity: warn                  # default for the whole project
    marts:
      +severity: error               # marts get strict
      +store_failures: true
    staging:
      +tags: ['hygiene']
```

## Singular test config — only via SQL
```sql
-- tests/assert_revenue_positive.sql
{{ config(
    severity = 'error',
    warn_if = '>0',
    error_if = '>100',
    where = "transaction_date >= dateadd('day', -7, current_date)",
    store_failures = true
) }}

select transaction_id, revenue
from {{ ref('fct_transactions') }}
where revenue < 0
```

## `store_failures` mechanics
- When enabled, dbt creates a table for failures (in `dbt_test__audit` schema by default).
- Failures **replace** prior failures for the same test.
- Schema/database/alias for the storage tables are configurable.

## `where` — the cheap-test trick
For huge models, `where` lets you partition-prune in the test:
```yaml
- unique:
    config:
      where: "order_date >= dateadd('day', -30, current_date)"
```
Test runs only on the last 30 days instead of the whole table. Huge cost win.

## `severity` / `warn_if` / `error_if`

```yaml
# Default behavior: warn if any failing rows
- not_null:
    config:
      severity: warn

# Custom thresholds
- some_test:
    config:
      severity: error    # base
      warn_if:  ">0"     # warn if >0 failures
      error_if: ">10"    # error if >10 failures
```

## Tag examples
```yaml
- unique:
    config:
      tags: ['my_tag']         # selectable via --select tag:my_tag
```

## Key takeaways
- Configure tests in three places; instance YAML > SQL `config()` > `dbt_project.yml`.
- Severity is the most-used config: `error`/`warn` with optional thresholds.
- `where` is the cost optimizer — limits test scope to relevant rows.
- `store_failures` persists failing rows for inspection (in `dbt_test__audit` by default).
- Singular tests configure via SQL `config()` only (no property YAML).
- v1.12+ `sql_header` is gated by the `require_sql_header_in_test_configs` flag.

## Related
- Data tests, custom generic tests.
- `severity`, `store_failures`, `where`, `fail_calc`, `limit` resource configs.
- `--store-failures` CLI flag.
- *Test smarter not harder* — when to use which severity.
