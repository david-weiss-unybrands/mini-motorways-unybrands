# `dbt clone`

**Source:** https://docs.getdbt.com/reference/commands/clone
**Type:** Documentation · Checkpoint 3

## What it does
Clones selected nodes from a **specified state** to the current target's schema(s). Uses the warehouse's zero-copy cloning where available; falls back to pointer views otherwise.

## How it picks a mechanism
- **Zero-copy clone** (Snowflake, BigQuery, Databricks) when the source object exists as a table.
- **Pointer view** (`select * from src_schema.tbl`) when zero-copy isn't supported or the object is a view.

The materialization name is `clone` — dbt internally treats it like any other materialization but it's only used by this command.

## Use cases
- **Blue/green continuous deployment** — build to staging, test, then clone to prod.
- **Cloning production into dev schemas** — give analysts/devs a fresh sandbox.
- **Incremental models in CI** — clone the prod incremental table into the CI schema so `is_incremental()` is `true` and CI doesn't do an expensive full-refresh.
- **Testing code changes against downstream BI** — clone produces real objects a BI tool can read; defer cannot.

## Common commands
```bash
# Clone everything from a saved state into target schema(s)
dbt clone --state path/to/artifacts

# Clone just one model
dbt clone --select "one_specific_model" --state path/to/artifacts

# Re-clone (overwrite pre-existing target relations)
dbt clone --state path/to/artifacts --full-refresh

# Speed up with more threads — clone statements are independent
dbt clone --state path/to/artifacts --threads 50
```

By default `dbt clone` will **not overwrite** pre-existing relations in the target — pass `--full-refresh` to force re-clone.

## Clone vs defer (recap)
- `dbt clone` creates real objects → usable in BI, sandbox, mutable. Costs some compute and storage metadata.
- `--defer` rewires refs at compile time → no new objects, always-latest, multi-source, but only visible inside dbt.

When in doubt for **CI** → defer. For **CD** or BI-visible sandboxes → clone.

## Clone in dbt Cloud
- **Cloud CLI**: `dbt clone` auto-includes `--defer` for you.
- **Studio IDE**:
  1. Have a successful production-environment job run (needed for state).
  2. Toggle **"Defer to production"** in the bottom-right of the command bar.
  3. Run `dbt clone`.

## Selection patterns

```bash
# Clone all incremental models that are modified OR downstream of a modification,
# but only if they already existed in prod (state:old)
dbt clone --select state:modified+,config.materialized:incremental,state:old \
          --state path/to/prod
```

This is the canonical pattern from *Clone incremental models* — see that doc for the full CI recipe.

## What's actually happening
Zero-copy clone copies *metadata*: the warehouse creates a pointer from the new relation to the same underlying data blocks. Storage cost is near-zero until the clone is mutated (then the warehouse copy-on-writes the changed blocks).

Pointer views (the fallback) are real views — they query through to the source object. Mutation of the source is reflected in the clone; mutation of the clone is not possible (it's a view).

## Gotchas
- Clone is **point-in-time**. Data drifts after the operation. Re-clone to refresh.
- Clone of an **incremental** model: the underlying table is cloned, but `is_incremental()` only returns `true` if the *current target* sees the cloned object as existing — which it now does, so subsequent `dbt run` on that model runs incrementally.
- `--full-refresh` re-clones (overwrites), not "refresh the cloned data from source."
- Not all object types clone the same way; views always end up as pointer views.

## Key takeaways
- `dbt clone` = zero-copy clone (or pointer-view fallback) of selected nodes from a state to the target schema.
- Use when you need **real objects** in the warehouse — defer doesn't give you that.
- Default behavior preserves existing target relations; `--full-refresh` overwrites.
- Cloud CLI auto-defers; Studio IDE requires the defer toggle.
- The killer recipe: clone prod incrementals into CI before `dbt build --select state:modified+`.

## Related
- *Clone incremental models* (the CI recipe).
- *To defer or to clone* (the conceptual blog post).
- `--state`, `state:modified`, `state:old` selection.
- `--defer` / `--state` for the CI alternative.
