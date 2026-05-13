# To Defer or to Clone, That Is the Question

**Source:** https://docs.getdbt.com/blog/to-defer-or-to-clone
**Type:** Reading · Checkpoint 3

## What it is
A dbt Labs blog post comparing **defer** and **clone** — two ways to avoid expensive recomputation in dev/CI/CD. Same purpose at a high level, very different mechanics and effects.

## Definitions (at a glance)
- **`dbt clone`** — Uses the warehouse's native zero-copy clone to copy an entire schema (or selected resources) from a source schema to a target schema, almost instantly and almost free. Creates real database objects in the target schema.
- **`--defer` (with `--state`)** — At compile time, dbt overrides `ref()` resolutions for unbuilt models to point at the production schema's existing objects. No new objects are created.

## How clone works (mechanically)
Zero-copy cloning copies *metadata only* — the underlying data stays at rest. You end up with two pointers (source and target schemas) to the same underlying storage. After clone, you can read, modify, even write to the target schema; the source is untouched.

## How defer works (mechanically)
dbt compares two manifests (a "state" path and the current project). For every model **not selected** in the current run, dbt resolves `ref()` to point at the production object instead of trying to build it. The CI job only builds the models that changed.

## Defer vs clone — first-order

| | defer | clone |
|---|---|---|
| **How used** | `--defer --state path/` flag | `dbt clone` command |
| **Creates objects?** | No (just rewires refs) | Yes (real objects in target schema) |
| **Mechanism** | Manifest diff; ref overrides | Zero-copy (or pointer view fallback) |

## Defer vs clone — second-order

| | defer | clone |
|---|---|---|
| Usable in BI / downstream tools? | ❌ Only inside dbt | ✅ Anywhere |
| Safely modify target schema? | ❌ Would mutate prod | ✅ Yes — sandbox |
| Drift from source? | ❌ Always latest | ✅ Point-in-time snapshot |
| Multiple sources? | ✅ Yes (dynamic per-model) | ❌ One source schema → one target |

## When to use which
- **CI** (Slim CI) → **defer**.
  - Avoid rebuilding unchanged models.
  - Reference prod for upstream, staging for the modified subset.
- **Sharing dev data with BI/analysts** → **clone**.
  - They need actual database objects to query.
- **Sandbox experimentation on prod-shaped data** → **clone**.
  - You can mutate it without touching prod.
- **Blue/green deployments** → **clone**.
  - Build full staging dataset, run tests, clone to prod only on green.
- **Testing modified incremental models in CI** → **clone** of the incremental table into the CI env, then re-run only the modifications. See *Clone incremental models* best-practice doc.

## Rule of thumb
> **Defer** fits CI use cases. **Clone** fits CD (continuous deployment) use cases.

## Worked example: Slim CI
1. Take a known-good `manifest.json` from production (saved as an artifact).
2. In CI: `dbt build --select state:modified+ --defer --state path/to/prod-manifest`.
3. CI builds only what changed; everything else `ref`'s the prod objects.

## Worked example: blue/green with clone
1. Build all models into a `staging` schema.
2. `dbt test` against staging.
3. If green: `dbt clone --select <everything>` into prod.
4. If red: do nothing; prod is untouched.

## Limitations / gotchas
- **Clone** requires warehouse support for zero-copy clone (Snowflake, BigQuery, Databricks, etc.). On unsupported platforms, dbt falls back to **pointer views** (`select * from src`) — slower for downstream queries.
- **Clone drifts** the moment the source moves on. Re-clone on a schedule if you need fresh sandboxes.
- **Defer** can confuse new contributors — the dev environment "magically" shows prod data via the override. Document it.
- **Defer doesn't materialize anything**. If your downstream tool (Tableau, Looker) needs a real table, you need to clone, not defer.

## Memorable framing from the post
> If you link to this page, you **defer** to it.
> If you print it and write notes in the margins, you've **cloned** it.

## Key takeaways
- Both save warehouse cost by reusing previously-built objects.
- **Defer** = lazy ref-override for CI; no new objects, always-latest, multi-source.
- **Clone** = eager metadata copy for sandboxes/CD; real objects, can mutate, point-in-time.
- CI workflow → defer. CD/sandbox/blue-green → clone.
- Pair them in the same project for different stages of the deployment lifecycle.

## Related
- `dbt clone` command.
- `--defer` / `--state` / `state:modified+`.
- *Clone incremental models* best practice.
- Slim CI workflows.
