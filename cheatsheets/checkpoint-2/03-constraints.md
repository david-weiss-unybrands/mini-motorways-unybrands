# Constraints

**Source:** https://docs.getdbt.com/reference/resource-properties/constraints
**Type:** Documentation · Checkpoint 2

## What they are
Platform-enforced data integrity rules attached to a model's columns or the model itself. When supported and enforced by the warehouse, they reject invalid data at insert/load time — failing the build cleanly rather than silently writing bad rows.

## Prerequisites
- Materialization is `table` or `incremental` — **never** `view` or `ephemeral`.
- The model has an enforced **contract** (`contract: {enforced: true}`).
- Every column has `data_type` declared (consequence of the contract requirement).

## Constraint types
`not_null`, `unique`, `primary_key`, `foreign_key`, `check`, `custom`.

## Structure
```yaml
constraints:
  - type: <type>             # required
    expression: "..."         # required for check; optional otherwise
    name: "..."               # optional, platform-dependent
    columns: [c1, c2]         # model-level only — list of cols the constraint covers
    # v1.9+ foreign-key inputs
    to: ref('other_model')   # or source('src','tbl')
    to_columns: [other_col]
    # warning controls
    warn_unenforced: false   # supported but not enforced (e.g. PK on Snowflake)
    warn_unsupported: false  # not supported by platform (e.g. check on Redshift)
```

## Column-level vs model-level
- ✅ **Column-level**: prefer this for single-column constraints.
- ✅ **Model-level**: required for *multi-column* constraints (e.g., composite primary keys, multi-column FKs, cross-column `check`).
- **Multiple `primary_key`** constraints must be defined at the model level. Column-level multi-PK is **not** supported.

```yaml
models:
  - name: dim_customers
    config:
      materialized: table
      contract: {enforced: true}
    constraints:
      - type: primary_key
        columns: [customer_id, region]
      - type: foreign_key
        columns: [customer_id]
        to: ref('stg_customers')
        to_columns: [customer_id]
      - type: check
        columns: [start_date, end_date]
        expression: "start_date <= end_date"
        name: dim_customers_valid_window
    columns:
      - name: customer_id
        data_type: int
        constraints:
          - type: not_null
      - name: status
        data_type: varchar
        constraints:
          - type: check
            expression: "status in ('active', 'inactive')"
```

## Foreign keys (v1.9+)
The `to` + `to_columns` form uses `ref()`/`source()` — that means:
- dbt captures the dependency in the DAG.
- The reference works across dev/CI/prod (no hardcoded schemas).

Pre-1.9 / unsupported adapters: fall back to a free-text `expression`.

## Platform support overview
| Platform | `not_null` | `unique`/`PK` | `FK` | `check` |
|---|---|---|---|---|
| Postgres | enforced | enforced | enforced | enforced |
| Redshift | enforced | informational | informational | not supported |
| Snowflake | enforced | informational | informational | informational |
| BigQuery | enforced | informational | informational | not supported |
| Databricks/Spark | enforced | informational | informational | varies |

(See Model contracts doc for the full platform matrix.)

## What "unenforced" means
The constraint is included in DDL metadata so external tools (catalogs, ER diagram tools) see it — but the warehouse will happily insert violating rows. For these, pair with a `unique`/`not_null` **data test** to actually catch bad data.

## Constraints vs data tests
- **Constraints** validate at insert time. Cheap (no extra query) but limited (most platforms enforce only `not_null`).
- **Data tests** validate after build. Flexible, configurable severity, can run anywhere — and you can `store_failures` for inspection.

Use constraints where they're **enforced** and you need build-time stops. Use data tests where you need flexibility or the platform doesn't enforce.

## Postgres example DDL produced
```sql
create table "db"."schema"."constraints_example__dbt_tmp" (
    id integer not null primary key check (id > 0),
    customer_name text,
    first_transaction_date date
);
```

## Common patterns
```yaml
# Composite PK
constraints:
  - type: primary_key
    columns: [order_id, line_item_id]

# FK to another model
- type: foreign_key
  columns: [customer_id]
  to: ref('dim_customers')
  to_columns: [customer_id]

# Cross-column check
- type: check
  expression: "shipped_at >= ordered_at"
  columns: [shipped_at, ordered_at]

# Silence warnings on unenforced
- type: primary_key
  columns: [id]
  warn_unenforced: false
```

## Key takeaways
- Constraints require an enforced contract on a `table` or `incremental` model.
- Six types: `not_null`, `unique`, `primary_key`, `foreign_key`, `check`, `custom`.
- Column-level for single columns; model-level for multi-column or multiple PKs.
- Most analytical warehouses only enforce `not_null` — others are informational.
- Use `warn_unenforced`/`warn_unsupported` to silence noise.
- Pair informational constraints with data tests to actually catch violations.

## Related
- Model contracts (precondition).
- Data tests, custom generic tests, `store_failures`.
- Adapter resource configs for per-platform details.
