# Model Contracts

**Source:** https://docs.getdbt.com/docs/mesh/govern/model-contracts
**Type:** Documentation · Checkpoint 2

## What it is
A model contract is a set of upfront guarantees about a model's **shape** — its columns, their data types, and (optionally) constraints. With a contract enforced, dbt verifies before building that the model's SQL will produce a dataset matching those guarantees. If it doesn't, the build fails.

## Why use one
A bare `select` model can change shape whenever its SQL changes. That's great for iteration, but bad for downstream consumers (dashboards, other dbt projects, external systems). Contracts protect those consumers by making the model's interface explicit and validated.

## Defining a contract

```yaml
# models/marts/customers.yml
models:
  - name: dim_customers
    config:
      contract:
        enforced: true
    columns:
      - name: customer_id
        data_type: int
        constraints:
          - type: not_null
      - name: customer_name
        data_type: string
```

When enforced:
1. **Preflight check** — dbt verifies the SQL will return columns with the declared names and `data_type`s. Column order doesn't matter at this stage.
2. **DDL inclusion** — dbt includes the column names, types, and constraints in the `CREATE TABLE` DDL it sends to the warehouse. The warehouse enforces them on insert. The DDL also orders columns to match the contract.

## Requirements
- Every column must declare `name` AND `data_type`.
- Constraints (beyond just types) are **only** valid on `table` or `incremental` materializations — not on `view` or `ephemeral`.
- Constraints depend on platform support (see Constraints doc).

## Contracts vs tests

| | Model contract | Data test |
|---|---|---|
| Validates | **Shape** (columns/types) | **Content** (rows) |
| When | Build-time (preflight + DDL) | After build |
| Effect on build | Failed contract → no build | Failed test → table built, test reports |
| Configurable severity | No | Yes (`severity: warn` etc.) |
| Best for | "API" guarantee for downstream | Data quality |

Some data tests can be replaced by **constraints** for build-time enforcement (cheaper, stricter):
- Prerequisites: `table` or `incremental` materialization, full contract, platform actually enforces the constraint (most enforce only `not_null`).
- Most platforms accept `primary_key`/`unique`/`check` as informational but don't enforce them at insert time.

## Which models should have contracts?
Recommended for **public models** that other groups/teams/projects consume — internally via dbt Mesh or externally via dashboards/exposures. For private intermediate models, contracts are overkill.

## All columns are required
A contract must cover **every** column the model selects. There's no partial-contract option. For wide models this means a lot of YAML — generation tools (`dbt-codegen`) help.

## Breaking changes
When you change a contracted model in a way that violates the contract (drop a column, change a type), dbt detects it during state comparison:
- **Versioned models** → error (breaking change requires bumping version).
- **Unversioned models** → warning.
- Removing a contracted model entirely (delete/rename/disable) → same rules apply (v1.9+).

This is how contracts pair with **model versions** — contracts make the breaking change detectable; versions give you a path through it.

## Platform constraint support (high level)
- Postgres: full ANSI + `check` (all enforced).
- Most analytical platforms: enforce `not_null` only; others are informational.
- Use `warn_unenforced: false` and `warn_unsupported: false` per-constraint to silence warnings.

## Key takeaways
- Contracts = shape guarantees enforced before and during build.
- `enforced: true` + `name` + `data_type` for every column.
- Constraints work only on `table` / `incremental` materializations.
- Distinct from tests: contracts validate shape, tests validate rows.
- Pair with **model versions** to manage breaking changes gracefully.
- Recommend for public/consumed models, not every internal one.

## Related
- Constraints (the per-constraint reference).
- Model versions (how to evolve contracts safely).
- Exposures (mark downstream consumers).
