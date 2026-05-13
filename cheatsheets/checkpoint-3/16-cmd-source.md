# `dbt source freshness`

**Source:** https://docs.getdbt.com/reference/commands/source#dbt-source-freshness
**Type:** Documentation · Checkpoint 3

## What it does
`dbt source` provides one subcommand: `dbt source freshness`. It queries each configured source table to determine how stale its data is, comparing against your declared `warn_after` / `error_after` thresholds.

- Stale beyond `warn_after` → **warn** (exits 0 by default).
- Stale beyond `error_after` → **error** (nonzero exit).
- Healthy → **pass**.

## Prerequisite: configure freshness on sources
```yaml
sources:
  - name: jaffle_shop
    database: raw
    config:                       # v1.9+ structure
      freshness:
        warn_after: {count: 12, period: hour}
        error_after: {count: 24, period: hour}
      loaded_at_field: _etl_loaded_at    # v1.10+ inside config
    tables:
      - name: customers
      - name: orders
        config:
          freshness:                     # stricter override
            warn_after: {count: 6, period: hour}
            error_after: {count: 12, period: hour}
            filter: "datediff('day', _etl_loaded_at, current_timestamp) < 2"
      - name: product_skus
        config:
          freshness: null                # opt out
```

Key fields:
- `warn_after` / `error_after` — thresholds; at least one required for freshness to compute.
- `loaded_at_field` — column to use as "last loaded at." Required unless dbt can read warehouse metadata.
- `filter` — `WHERE` clause for the freshness query (huge perf win on large tables).

Source-level config cascades to all child tables; tables can override.

## Common commands
```bash
# Check all sources
dbt source freshness

# Specific source
dbt source freshness --select "source:snowplow"

# Specific table within a source
dbt source freshness --select "source:snowplow.event"

# Custom output path
dbt source freshness --output target/source_freshness.json
```

## The `sources.json` artifact
`dbt source freshness` writes `target/sources.json` — used by downstream tools (Cloud dashboards, custom alerting, `source_status:fresher+` selection).

Example:
```json
{
  "sources": {
    "source.project.jaffle_shop.orders": {
      "max_loaded_at": "2024-...",
      "snapshotted_at": "2024-...",
      "max_loaded_at_time_ago_in_s": 481.3,
      "state": "pass",
      "criteria": { "warn_after": {...}, "error_after": {...} }
    }
  }
}
```

Override the destination with `-o` / `--output`.

## How dbt computes freshness
For each table, dbt runs:
```sql
select max({{ loaded_at_field }}) as max_loaded_at,
       convert_timezone('UTC', current_timestamp()) as calculated_at
from {{ source_relation }}
{{ optional filter clause }}
```
Compares `current_timestamp - max_loaded_at` against your thresholds.

## The `source_status:fresher+` selector
After two `dbt source freshness` runs (one prior, one current), dbt can compare to see which sources are **fresher** than last time. Combine with `--state` to rebuild only downstream of refreshed sources:
```bash
# Initial run produces sources.json
dbt source freshness

# Later: rebuild only downstream of sources that have new data
dbt source freshness
dbt build --select source_status:fresher+ --state path/to/prod
```
Pairs perfectly with Slim CI to drive efficient incremental orchestration.

## Severity choice (per *Test smarter — where*)
- Source feeds **high-impact** outputs (customer-facing/financial/executive) → `error_after` defined → stale data fails the job.
- Source feeds nice-to-knows → use `warn_after` only, no `error_after`. Pipeline keeps running; you see the warning.

## State-aware orchestration (Fusion)
Fusion's state-aware orchestration auto-tracks source freshness via warehouse metadata. You only need explicit freshness config when you want:
- SLA alerting.
- Custom freshness logic via `loaded_at_field` / `loaded_at_query` (streaming, partial loads).
- Freshness for source **views** (Fusion can't determine freshness from view metadata — treats as always fresh).

## Operational patterns
```bash
# Snapshot freshness on a 30-min cron
*/30 * * * *  dbt source freshness

# Hourly: rebuild only what changed
0 * * * *  dbt build --select source_status:fresher+ --state path/to/prod

# Alert on staleness in Cloud
# - Configure under Execution settings → freshness snapshot
```

## Key takeaways
- `dbt source freshness` checks source staleness against `warn_after`/`error_after`.
- Needs `loaded_at_field` (or warehouse metadata, or `loaded_at_query`) and at least one threshold.
- Writes `target/sources.json` — fuel for `source_status:fresher+` builds.
- `filter` is your performance lever on huge source tables.
- Severity choice maps to downstream impact: error for critical, warn for nice-to-know.
- Fusion + state-aware orchestration automates freshness via warehouse metadata.

## Related
- Sources doc (declaration mechanics).
- Source configs (the freshness keys in detail).
- `source_status:fresher+` selector.
- `dbt source` command parent doc.
