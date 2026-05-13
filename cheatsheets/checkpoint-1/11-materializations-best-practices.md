# Materializations — Best Practices

**Source:** https://docs.getdbt.com/best-practices/materializations/1-guide-overview
**Type:** Documentation · Checkpoint 1

## What it is
The opinionated guide on *when* to use which materialization, building on the materializations reference. Tldr: start simple, escalate only on real pain.

## Why this matters
Materializations abstract the DDL/DML you'd normally write by hand. You declare *what* you want (table, view, incremental); dbt figures out *how* to build it for your warehouse. Choosing the right one is the difference between fast/cheap pipelines and slow/expensive ones.

## Learning goals
- What materializations are
- How **table**, **view**, **incremental** differ
- When and where to apply each
- How to configure at multiple scopes (single model, folder, whole project)

## The guiding principle: start as simple as possible
A three-tier escalation. Only move up when you hit a real problem.

| Tier | Materialization | Move up when |
|---|---|---|
| 🔍 1 | **View** | The view is too slow to *query* for end users |
| ⚒️ 2 | **Table** | The table is too slow to *build* in your dbt jobs |
| 📚 3 | **Incremental** | (build time is the bottleneck) layer data in chunks |

Materialized views are an optional sidestep at tier 2/3 if your warehouse supports them and you'd rather have the platform manage refreshes.

## How this maps to project structure
| Layer | Default materialization |
|---|---|
| staging | view |
| intermediate | ephemeral (or view in dev schema) |
| marts | table (escalate to incremental when build is slow) |

## Configuration scopes (most specific wins)
1. **Project-wide** in `dbt_project.yml`:
   ```yaml
   models:
     my_project:
       staging:
         +materialized: view
       marts:
         +materialized: table
   ```
2. **Per directory** — same mechanism, nested deeper.
3. **Per model** in the SQL via `{{ config(materialized='incremental') }}`.
4. **In `properties.yml`** for the model.

Use the cascade. Configure exceptions only at the level where they apply.

## Common mistakes
- Making everything a table "to be safe" — wastes warehouse build time and money.
- Jumping straight to incremental on a 100k-row model — the complexity tax isn't worth it.
- Using ephemeral as the default for intermediate models on big projects — debugging becomes painful as model count grows; views in a custom schema are often better.

## Prerequisites this guide expects you've done
- The Quickstart project.
- Familiar with `ref()`, models, and runs.
- (Optional) Read *How we structure our dbt projects* so the staging/intermediate/marts conventions click.

## Key takeaways
- The three-tier escalation (view → table → incremental) is the canonical decision tree.
- Stop at the lowest tier that works; don't optimize speculatively.
- Set materialization at the highest scope that makes sense (folder), override only when needed.
- Materialized views are a managed-refresh alternative to incremental on supported warehouses.

## Related
- Materializations (reference) — all five types in depth.
- Incremental models overview / strategy / microbatch — the next escalation step.
- How we structure our dbt projects — the layer-by-layer default materializations.
