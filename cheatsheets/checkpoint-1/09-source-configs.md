# Source Configurations

**Source:** https://docs.getdbt.com/reference/source-configs
**Type:** Documentation · Checkpoint 1

## What it is
The configuration keys you can apply to sources (in `dbt_project.yml` or in a source's YAML `config:` block). The big three: `enabled`, `event_time`, `meta`. Plus inherited general configs and the `freshness` config that lives at the property layer.

## Where you can set source configs

### In `dbt_project.yml` (under `sources:`)
```yaml
sources:
  <project-or-package-name>:
    <source-name>:
      <table-name>:          # optional, deepest level
        +enabled: true | false
        +event_time: my_time_field
        +freshness:
          warn_after:
            count: <int>
            period: minute | hour | day
        +meta:
          key: value
```

### Inline in a properties YAML (`models/.../*.yml`)
```yaml
sources:
  - name: my_source
    config:
      enabled: true
      event_time: my_time_field
      meta: {owner: "data-platform"}
      freshness:
        warn_after: {count: 4, period: hour}
    tables:
      - name: my_table
        config:
          enabled: false
```

## The keys (v1.9+)

| Key | Purpose |
|---|---|
| `enabled` | Toggle a source or table on/off |
| `event_time` | Column representing the *real* timestamp of an event (not load time). Required for microbatch incremental; used for CI-vs-prod comparisons |
| `meta` | Free-form metadata (owners, source system tags, descriptions) |
| `freshness` | Move-to-config-block version of the freshness threshold (was a property pre-1.9) |
| `loaded_at_field` | (1.10+) column used to compute freshness; under `config:` block |

## Patterns

### Disable all sources from a package
```yaml
# dbt_project.yml
sources:
  events:
    +enabled: false
```

### Disable a specific source from a package
```yaml
sources:
  events:
    clickstream:
      +enabled: false
```

### Disable a specific table
```yaml
sources:
  events:
    clickstream:
      pageviews:
        +enabled: false
```

### Conditionally enable via a variable
```yaml
sources:
  - name: my_source
    tables:
      - name: my_source_table
        config:
          enabled: "{{ var('my_source_table_enabled', false) }}"
```

### Source in a subdirectory (disabling via project YAML)
You must mirror the full path:
```yaml
sources:
  your_project_name:
    subdirectory_name:
      source_name:
        source_table_name:
          +enabled: false
```

### Attach event_time for microbatch
```yaml
sources:
  events:
    clickstream:
      +event_time: event_timestamp
```
Required for `incremental_strategy='microbatch'`; also unlocks event-window comparison in advanced CI.

### Attach meta
```yaml
sources:
  events:
    clickstream:
      +meta:
        source_system: "Google Analytics"
        data_owner: "marketing_team"
```

### Freshness (project-wide default)
```yaml
sources:
  <resource-path>:
    +freshness:
      warn_after: {count: 4, period: hour}
```

## Inheritance & resource paths
- Configs cascade by resource path: `<project>:<source>:<table>` (most-specific wins).
- A `+` prefix marks a config (vs a property name); paths without `+` are part of the resource path.
- Source-level config applies to all tables unless a table overrides.

## Most common use case
Disabling sources from imported **packages** so you don't pollute your DAG or run freshness checks on tables you don't own.

## Key takeaways
- Three primary keys (1.9+): `enabled`, `event_time`, `meta` — plus `freshness` and `loaded_at_field` in config block.
- Configure in `dbt_project.yml` for project-wide patterns; configure inline for source-specific overrides.
- Resource paths follow `<project>:<source>:<table>` depth.
- `event_time` is the doorway to microbatch and advanced CI comparisons.
- Disabling is the most common real-world use, especially for package sources.

## Related
- Sources doc — the declaration mechanics.
- `event_time` resource config — full reference.
- Incremental microbatch — biggest consumer of `event_time`.
