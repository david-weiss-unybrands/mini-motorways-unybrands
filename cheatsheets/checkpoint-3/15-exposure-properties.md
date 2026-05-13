# Exposure Properties

**Source:** https://docs.getdbt.com/reference/exposure-properties
**Type:** Documentation · Checkpoint 3

## What it is
The full reference for the YAML shape of an exposure. The build doc (`exposures.md`) shows the common case; this is the complete property list.

## Where they live
Inside a properties YAML under `models/` (any depth). You can put `exposures:` in the same YAML file as `sources:` and `models:`, or in a dedicated `_<area>__exposures.yml`. File name is up to you; the file just needs to be under `model-paths`.

## Full schema

```yaml
exposures:
  - name: <snake_case_name>             # required — only letters, numbers, underscores
    description: <markdown_string>      # optional
    type: dashboard | notebook | analysis | ml | application    # required
    url: <string>                       # optional — activates "View this exposure" link
    maturity: high | medium | low       # optional — communicates stability
    enabled: true | false               # optional (also configurable in dbt_project.yml)
    config:                             # v1.10: tags and meta moved under config
      tags: ['nightly', 'critical']
      meta: {owner_team: 'finance', tier: 1}
      enabled: true | false             # alternative location for enabled
    owner:                              # required — at least 'name' or 'email'
      name: <string>
      email: <string>
    depends_on:                         # expected — list of refs/sources/metrics
      - ref('model')
      - ref('seed')
      - source('source_name', 'table_name')
      - metric('metric_name')
    label: <human-friendly name>        # optional — title-cased / with spaces
```

## Name vs label
- **`name`** — machine identifier. snake_case only. Used in CLI selectors (`--select exposure:my_name`).
- **`label`** — display string for the docs site. Can have spaces, capitals, special characters.

## Worked examples (different types)

```yaml
exposures:
  - name: weekly_jaffle_metrics
    label: Jaffles by the Week
    type: dashboard
    maturity: high
    url: https://bi.tool/dashboards/1
    description: "Weekly KPIs for jaffle sales."
    depends_on:
      - ref('fct_orders')
      - ref('dim_customers')
      - source('gsheets', 'goals')
      - metric('count_orders')
    owner:
      name: Callum McData
      email: data@jaffleshop.com

  - name: jaffle_recommender
    type: ml
    maturity: medium
    url: https://jupyter.org/mycoolalg
    description: "Discover Sandwiches Weekly recommender."
    depends_on:
      - ref('fct_orders')
    owner:
      name: Data Science Drew
      email: data@jaffleshop.com

  - name: jaffle_wrapped
    type: application
    description: "End-of-year favorites recap for users."
    depends_on: [ ref('fct_orders') ]
    owner: { email: summer-intern@jaffleshop.com }
```

## Project-level config

Currently only `enabled` is supported at the project level:

```yaml
# dbt_project.yml
exposures:
  +enabled: true
```

You can scope it to a directory if you organize exposure YAMLs into subfolders:
```yaml
exposures:
  +enabled: true
  experimental:
    +enabled: "{{ target.name == 'dev' }}"
```

## v1.10 config-vs-property change
Pre-v1.10, `tags` and `meta` were top-level keys. In v1.10+ they live under `config:`:
```yaml
exposures:
  - name: ...
    config:
      tags: ['critical']
      meta: {tier: 1}
```
Set `enabled` either at top level or inside `config:` — both supported.

## Where the URL leads
When `url` is set, the rendered docs page gets a "View this exposure" link to that URL — typically the dashboard or notebook the exposure represents. Use it; reviewers and consumers click it.

## `description` rendering
Markdown is supported. Use it to document:
- The audience.
- What questions the exposure answers.
- Refresh cadence and SLA.
- Known caveats / limitations.

For complex descriptions, use doc blocks:
```yaml
description: "{{ doc('exposure_weekly_jaffle_metrics') }}"
```
With the doc block in a `_<dir>__docs.md`:
```markdown
{% docs exposure_weekly_jaffle_metrics %}
## Weekly Jaffle Metrics
This dashboard tracks weekly KPIs ...
{% enddocs %}
```

## What you cannot put on an exposure
- `columns` — exposures have no columns; they're not tables.
- `data_tests` — exposures aren't tested directly. Test the resources they depend on.
- `materialized` — exposures aren't materialized; they're references.

## Key takeaways
- Required: `name` (snake_case), `type` (5 options), `owner` (with name or email).
- Expected: `depends_on` (refs/sources/metrics).
- Optional: `label`, `url`, `maturity`, `description`, plus `config: {tags, meta, enabled}`.
- v1.10+: `tags`/`meta` moved under `config:`.
- Project-level `+enabled` for batch toggling.
- Use `label` for display, `name` for machine identifier; doc blocks for rich descriptions.

## Related
- Exposures (the build doc).
- `exposure:` node selection method.
- Doc blocks for description re-use.
- Data health tiles (Cloud feature on top of exposures).
