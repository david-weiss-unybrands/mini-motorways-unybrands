# Node Selector — `state:` Method (and friends)

**Source:** https://docs.getdbt.com/reference/node-selection/methods#state
**Type:** Documentation · Checkpoint 3

## What it is
A reference for the `state:` selector method (and the closely related `result:`, `source_status:`, `exposure:`, `config:`, etc.). These are how you turn dbt artifacts into selection power.

## Selector syntax (recap)
```
--select method:value
```
Method is optional in many cases (`--select my_model` infers `fqn`/`file`/`path`). Wildcards: `*`, `?`, `[abc]`, `[a-z]`.

## The `state:` selectors

| Selector | Meaning |
|---|---|
| `state:new` | Resources missing from the state manifest (newly added in current code) |
| `state:modified` | Resources changed since the state was captured (code, config, etc.) |
| `state:modified.body` | Just the SQL body of models changed |
| `state:modified.configs` | Configs changed |
| `state:modified.persisted_descriptions` | Descriptions in YAML changed |
| `state:modified.relation` | Materialization or alias changed |
| `state:modified.macros` | Macros (direct or indirect) changed |
| `state:modified.contract` | Model contract changed |
| `state:old` | Resource exists in state — used to filter to already-existing things |
| `state:unmodified` | Opposite of modified |

Combine with `+` graph operators to expand to downstream/upstream:
```bash
dbt build --select state:modified+ --defer --state path/to/prod
```

All `state:` selectors **require** the `--state` flag pointing at a directory with `manifest.json`.

## The `result:` selectors
Use the previous invocation's `run_results.json`.

| Selector | Selects |
|---|---|
| `result:pass` | Nodes that passed |
| `result:warn` | Warned |
| `result:fail` | Failed (test-specific) |
| `result:error` | Errored (any node type) |
| `result:skipped` | Skipped (e.g., due to upstream failure) |

Note:
- `result:fail` is specific to tests. Tests don't have downstream nodes, so `result:fail+` is the same as `result:fail`. Use `1+result:fail` to also include the model the test was on.
- `result:error` selects any node that errored (model, test, snapshot, ...).

Examples:
```bash
# Rerun errored models from last run
dbt run --select result:error --state path/to/artifacts

# Rerun failed tests AND their parent model(s)
dbt build --select 1+result:fail --state path/to/artifacts

# Rerun errored models + their downstream
dbt build --select result:error+ result:fail+ --state path/to/artifacts

# Rerun failed tests excluding known flaky
dbt test --select result:fail --exclude my_flaky_test --state path/to/artifacts
```

⚠️ `dbt test` overwrites `run_results.json` — combining `result:error` + `result:fail` only works inside a single `dbt build` invocation.

## The `source_status:` selector
Uses two `sources.json` files (state vs current) to find sources whose data changed.
```bash
dbt source freshness                                            # snapshot current
dbt build --select source_status:fresher+ --state path/to/prod  # rebuild downstream
```
- Requires a current `dbt source freshness` run *and* a `--state` pointing at a prior one.
- The `+` graph operator typically follows — you want what's downstream of the refreshed sources.

## Other useful methods (CP3-relevant)

### `exposure`
Selects parents of an exposure. Always use with `+`.
```bash
dbt build --select +exposure:executive_summary
dbt ls    --select +exposure:* --resource-type source
```

### `config`
Match arbitrary configs.
```bash
dbt run --select config.materialized:incremental
dbt run --select config.tags:nightly
dbt run --select config.meta.contains_pii:true
```
Used in CP3 for the clone-incremental pattern:
```
state:modified+,config.materialized:incremental,state:old
```

### `resource_type`
Filter by node type.
```bash
dbt list --select resource_type:test
dbt build --select resource_type:exposure        # everything upstream of exposures
dbt build --exclude-resource-type unit_test      # production exclude pattern
```

### `tag`
```bash
dbt run --select tag:nightly
```

### `package`
```bash
dbt run --select package:snowplow
dbt run --select package:this      # current project only
```

### `path` / `file` / `fqn`
Path-based selection.
```bash
dbt run --select path:models/staging/github
dbt build --select file:my_function.sql
dbt run --select fqn:my_project.staging.stg_orders
```

### `version`
For versioned models:
```yaml
selectors:
  - name: exclude_old_versions
    default: "{{ target.name == 'dev' }}"
    definition:
      method: fqn
      value: "*"
      exclude:
        - method: version
          value: old
```
Values: `latest`, `prerelease`, `old`, or a specific version number.

### Set operators
- **Space-separated** = **union**: `--select tag:a tag:b`.
- **Comma-separated** = **intersection**: `--select tag:a,tag:b`.
- `+`, `-` graph operators expand downstream/upstream.

## Examples in context

```bash
# Slim CI
dbt build --select state:modified+ --defer --state path/to/prod

# Clone incremental models before Slim CI build
dbt clone --select state:modified+,config.materialized:incremental,state:old \
          --state path/to/prod

# Reprocess errored models AND failed tests in one invocation
dbt build --select state:modified+ result:error+ result:fail+ \
          --defer --state path/to/prod

# Build everything an executive dashboard depends on
dbt build --select +exposure:executive_summary
```

## Key takeaways
- `state:` selectors require `--state` and turn artifact diffing into selection.
- `result:` reruns failed/errored nodes from the prior invocation.
- `source_status:fresher+` reruns downstream of refreshed sources.
- `exposure:`, `config:`, `tag:`, `resource_type:`, `version:` round out the toolbox.
- Space = union, comma = intersection, `+` = graph expansion.
- The clone-incremental pattern is the canonical chained selector: `state:modified+,config.materialized:incremental,state:old`.

## Related
- *About state in dbt* (the artifacts that make this possible).
- *State comparison caveats* (false-positive gotchas).
- Graph operators / set operators reference.
- YAML selectors (named, reusable selection sets).
