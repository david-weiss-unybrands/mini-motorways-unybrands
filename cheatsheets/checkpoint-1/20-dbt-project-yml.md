# `dbt_project.yml`

**Source:** https://docs.getdbt.com/reference/dbt_project.yml
**Type:** Documentation · Checkpoint 1

## What it is
The required project-root file that makes a directory a dbt project. It declares the project name, version, profile, folder paths, and default configurations for every resource type.

## How dbt finds it
- Searches current working directory and parents.
- Override via `--project-dir` CLI flag.
- Or `DBT_PROJECT_DIR` env var (renamed to `DBT_ENGINE_PROJECT_DIR` in v1.11+ for Fusion).

## Top-level keys (most-used)

```yaml
name: my_project                # required
config-version: 2               # required (current schema)
version: '1.0.0'                # project version
profile: my_profile             # which profile in profiles.yml to use

# Path overrides (all are arrays; default folders shown)
model-paths:    [models]
seed-paths:     [seeds]
test-paths:     [tests]
analysis-paths: [analyses]
macro-paths:    [macros]
snapshot-paths: [snapshots]
docs-paths:     [models, snapshots, analyses, macros]
asset-paths:    [assets]
function-paths: [functions]      # v1.11+ / Fusion

packages-install-path: dbt_packages
clean-targets:        [target, dbt_packages]

require-dbt-version: ">=1.6.0"

query-comment: "/* dbt */"       # injected into every query the warehouse runs

# Cloud-platform binding
dbt-cloud:
  project-id: 123456             # required
  defer-env-id: 67890            # optional
  account-host: cloud.getdbt.com # defaults

# Quoting policy
quoting:
  database: true
  schema:   true
  identifier: true
  # Fusion-only:
  snowflake_ignore_case: true | false

# Hooks
on-run-start: ["{{ create_audit_table() }}"]
on-run-end:   ["GRANT SELECT ON ALL TABLES IN SCHEMA {{ target.schema }} TO reader"]

# Dispatch (override macros from packages)
dispatch:
  - macro_namespace: dbt
    search_order: [my_project, dbt]

# Project-level Mesh setting
restrict-access: true | false

# Resource-type config trees
models:        { ... }
seeds:         { ... }
snapshots:     { ... }
sources:       { ... }
data_tests:    { ... }
exposures:     { ... }
metrics:       { ... }
semantic-models: { ... }
saved-queries: { ... }
analyses:      { ... }
vars:          { ... }
flags:         { ... }
functions:     { ... }
```

## The `+` prefix
Inside a resource config tree, prefix configs with `+` (e.g. `+materialized`, `+schema`, `+tags`) to mark them as configs and distinguish from folder-path keys.

```yaml
models:
  my_project:
    staging:
      +materialized: view
      +schema: staging
    marts:
      +materialized: table
```

## Naming convention rule (often missed)
- Inside `dbt_project.yml`: use **dashes** for multi-word resource types (`saved-queries`, `semantic-models`, `model-paths`).
- Inside **other** YAML files (properties, sources): use **underscores** (`saved_queries`, `semantic_models`).

## Common patterns

### Folder-level materializations & schemas
```yaml
models:
  jaffle_shop:
    staging:
      +materialized: view
    intermediate:
      +materialized: ephemeral
    marts:
      +materialized: table
      finance:
        +schema: finance
      marketing:
        +schema: marketing
```

### Package variables
```yaml
vars:
  snowplow:
    'snowplow:timezone': 'America/New_York'
```

### Hooks for grants/audits
```yaml
on-run-end:
  - "GRANT SELECT ON ALL TABLES IN SCHEMA {{ target.schema }} TO bi_reader"
```

## `flags:` block
Project-level overrides for global configs:
```yaml
flags:
  use_colors: true
  fail_fast: false
```

## Properties vs configs
- A **config** is something dbt understands at build time (`materialized`, `tags`, `schema`).
- A **property** is metadata (e.g., macro properties).
- You **cannot** set a property in `dbt_project.yml` — only configs.

## Key takeaways
- One file, declares project identity + every resource-type default.
- Dashes inside `dbt_project.yml`; underscores everywhere else.
- The `+` prefix marks configs (vs folder paths) inside resource trees.
- Cascading config: project-wide → folder → model. Most-specific wins.
- Override the project dir via `--project-dir` or env var.

## Related
- Project configs reference (each key in detail).
- The `+` prefix and resource paths.
- Global configs / `flags:` block.
