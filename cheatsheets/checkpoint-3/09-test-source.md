# Testing and Documenting Sources

**Source:** https://docs.getdbt.com/docs/build/sources#testing-and-documenting-sources
**Type:** Documentation (section anchor) · Checkpoint 3

> ℹ️ This is a section of the larger *Sources* doc, called out separately in the certification study guide. The full sources cheat sheet lives at `checkpoint-1/08-sources.md`. This sheet zooms in on the testing/documenting subset.

## Why this is a CP3 topic
"Tests live where the resource lives" — for sources, that means in the same YAML that declares the source. Source tests catch **fixable-at-source** issues (per *Test smarter*) and feed source freshness into your dependency graph.

## The shape
Sources accept the same `description`, `data_tests`, and `columns` keys as models. Define them in `_<dir>__sources.yml` in the relevant staging folder.

```yaml
# models/staging/jaffle_shop/_jaffle_shop__sources.yml
sources:
  - name: jaffle_shop
    description: "Replica of our app's Postgres DB"
    database: raw
    schema: jaffle_shop
    tables:
      - name: orders
        description: >
          One record per order. Includes cancelled and deleted orders.
        columns:
          - name: id
            description: Primary key of the orders table
            data_tests:
              - unique
              - not_null
          - name: status
            description: Note that the status can change over time
            data_tests:
              - accepted_values:
                  arguments:
                    values: ['placed','shipped','completed','returned']
```

## What you can test on a source
The same toolkit as models:
- Built-in generics: `unique`, `not_null`, `accepted_values`, `relationships`.
- Custom generic tests from your project or packages (`dbt_utils`, `dbt-expectations`).
- Singular tests in `tests/` referencing the source via `{{ source(...) }}`.

## What source tests are *for* (per *Test smarter — where*)
Source tests should catch issues **fixable at the source system**. "Fixable" means:
- You can fix it directly, OR
- You know who can and have the relationship to actually get it done.

Examples of good source tests:
- Duplicate records the source team can dedupe.
- `not_null` on a field someone forgot to populate.
- Primary-key uniqueness when duplicates are removable upstream.

What source tests should **not** carry:
- "Cleanup work" you're doing in staging (e.g., `not_null` on a column whose nulls you'll filter in `stg_`).
- Business-anomaly logic (that belongs at staging/intermediate/marts, not at the source level).

## Documenting sources
Descriptions on the source, tables, and columns render in dbt's docs site. Use them generously — sources are the seam between your warehouse and your dbt project, and downstream consumers often need to know "where does this come from and what does it mean."

You can pull doc blocks in via `{{ doc('...') }}` for re-use.

## How it relates to source freshness
Source-level config doesn't only carry tests — it also carries `freshness` and `loaded_at_field`. Together they let `dbt source freshness` check whether the upstream load pipeline is on schedule.

Severity choice per *Test smarter — where*:
- Source feeds **high-impact** outputs → freshness severity = **error**.
- Source feeds nice-to-know outputs → severity = **warn**.

## Selecting source tests
```bash
# Test only sources
dbt test --select "source:*"

# Test a specific source
dbt test --select "source:jaffle_shop"

# One source table
dbt test --select "source:jaffle_shop.orders"
```

## Worth knowing
- A `relationships` test from a model column to a source field is perfectly valid.
- Source tests count toward overall test selection — including `test_type:data` and `--store-failures`.
- You cannot define unit tests on sources (unit tests are for SQL models only).

## Key takeaways
- Source YAML supports `description`, `data_tests`, and `columns` — just like models.
- Tests on sources should target **fixable-at-source** data issues.
- Don't double-test cleanup you're handling in staging.
- Source freshness severity follows the high-impact rule (error vs warn).
- Select source tests via `source:` selectors.

## Related
- Full Sources cheat sheet (CP1 doc list).
- Data tests / custom generic data tests.
- Source freshness (`dbt source freshness`).
- *Test smarter — where should tests go?*
