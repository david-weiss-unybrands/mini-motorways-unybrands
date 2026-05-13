# Sources — Add Sources to Your DAG

**Source:** https://docs.getdbt.com/docs/build/sources
**Type:** Documentation · Checkpoint 1

## What it is
Sources name and describe the raw tables loaded by EL tools into your warehouse, so dbt can reference them via `{{ source() }}`, test them, and track their freshness.

## What sources give you
- A single configurable mapping from logical source/table → physical database/schema/table.
- Lineage: `{{ source() }}` puts the source in the DAG.
- Source-level tests and documentation.
- **Source freshness** monitoring (SLA tracking).

## Declaring a source (YAML)
```yaml
# models/staging/jaffle_shop/_jaffle_shop__sources.yml
sources:
  - name: jaffle_shop
    database: raw          # optional; defaults to target database
    schema: jaffle_shop    # optional; defaults to source `name`
    tables:
      - name: orders
      - name: customers
  - name: stripe
    tables:
      - name: payments
```

## Selecting from a source
```sql
select ...
from {{ source('jaffle_shop', 'orders') }}
left join {{ source('jaffle_shop', 'customers') }} using (customer_id)
```
Compiles to `raw.jaffle_shop.orders`. Creates a DAG dependency between the model and the source.

> **Rule of thumb:** `{{ source() }}` should appear *only* in staging models. Everywhere else, use `{{ ref() }}`.

## Testing & documenting sources
Sources accept the same `description`, `data_tests`, and `columns` keys as models:
```yaml
sources:
  - name: jaffle_shop
    description: "Replica of our app's Postgres DB"
    tables:
      - name: orders
        columns:
          - name: id
            description: Primary key
            data_tests:
              - unique
              - not_null
```

## Source freshness

### Configure
```yaml
sources:
  - name: jaffle_shop
    config:
      freshness:               # default for all tables in this source
        warn_after: {count: 12, period: hour}
        error_after: {count: 24, period: hour}
      loaded_at_field: _etl_loaded_at
    tables:
      - name: orders
        config:
          freshness:           # stricter override
            warn_after: {count: 6, period: hour}
            error_after: {count: 12, period: hour}
      - name: product_skus
        config:
          freshness: null      # opt out
```
- `loaded_at_field` is **required** unless dbt can use warehouse metadata.
- At least one of `warn_after` / `error_after` must be set, else freshness isn't computed.
- Source-level config cascades to all tables.
- (v1.9+) `freshness` and `loaded_at_field` moved under `config:` block.

### Run it
```bash
dbt source freshness
```
Under the hood dbt runs:
```sql
select max(_etl_loaded_at) as max_loaded_at,
       convert_timezone('UTC', current_timestamp()) as calculated_at
from raw.jaffle_shop.orders
```

### Filter (avoid full scans)
For very large tables:
```yaml
config:
  freshness:
    filter: "_etl_loaded_at >= date_sub(current_date(), interval 1 day)"
```

### State-aware orchestration (Fusion)
The Fusion engine tracks freshness automatically via warehouse metadata — you only need explicit freshness config for SLA alerts, custom freshness logic, or source views.

## Build-on-freshness pattern
```bash
dbt source freshness
dbt build --select source_status:fresher+ --state path/to/prod
```
Only rebuild models downstream of sources whose data has actually changed. Pairs well with a 30-min freshness snapshot cadence and an hourly rebuild job.

## Key takeaways
- Sources = named raw tables; declared in YAML; selected via `{{ source('src', 'tbl') }}`.
- Use sources only in staging models; one staging model per source table.
- Test and document them like you do models.
- Freshness needs `loaded_at_field` and at least one threshold; configs cascade source → tables.
- `source_status:fresher+` enables freshness-driven incremental builds.

## Related
- Source configurations (the configs themselves).
- `dbt source freshness` command.
- `loaded_at_field`, `event_time` resource properties.
