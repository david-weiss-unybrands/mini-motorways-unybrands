# How We Structure — Staging Layer

**Source:** https://docs.getdbt.com/best-practices/how-we-structure/2-staging
**Type:** Reading · Checkpoint 1

## What it is
The staging layer is the entry point: one model per source table, cleaning data into reusable atomic building blocks.

## Folders
- Subdivide `models/staging/` **by source system** (`jaffle_shop/`, `stripe/`, `snowplow/`).
- ❌ Don't subdivide by *loader* (Fivetran, Stitch) — too broad.
- ❌ Don't subdivide by *business domain* — too early; you'll create competing definitions.

## File-naming convention
- `stg_[source]__[entity]s.sql` — note the **double underscore** between source and entity. Disambiguates multi-word source names: `google_analytics__campaigns` reads clearly; `google_analytics_campaigns` is ambiguous.
- Plural entity names (`orders`, not `order`).
- One YAML config file per directory: `_jaffle_shop__models.yml`, `_jaffle_shop__sources.yml`. Leading underscore sorts them to the top.

## What goes in a staging model

A standard staging model uses two CTEs: `source` (the only place that calls `{{ source(...) }}`) and `renamed` (transformations).

```sql
-- stg_stripe__payments.sql
with
source as (
    select * from {{ source('stripe','payment') }}
),
renamed as (
    select
        -- ids
        id as payment_id,
        orderid as order_id,
        -- strings
        paymentmethod as payment_method,
        status,
        -- numerics
        amount as amount_cents,
        amount / 100.0 as amount,
        -- booleans
        case when status = 'successful' then true else false end as is_completed_payment,
        -- dates
        date_trunc('day', created) as created_date,
        -- timestamps
        created::timestamp_ltz as created_at
    from source
)
select * from renamed
```

### Allowed transformations
✅ Renaming, type casting, basic computations (cents → dollars), categorizing (CASE expressions to bucket values).

### Forbidden transformations
- ❌ **Joins** — except in `base` models (see below).
- ❌ **Aggregations** — grouping changes grain; you'll lose access to source detail downstream.

## Materialization
- Default to **views** for the whole `staging/` directory via `dbt_project.yml`:
  ```yaml
  models:
    jaffle_shop:
      staging:
        +materialized: view
  ```
- Views are cheap, always fresh, and not meant to be queried directly.

## The 1-to-1 rule
- Staging models have a **1:1 relationship with source tables**.
- `source()` is used *only* in staging models. Downstream models use `ref()`.

## Base models (the exception that proves the rule)

Use a `base/` subfolder when a join is genuinely needed *before* staging is meaningful:
1. **Joining a separate deletes table** — flag deleted records so all downstream models can filter them consistently.
2. **Unioning symmetrical sources** — e.g., per-region Shopify instances loaded as separate tables; union them in `base_` models, then write one `stg_` model on top.

Base models follow staging conventions but only do the non-joining transforms; the `stg_` model handles the joins/unions.

## DRY principle
Push any "always want" transformation as far upstream as possible. If every downstream model needs `amount` as a float in dollars, do the cast in staging, not in 12 marts.

## Productivity tip
Use the [`dbt-codegen`](https://github.com/dbt-labs/dbt-codegen) package to auto-generate source YAML and staging model boilerplate. Write a few by hand to learn the style, then automate.

## Key takeaways
- One model per source table, named `stg_[source]__[entity]s`.
- Group by source system in folders.
- Allowed: rename, cast, basic compute, categorize. Forbidden: joins (use `base/`), aggregations.
- Materialize as view.
- `source()` lives here and *only* here.

## Related
- *Add sources to your DAG* — the `source()` macro itself.
- *Source configurations* — config keys you can apply to sources.
