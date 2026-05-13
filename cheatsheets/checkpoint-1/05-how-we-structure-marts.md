# How We Structure — Marts Layer

**Source:** https://docs.getdbt.com/best-practices/how-we-structure/4-marts
**Type:** Reading · Checkpoint 1

## What it is
The marts layer is the *entity* or *concept* layer — wide, denormalized tables that represent the business entities end users actually query (`orders`, `customers`, `payments`).

## Folders
- ✅ Group by **department or area of concern** (`finance/`, `marketing/`).
- Skip subfolders until you have ~10+ marts; don't over-optimize early.

## File names
- ✅ Plain English by **entity** (`orders.sql`, `customers.sql`).
- ❌ Don't include time grain in filenames (`orders_per_day` is wrong — rollups belong in metrics, not in pure marts).
- ❌ Don't build the same concept differently per team (`finance_orders` vs `marketing_orders` is an anti-pattern). If finance genuinely needs a different concept, name it differently (`tax_revenue` vs `revenue`), not by department.

## Example
```sql
-- orders.sql
with
orders as (select * from {{ ref('stg_jaffle_shop__orders') }}),
order_payments as (select * from {{ ref('int_payments_pivoted_to_orders') }}),
orders_and_order_payments_joined as (
    select
        orders.order_id,
        orders.customer_id,
        orders.order_date,
        coalesce(order_payments.total_amount, 0) as amount,
        coalesce(order_payments.gift_card_amount, 0) as gift_card_amount
    from orders
    left join order_payments on orders.order_id = order_payments.order_id
)
select * from orders_and_order_payments_joined
```

## Materialization
- ✅ **Tables** by default — speed matters for end-user queries.
- ✅ **Incremental** when a table grows large enough that full refresh is slow.
- Progression: start with view → upgrade to table when querying is slow → upgrade to incremental when *building* is slow.

## Wide and denormalized
- Modern warehouses: storage is cheap, compute is expensive → denormalize aggressively.
- It's fine to bring `customer` data into the `orders` mart and `orders` data into the `customers` mart, even though that duplicates info — re-joining at query time is more expensive than storing redundant columns.

## Joins: a soft cap
- 8 simple joins in a mart may be fine.
- 4 joins with complex window functions is often too much.
- Rule of thumb: if a mart joins **more than 4–5 concepts**, refactor into intermediate models. Two intermediates feeding a mart with two joins beats one mart with six.

## Marts referencing marts
- Allowed and often correct (e.g., `customers` mart joins to `orders` mart to roll up lifetime value).
- Once data is materialized, re-using it is cheaper than recomputing from staging.
- Watch for: wasted recomputation, circular dependencies.

## Marts are entity-grained
- Each mart represents a *single concept at a single grain*.
- The moment you start grouping multiple entities along a date spine (`user_orders_per_day`), you've left marts and entered **metrics** territory — that belongs in the Semantic Layer or a metric model.

## Semantic Layer note
- Default guidance (no Semantic Layer): denormalize hard.
- If using the dbt Semantic Layer: keep marts *more normalized* — MetricFlow needs the flexibility. See *How we build our metrics* guide.

## Troubleshooting tip
If errors seem to be raised in late models but actually originate upstream, temporarily materialize the upstream chain as tables so the warehouse throws the error at the real source.

## Key takeaways
- One mart = one entity, named in plain English, plural.
- Materialize as table (or incremental for large/slow builds).
- Wide and denormalized — unless you're on the Semantic Layer.
- >4 joins → consider refactoring into intermediates.
- Marts can reference marts; metrics live elsewhere.

## Related
- Materializations — for the table/incremental progression.
- Intermediate layer — where to push complexity out of marts.
- Semantic Layer / How we build our metrics — when marts shouldn't be wide.
