# Exposures

**Source:** https://docs.getdbt.com/docs/build/exposures
**Type:** Documentation · Checkpoint 3

## What it is
An exposure declares a **downstream use** of your dbt project — a dashboard, ML model, application, notebook, or analysis. By naming it, you bring downstream consumers into the dbt DAG: you can `select` them, run/test their upstream dependencies, and surface them in the docs site.

## Two ways exposures get created
- **Manual** — you write YAML.
- **Automatic** (dbt Cloud / supported integrations) — Cloud creates downstream exposures based on connected BI tools (Tableau, Looker, etc.). They behave like manual exposures but don't have a YAML file.

## Manual declaration

```yaml
# models/marts/finance/_finance__exposures.yml
exposures:
  - name: weekly_jaffle_metrics       # required, snake_case
    label: Jaffles by the Week        # optional, display name
    type: dashboard                   # required: dashboard|notebook|analysis|ml|application
    maturity: high                    # optional: high|medium|low
    url: https://bi.tool/dashboards/1 # optional; activates "View this exposure" link
    description: >
      Did someone say "exponential growth"?

    depends_on:                       # expected
      - ref('fct_orders')
      - ref('dim_customers')
      - source('gsheets', 'goals')
      - metric('count_orders')

    owner:                            # required: name OR email
      name: Callum McData
      email: data@jaffleshop.com
```

## Required vs optional

**Required:**
- `name` — snake_case, unique. No spaces or special chars (use `label` for that).
- `type` — one of `dashboard`, `notebook`, `analysis`, `ml`, `application`.
- `owner` — `name` or `email` required; additional fields allowed.

**Expected:**
- `depends_on` — list of `ref()`, `source()`, `metric()`. (Almost never a raw `source()` — exposures usually depend on marts.)

**Optional:**
- `label`, `url`, `maturity`, `description`, `tags`, `meta`, `enabled`.

## `depends_on` ≠ SQL `-- depends_on`
- **Exposure YAML `depends_on:`** — declares dependencies for the DAG.
- **SQL `-- depends_on:`** comment directive — used inside model SQL files to add explicit dependencies. Different feature, don't confuse.

## What exposures unlock

### Selection
```bash
# Build all upstream of an exposure
dbt run --select +exposure:weekly_jaffle_metrics

# Test all upstream
dbt test --select +exposure:weekly_jaffle_metrics

# Find sources upstream of all exposures
dbt ls --select "+exposure:*" --resource-type source
```

The `exposure:` selector method combined with the `+` graph operator → critical for "build everything my dashboard needs" workflows.

### Documentation
- Each exposure gets a dedicated page in the docs site (and dbt Explorer/Catalog).
- The `url` field activates the "View this exposure" link in docs.
- Marked with an orange **EXP** indicator in the DAG visualization.

### Data health tiles
Cloud generates **data health tiles** for exposures — at-a-glance freshness/test status that you can embed in BI tools.

## Maturity values
- `high` — well-established, widely trusted (executive dashboards).
- `medium` — useful but not yet broadly relied on.
- `low` — new/experimental.

Used purely for organization/communication; doesn't change behavior.

## Where exposures should live (per CP3 structure guide)
Generally next to the marts they consume:
```
models/marts/finance/
├── _finance__models.yml
├── _finance__exposures.yml
├── orders.sql
└── payments.sql
```

## Operational patterns

```bash
# Build all upstreams of a critical dashboard before a release
dbt build --select +exposure:executive_summary

# Pre-deploy sanity: test everything any exposure depends on
dbt test --select +exposure:*

# What sources feed any exposure?
dbt ls --select "+exposure:*" --resource-type source
```

## Project-level enabled toggle
```yaml
# dbt_project.yml
exposures:
  +enabled: true              # or false to disable all exposures
```

## Key takeaways
- Exposures = downstream consumers (dashboards, ML, apps) declared in YAML.
- Five `type` values, `owner` required, `depends_on` lists upstream refs/sources/metrics.
- The `exposure:` selector + `+` operator builds/tests everything an exposure relies on.
- Render in docs site / Catalog; pair with health tiles for at-a-glance status.
- Live alongside the marts they consume, in `_<area>__exposures.yml`.

## Related
- Exposure properties (full reference / project-level config).
- `exposure:` node selection method.
- Data health tiles.
- *Test smarter — where should tests go?* (exposures inform test prioritization).
