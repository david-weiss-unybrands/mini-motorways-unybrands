# How We Structure — Intermediate Layer

**Source:** https://docs.getdbt.com/best-practices/how-we-structure/3-intermediate
**Type:** Reading · Checkpoint 1

## What it is
The middle layer that takes staging "atoms" and assembles them into purpose-built "molecules" on the way to marts. Intermediate models break complexity into named, testable steps.

## Folders
- ✅ Subdivide `models/intermediate/` **by business area of concern** (`finance/`, `marketing/`).
- This is the layer where the project shifts from *source-conformed* to *business-conformed*.

## File-naming convention
- `int_[entity]_[verb]s.sql` — emphasize **verbs**: `pivoted`, `aggregated_to_user`, `joined`, `fanned_out_by_quantity`, `funnel_created`.
- The double underscore from staging is **dropped** at this layer (we're past source distinctions).
- Exception: if a model still lives at source-system grain (e.g., `int_shopify__orders_summed` to be unioned later), keep the double underscore.
- Long descriptive names are worth it — anyone (even non-SQL readers) should grasp the model's job from the filename.

## Example
```sql
-- int_payments_pivoted_to_orders.sql
{%- set payment_methods = ['bank_transfer','credit_card','coupon','gift_card'] -%}

with
payments as (
    select * from {{ ref('stg_stripe__payments') }}
),
pivot_and_aggregate_payments_to_order_grain as (
    select
        order_id,
        {% for payment_method in payment_methods -%}
            sum(case when payment_method = '{{ payment_method }}'
                and status = 'success'
                then amount else 0 end
            ) as {{ payment_method }}_amount,
        {%- endfor %}
        sum(case when status = 'success' then amount end) as total_amount
    from payments
    group by 1
)
select * from pivot_and_aggregate_payments_to_order_grain
```
Note: CTE name (`pivot_and_aggregate_payments_to_order_grain`) tells the story for non-SQL readers; Jinja loop keeps the code DRY.

## Materialization
- ❌ Not exposed to end users in the prod schema.
- ✅ **Ephemeral** — the simplest default; nothing materializes in the warehouse. Trade-off: harder to troubleshoot (the CTE is inlined into ref'ing models).
- ✅ **View in a separate custom schema with restricted permissions** — more robust for larger projects; you can inspect output without polluting prod.

## Three canonical use cases
1. **Structural simplification** — instead of 10 joins in a mart, build two intermediate models with 5 joins each, then join those two in the mart. Improves readability, testability, and clarity.
2. **Re-graining** — fan out or roll up to the right grain before the mart. Example: fanning `orders` by `quantity` to create `order_items`.
3. **Isolating complex operations** — push tricky window functions or business logic into their own intermediate model so they can be debugged and tested in isolation.

## DAG rule of thumb: "Narrow the DAG, widen the tables"
- Up through marts, the DAG should look like an arrowhead pointing right: many narrow staging models → fewer, wider intermediates → narrow set of marts.
- A model can have **many inputs**; multiple **outputs** (other models referencing this one) is a red flag — indicates the abstraction is wrong.

## Don't over-engineer
The example uses subdirectories at this layer, but a small project (<10 marts) often doesn't need them. The goal is *single source of truth*, not maximum file count.

## Key takeaways
- Verbs in the name (`pivoted`, `joined`, `summed`).
- Group by business domain, not source.
- Default to ephemeral; upgrade to view-in-custom-schema as the project grows.
- Three reasons to add an intermediate: simplify joins, fix grain, isolate complexity.
- Many inputs OK; many outputs from a single intermediate → re-think.

## Related
- Materializations — for the ephemeral vs view trade-off.
- Marts guide — the consumer of intermediate models.
