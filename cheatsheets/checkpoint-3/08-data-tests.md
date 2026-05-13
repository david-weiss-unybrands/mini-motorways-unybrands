# Data Tests

**Source:** https://docs.getdbt.com/docs/build/data-tests
**Type:** Documentation · Checkpoint 3

## What they are
Data tests are SQL assertions about your data. They run as `select` queries; **failing rows returned = test fails**, zero rows = pass. Apply them to models, sources, seeds, and snapshots.

> Note: "data tests" is the new name for what dbt used to call "tests". The YAML key `tests:` is still accepted as an alias for `data_tests:`. The rename disambiguates from **unit tests**.

## Two kinds

### Generic (most common)
A parameterized `test` block. Reusable across many models/columns. dbt ships four:
- `unique`
- `not_null`
- `accepted_values`
- `relationships`

```yaml
models:
  - name: orders
    columns:
      - name: order_id
        data_tests:
          - unique
          - not_null
      - name: status
        data_tests:
          - accepted_values:
              arguments:                   # v1.10.5+; older versions put values at top level
                values: ['placed', 'shipped', 'completed', 'returned']
      - name: customer_id
        data_tests:
          - relationships:
              arguments:
                to: ref('customers')
                field: id
```

### Singular (one-off)
A `.sql` file in `tests/` that returns failing rows.

```sql
-- tests/assert_total_payment_amount_is_positive.sql
select
    order_id,
    sum(amount) as total_amount
from {{ ref('fct_payments') }}
group by 1
having total_amount < 0
```
- Test name = file name.
- ❌ Do **not** end with `;` — causes failure.
- ❌ Do **not** reference singular tests in `model_name.yml` — they're auto-discovered.
- ✅ You can add a description in a `tests/schema.yml`:
  ```yaml
  data_tests:
    - name: assert_total_payment_amount_is_positive
      description: "Refunds have a negative amount, so..."
  ```

## How they execute
For each test, dbt compiles a `select` query that returns failing records. If the query returns 0 rows, the test passes.

`unique` test compiles to:
```sql
select * from (
    select order_id from analytics.orders where order_id is not null
    group by order_id having count(*) > 1
) validation_errors
```

`not_null` test compiles to:
```sql
select * from analytics.orders where order_id is null
```

## Where to put tests (CP3 reminder)
- **`tests/`** — singular and generic test SQL.
- **`tests/generic/`** — custom generic test definitions.
- **`models/`** — unit test YAML lives here (NOT in `tests/`).
- Model-level data tests defined in `_<dir>__models.yml` next to the model.

## Configs that matter

| Config | Purpose |
|---|---|
| `severity: warn` / `error` | Warn vs fail the build |
| `warn_if` / `error_if` (`>0`, `>=N`) | Thresholds for severity flips |
| `tags`, `meta` | Selection and metadata |
| `store_failures` | Persist failing rows to a table for inspection |
| `store_failures_as` | Override the storage strategy |
| `where` | Filter rows the test runs over (e.g., partition pruning) |
| `limit` | Cap rows returned (rare) |

## Running only data tests
```bash
dbt test --select "test_type:data"
# v1.9+ Core also supports:
dbt test --resource-type test
```

## Storing failures for inspection
```bash
dbt test --store-failures
```
- Saves failing rows to a table in a `dbt_test__audit` schema (or whatever you configure).
- Subsequent runs **replace** prior failures for the same test.
- Big productivity win during debugging — quickly query the failing rows.

## Source tests
Same syntax, attached to source columns instead of model columns. See *Sources* doc and *Testing and documenting sources* (anchor in the sources page).

## Severity patterns
- **error** — pipeline-failing concerns (customer-facing, financial, executive). From *Test smarter*: these are your top-priority data quality concerns.
- **warn** — nice-to-knows you'll act on within ~6 months.

## More generic tests
Bring in packages:
- [`dbt_utils`](https://hub.getdbt.com/dbt-labs/dbt_utils/latest/) — `not_constant`, `expression_is_true`, `mutually_exclusive_ranges`, ...
- [`dbt-expectations`](https://hub.getdbt.com/calogica/dbt_expectations/latest/) — Great Expectations-style assertions.

## Key takeaways
- Data tests = SQL queries that should return zero failing rows.
- Two shapes: **generic** (reusable, parameterized) and **singular** (one-off SQL in `tests/`).
- Built-in generics: `unique`, `not_null`, `accepted_values`, `relationships`.
- `--store-failures` persists failing rows for inspection.
- The YAML key is now `data_tests:` (older `tests:` still works).
- `test_type:data` selector runs data tests but excludes unit tests.

## Related
- Custom generic data tests; unit tests.
- Data test configurations (the full config reference).
- `dbt test` command, `test_type` selection.
- *Test smarter not harder* / *Where should tests go?*
