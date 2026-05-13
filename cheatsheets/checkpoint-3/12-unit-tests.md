# Unit Tests

**Source:** https://docs.getdbt.com/docs/build/unit-tests
**Type:** Documentation · Checkpoint 3

## What they are
Tests that validate **transformation logic** against **synthetic** inputs **before** the model is materialized. dbt feeds you mocked input rows, runs the model's SQL, and asserts the output matches expectations. Failure stops `dbt build` before any warehouse cost is incurred.

Introduced in dbt v1.8. Distinct from **data tests** (which run against real, built data).

## When to add a unit test
- **Complex SQL logic** — regex, date math, window functions, CASE-WHENs with many branches, truncation.
- **Custom functions** — your model's logic looks function-like.
- **Edge cases not in real data yet** — protect against them.
- **Bug-replay** — encode past bugs as tests.
- **Before a refactor** — pin behavior so you notice unintended changes.
- **High-criticality models** — public, contracted, or directly upstream of an exposure.

### Don't bother
- Trivial `min`/`max`/`sum` calls — the warehouse already tests those.
- Models that are just renames/casts (covered by data tests).

## When NOT to run unit tests
**Don't run in production** — the inputs are static, you're spending compute for nothing. Run in dev and CI only.

Exclude in prod jobs:
```bash
# v1.10 and earlier
DBT_EXCLUDE_RESOURCE_TYPES=unit_test dbt build
# v1.11+
DBT_ENGINE_EXCLUDE_RESOURCE_TYPES=unit_test dbt build
# Or CLI flag:
dbt build --exclude-resource-type unit_test
```

Run only unit tests:
```bash
dbt test --select test_type:unit
```

## Where they live
- Unit tests **must** live under `model-paths` (i.e. `models/`), not in `tests/`.
- Define under `unit_tests:` in a properties YAML next to the model.
- Fixture files (CSV, SQL) live in a `fixtures/` subdir of any test path (e.g., `tests/fixtures/`).

## Basic example

Model `dim_customers.sql` calculates `is_valid_email_address`. Unit test it:

```yaml
unit_tests:
  - name: test_is_valid_email_address
    description: "Check is_valid_email_address captures known edge cases."
    model: dim_customers
    given:
      - input: ref('stg_customers')
        format: dict
        rows:
          - {email: cool@example.com,    email_top_level_domain: example.com}
          - {email: cool@unknown.com,    email_top_level_domain: unknown.com}
          - {email: badgmail.com,        email_top_level_domain: gmail.com}
          - {email: missingdot@gmailcom, email_top_level_domain: gmail.com}
      - input: ref('top_level_email_domains')
        format: dict
        rows:
          - {tld: example.com}
          - {tld: gmail.com}
    expect:
      format: dict
      rows:
        - {email: cool@example.com,    is_valid_email_address: true}
        - {email: cool@unknown.com,    is_valid_email_address: false}
        - {email: badgmail.com,        is_valid_email_address: false}
        - {email: missingdot@gmailcom, is_valid_email_address: false}
```

You only need to specify the columns your test actually cares about. dbt fills in the rest with NULL/default.

## Three fixture formats

| Format | When to use |
|---|---|
| `dict` (inline) | Short, readable, common case |
| `csv` (inline or file) | Wider fixtures, easier to scan; file form for reusability |
| `sql` (inline or file) | When you need warehouse-specific types (BigQuery STRUCT, JSON) |

CSV / SQL via file:
```yaml
- input: ref('top_level_email_domains')
  format: csv
  fixture: my_csv_fixture_file       # tests/fixtures/my_csv_fixture_file.csv
```

## Prerequisites for the parents
The *direct parents* of the model under test must **exist in the warehouse** before you can run the unit test. To save cost:

```bash
dbt run --select "stg_customers top_level_email_domains" --empty
```

Or just `dbt build` — it processes unit tests *before* materializing, then data tests after.

## How dbt processes them with `dbt build`
1. Run unit tests against the SQL model.
2. If they pass, materialize the model.
3. Run data tests on the materialized model.

If unit tests fail, the model is not built → no warehouse spend.

## Running unit tests
```bash
dbt test --select dim_customers                       # all tests on the model
dbt test --select "dim_customers,test_type:unit"      # unit tests on this model
dbt test --select test_is_valid_email_address         # one specific unit test
dbt test --select test_type:unit                      # all unit tests
```

## Diff output on failure
On failure dbt shows a row-level diff:
```
actual differs from expected:
@@ ,email           ,is_valid_email_address
→  ,cool@example.com,True→False
```
The arrow shows the column where actual ≠ expected.

## Unit testing incremental models
- You can **override macros, vars, or env vars** in the unit test config.
- This lets you test the incremental model in both **full-refresh** and **incremental** modes.
- **Expected output = the result of the materialization** (what gets merged/inserted), not the final table state.
- The incremental model must exist in the warehouse before running. Use `dbt run --select config.materialized:incremental --empty` to bootstrap empty tables cheaply.

## Adapter caveats
- **BigQuery**: must specify all fields of a STRUCT in fixtures — no partial STRUCTs.
- **Redshift**: known limitations; workaround required. Sources must be in the same database as the models.

## Key takeaways
- Unit tests validate transformation **logic** on **synthetic inputs**, before materialization.
- v1.8+ feature. Live in YAML under `unit_tests:`, in `models/`.
- Three fixture formats: `dict`, `csv`, `sql`. Specify only the columns you care about.
- Run in dev and CI; **exclude** in production with `--exclude-resource-type unit_test`.
- `dbt build` runs unit tests → materializes → data tests, all in order.
- For incrementals, expected output is the merge/insert result, not the final table.

## Related
- Data tests (the post-build counterpart).
- `dbt test`, `test_type:unit` selector.
- `--empty` flag (cheap parent bootstrap).
- Unit test properties reference.
