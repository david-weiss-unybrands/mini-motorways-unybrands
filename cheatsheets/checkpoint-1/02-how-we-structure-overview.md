# How We Structure Our dbt Projects — Overview

**Source:** https://docs.getdbt.com/best-practices/how-we-structure/1-guide-overview
**Type:** Reading · Checkpoint 1 (also referenced in Checkpoint 3)

## What it is
The opinionated dbt Labs guide to organizing a dbt project. The exam expects you to know this structure and the *why* behind it.

## The core arc
Data should flow from **source-conformed → business-conformed**. Source-conformed = shape dictated by upstream systems you don't control. Business-conformed = shape dictated by your org's needs. Every layer in the project exists to move data along that arc.

## Three primary `models/` layers

| Layer | Analogy | Purpose | Default materialization |
|---|---|---|---|
| **staging** | atoms | One model per source table; clean, rename, cast | view |
| **intermediate** | molecules | Purpose-built transformation steps; isolate complexity | ephemeral or view in dev schema |
| **marts** | cells / proteins | Business entities; what end users query | table or incremental |

## Canonical project tree (Jaffle Shop)
```
jaffle_shop/
├── dbt_project.yml
├── packages.yml
├── analyses/
├── seeds/
├── macros/
├── snapshots/
├── tests/
└── models/
    ├── staging/
    │   ├── jaffle_shop/
    │   │   ├── _jaffle_shop__sources.yml
    │   │   ├── _jaffle_shop__models.yml
    │   │   ├── stg_jaffle_shop__customers.sql
    │   │   └── base/   # only when joins are needed pre-stage
    │   └── stripe/
    ├── intermediate/
    │   └── finance/
    │       └── int_payments_pivoted_to_orders.sql
    ├── marts/
    │   ├── finance/
    │   └── marketing/
    └── utilities/
```

## Naming and folder rules
- **Staging**: group by *source system*, not by business domain or by loader.
- **Intermediate / marts**: group by *area of business concern* (finance, marketing).
- File names tell you everything: `stg_[source]__[entity]s.sql` (double underscore separates source and entity), `int_[entity]_[verb]s.sql`, marts named by the entity (`orders`, `customers`).
- Entities are plural (`orders`, not `order`) — reads like prose.

## Why structure matters
- Reduces decision fatigue — your team spends bandwidth on hard problems, not "where does this file go."
- Folder = selector. `dbt build --select staging.stripe+` runs every downstream model from a single source.
- Folder = configuration boundary. `dbt_project.yml` cascades materializations and schemas based on directory.

## Anti-patterns called out
- ❌ Staging subdirectories named after loaders (`fivetran/`, `stitch/`).
- ❌ Staging subdirectories named after business domains.
- ❌ Splitting concepts per team (`finance_orders` and `marketing_orders`) — that defeats single-source-of-truth.
- ❌ Over-optimizing too early — under ~10 marts, skip subdirectories.

## Key takeaways
- Source-conformed → business-conformed is the only universal rule; everything else is convention to enforce it.
- Stay consistent and *document deviations* in your README.
- Folder structure is one of three knowledge-graph interfaces (DAG, folders, warehouse output) — keep all three coherent.

## Related
- Staging / Intermediate / Marts / Rest-of-project — the four deeper guides this overview indexes.
- Best practice workflows; dbt_project.yml reference for the config-cascade mechanics.
