# Clone Incremental Models in CI

**Source:** https://docs.getdbt.com/best-practices/clone-incremental-models
**Type:** Documentation · Checkpoint 3

## The problem this solves
You have a Slim CI job:
```bash
dbt build --select state:modified+ --defer --state path/to/prod
```
This builds modified models (and descendants) into a **PR-specific schema**. But what about incremental models?

When the CI run hits a modified **incremental** model, the model doesn't yet exist in the PR-specific schema. So `is_incremental()` returns `false` and dbt runs a **full-refresh**. Two consequences:
1. Incremental models are often your largest tables → slow + expensive.
2. CI passes a full-refresh, but the actual merge into main would run *incrementally* — which can fail due to schema drift (especially with `on_schema_change='fail'`).

## The fix
Zero-copy clone the relevant pre-existing incremental models into the PR schema **before** the slim build, so they exist and `is_incremental()` returns `true`.

## The two-step CI job

```bash
# Step 1: Clone modified incrementals (and downstream incrementals) that already exist in prod
dbt clone --select state:modified+,config.materialized:incremental,state:old \
          --state path/to/prod

# Step 2: Run Slim CI as normal
dbt build --select state:modified+ --defer --state path/to/prod
```

Because step 1 created the incremental tables in the PR schema, step 2's `dbt build` runs them **incrementally** — matching what will happen post-merge in prod.

## Prerequisites
- **dbt 1.6+** for `dbt clone`.
- **A warehouse that supports zero-copy clone** (Snowflake, BigQuery, Databricks). On unsupported warehouses, `dbt clone` falls back to pointer views — this trick doesn't help there.
- Slim CI configured to defer to a production environment with valid artifacts.

## Why each selector
```
state:modified+,config.materialized:incremental,state:old
```
- `state:modified+` — the modified node and its descendants.
- `config.materialized:incremental` — restrict to incremental models only.
- `state:old` — only models that *already exist* in the prior state (i.e., production).

### Why `state:old`?
Brand-new incremental models can't be cloned — they don't exist in prod yet. They should run in full-refresh mode in CI (matching what they'll do in prod on first merge). Without `state:old`, dbt would log warnings like "No relation found in state manifest for..." for those new models. With it, dbt skips them cleanly.

## The schema-drift trade-off

If your model has `on_schema_change='fail'` and a PR adds a column:
- **Incremental build** → fails (schema mismatch).
- **Full-refresh build** → succeeds.

After this clone trick, your CI will now run **incrementally** and **fail** on the schema change. Two options:

| Option | Trade-off |
|---|---|
| **Let CI fail** | You notice the schema change. You commit to running `dbt build --full-refresh --select my_incremental_model` in prod after merge. Blocks the PR until you decide. |
| **Don't add the clone step** | CI passes (full-refresh). Merge succeeds. Then the next scheduled prod incremental run breaks. Surprise. |

Most teams prefer the **fail-loudly** option — known issues are easier than mysterious post-merge breakages.

## What happens visually

Before the clone:
```
prod schema:    fct_orders (incremental, 100M rows)
PR schema:      (empty)

dbt build --select state:modified+
  → fct_orders is built fresh in PR schema
  → 100M rows rebuilt
  → is_incremental() = false everywhere
```

After the clone:
```
prod schema:    fct_orders (incremental, 100M rows)
PR schema:      fct_orders (zero-copy clone, ~free)

dbt build --select state:modified+
  → fct_orders found in PR schema
  → is_incremental() = true
  → only new rows processed
  → behaves exactly like the post-merge production run
```

## Where this fits in the test-smarter framework
This is operational testing — making sure CI faithfully simulates production. It's not about data quality (that's tests/contracts) but about pipeline reliability (does the merge actually work?).

## Key takeaways
- Without cloning, Slim CI accidentally runs incrementals as full-refreshes → slow, expensive, and *can* mask schema-drift failures.
- Add a `dbt clone --select state:modified+,config.materialized:incremental,state:old --state path/to/prod` step before `dbt build`.
- Requires dbt 1.6+ and a warehouse that supports zero-copy clone.
- `state:old` filters out brand-new incrementals that can't be cloned.
- Faithful CI = catching schema-drift failures before merge, not after.

## Related
- `dbt clone` command reference.
- *To defer or to clone* blog (the conceptual framing).
- Slim CI / `state:modified+` / `--defer` / `--state`.
- `on_schema_change` incremental config.
