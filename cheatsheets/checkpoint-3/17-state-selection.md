# About State in dbt

**Source:** https://docs.getdbt.com/reference/node-selection/state-selection
**Type:** Documentation · Checkpoint 3

## The mental model
dbt is **stateless** and **idempotent**: same code + same raw data → same result, no matter how many times you run.

But dbt **stores** state — point-in-time snapshots of project resources, database objects, and invocation results — as **artifacts** in `target/`. State-aware features use those artifacts to *inform* operations without changing the stateless guarantee.

## The artifacts that constitute state
- **`manifest.json`** — parsed project state (nodes, configs, refs, sources, tests).
- **`run_results.json`** — outcomes of the last invocation (pass/fail/error/warn per node).
- **`sources.json`** — output of `dbt source freshness`.
- **`catalog.json`** — warehouse metadata (built by `dbt docs generate`).

## The `--state` flag
Pass the path to a previous run's `target/` (or just the artifacts):
```bash
dbt build --select state:modified+ --state path/to/prod
```
Now dbt can compare the current project against the saved state — and selectors like `state:modified` become meaningful.

## What state unlocks (three big features)

### 1. The `state` selector method
Selects resources that are new or modified by comparing current project to the state manifest.
```bash
dbt run  --select state:modified+ --state path/to/prod
dbt test --select state:modified+ --state path/to/prod
```

### 2. Deferral (`--defer`)
For models not selected in the current run, dbt overrides `ref()` to point at the production schema's pre-built objects. No new objects created.
```bash
dbt build --select state:modified+ --defer --state path/to/prod
```
This is **Slim CI** in one line.

### 3. `dbt clone`
Zero-copy clones nodes based on their location in the state manifest.
```bash
dbt clone --select state:modified+,config.materialized:incremental,state:old \
          --state path/to/prod
```

## Other state-driven selectors (preview from *Methods* doc)

| Selector | Selects |
|---|---|
| `state:new` | Resources that don't exist in the state manifest |
| `state:modified` | Resources whose code/config has changed |
| `state:modified.body` | Only models with changed SQL body |
| `state:modified.configs` | Only changed configs |
| `state:modified.persisted_descriptions` | Changed `description` text |
| `state:modified.relation` | Changed materialization or alias |
| `state:modified.macros` | Changed macros (incl. indirect) |
| `state:modified.contract` | Contract changes |
| `state:old` | Exists in state, used to filter to "already-existing" |
| `state:unmodified` | The opposite of modified |
| `result:pass` / `fail` / `error` / `warn` / `skipped` | From `run_results.json` of prior run |
| `source_status:fresher+` | Sources fresher than the prior `sources.json` |

## Slim CI — the canonical use case
```bash
dbt build --select state:modified+ --defer --state path/to/prod
```
- Compares CI branch to production manifest.
- Builds only the modified models and their descendants.
- Reads unchanged parents from the production schema via defer.
- Runs tests on the modified subset.

Result: cheaper, faster CI that mimics post-merge behavior.

## Source-freshness-driven builds
```bash
dbt source freshness
dbt build --select source_status:fresher+ --state path/to/prod
```
Only rebuild downstream of sources whose data actually changed.

## Composing state with other selectors
```bash
# Rerun failed models AND newly modified models, plus their downstream
dbt build --select state:modified+ result:error+ \
          --defer --state path/to/prod

# Rerun failed tests but exclude known-flaky ones
dbt test --select result:fail --exclude my_flaky_test \
         --defer --state path/to/prod
```

## Caveats
See *State comparison caveats* for the full list. The headline ones:
- **`state:modified` can have false positives** when configs are environment-dependent (different schemas in dev vs prod). The behavior-change flag `state_modified_compare_more_unrendered_values: true` fixes this by comparing unrendered configs.
- **State must be from the right environment.** Using a CI state in production (or vice versa) gives nonsensical results.
- **`dbt test` overwrites `run_results.json`** — separate run + test calls compose poorly; use `dbt build` to combine.

## How to obtain state
- **Production run output** — copy `target/manifest.json` and `target/run_results.json` from your prod job to a known location.
- **dbt Cloud** — Cloud manages state for you automatically when you use Slim CI / "defer to production."
- **`--defer-state` / `defer_state`** — separate flag for *just* defer state, in case you want defer state from one place and `--state` from another.

## Key takeaways
- dbt is stateless; state is *informational*, used by `--state` to enable smarter selection.
- Three big consumers: `state:` selectors, `--defer`, `dbt clone`.
- Slim CI is the killer pattern: `state:modified+ --defer --state path/to/prod`.
- `result:` and `source_status:fresher` selectors compose with state to drive cost-aware reruns.
- Use the right state for the environment; watch for `state:modified` false positives.

## Related
- *Node selector methods* — the `state:`, `result:`, `source_status:` reference.
- `dbt clone`, `dbt retry`.
- Slim CI / Best practice workflows.
- `state_modified_compare_more_unrendered_values` behavior flag.
