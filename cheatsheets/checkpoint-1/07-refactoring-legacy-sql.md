# Refactoring Legacy SQL to dbt

**Source:** https://docs.getdbt.com/guides/refactoring-legacy-sql
**Type:** Reading · Checkpoint 1

## What it is
A six-step process for porting a giant legacy SQL script (typically a stored procedure) into modular dbt models without changing the output.

## The six steps

### 1. Migrate 1:1 first
Paste the legacy SQL into a `.sql` file under `models/` and `dbt run` it. The goal: don't change logic, just get it executing in dbt. If you're also switching SQL dialects, syntax fixes are unavoidable — fix function-by-function, but resist "while I'm in here" rewrites. Every logic change creates auditing work.

### 2. Replace raw table references with sources
Define sources in YAML and swap `my_database.my_schema.my_table` for `{{ source('my_source', 'my_table') }}`. Three payoffs:
- **Freshness reporting** (`dbt source freshness`).
- **Dependency tracing** — see which migrated procs share raw tables, so you can consolidate base modeling.
- **Habit formation** — config-driven references mean a source change is one YAML edit + one PR.

### 3. Choose a refactoring strategy

**In-place**: edit the migrated file directly.
- ✅ No cleanup at the end.
- ❌ More pressure to get it right; harder to audit; relies on git history to see what changed.

**Alongside** (recommended): copy the model into `/marts/` and refactor the copy.
- ✅ End users keep referencing the old model while you work.
- ✅ Audit by running old vs new side-by-side.
- ✅ Smaller, incremental PRs.
- ❌ Duplicate files until you deprecate.

### 4. Implement CTE groupings
Reorganize the model into a 4-part layout:
1. **Import CTEs** — one per source, `select * from {{ source(...) }}` (filters allowed).
2. **Logical CTEs** — pull subqueries out one at a time, named for the transformation they do.
3. **Final CTE** — the leftover top-level select, named clearly.
4. **Final select**: `select * from final`.

```sql
with
import_orders as (
    select * from {{ source('jaffle_shop','orders') }} where amount > 0
),
import_customers as (
    select * from {{ source('jaffle_shop','customers') }}
),
logical_cte_1 as ( -- math on import_orders ),
logical_cte_2 as ( -- math on import_customers ),
final_cte as ( -- join the two )
select * from final_cte
```
No nested subqueries. Anyone debugging can step through CTEs linearly.

### 5. Port CTEs to individual models
- **Import CTEs → staging models**, one per source table. Push always-needed transforms (renames, casts) here.
- **Logical CTEs → intermediate models** when complex or reusable. Keep simple ones as CTEs in the mart.
- **Final CTE → the mart**.

### 6. Audit the output
Use the [`audit_helper`](https://hub.getdbt.com/dbt-labs/audit_helper/latest/) package to diff old vs new results. It generates the comparison queries for you — way faster than writing them by hand.

## Key takeaways
- Migrate before refactoring; one logic change at a time = sane audits.
- Sources first — they pay dividends immediately.
- Prefer "alongside" refactoring over "in-place".
- 4-part CTE layout (import / logical / final / select) is the bridge from monolithic SQL to modular dbt.
- Don't skip the audit step — `audit_helper` exists for exactly this.

## Related
- *How we structure our dbt projects* — where the refactored layers live.
- *Sources* — for the step-2 source declaration mechanics.
- *Best practice workflows* — the workflow this slots into.
