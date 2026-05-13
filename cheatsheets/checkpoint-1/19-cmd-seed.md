# `dbt seed`

**Source:** https://docs.getdbt.com/reference/commands/seed
**Type:** Documentation · Checkpoint 1

## What it does
Loads small static CSV files from `seed-paths` (default: `seeds/`) into the warehouse as tables. Use for version-controlled reference data that lives with the project — country codes, region mappings, business categories — not for source data (use an EL tool for that).

## How it works
- Each CSV becomes a table named after the file (`country_codes.csv` → `country_codes`).
- Column types are inferred or configurable via seed configs.
- Reference seeds with `{{ ref('country_codes') }}` like any model.

## Common commands

```bash
# All seeds
dbt seed

# One seed
dbt seed --select "country_codes"

# Multiple seeds, with full refresh
dbt seed --select "country_codes state_codes" --full-refresh
```

Selection: standard node selection syntax — paths, tags, graph operators.

Global flags: all dbt globals — `--threads`, `--target`, logging, etc.

## `--full-refresh`
Forces a clean reload of the seed (drop + recreate from CSV) rather than an incremental update.

Use when:
- The CSV's column names or types changed.
- You want consistent state across environments after a seed change.
- You just want to be sure you've blown away the old version.

```bash
dbt seed --full-refresh
dbt seed --select "country_codes" --full-refresh
```

## `--empty` (v1.12+)
Creates the seed table with the right schema **but zero rows**. Column names/types are inferred from the CSV.

```bash
dbt seed --empty
dbt seed --select country_codes --empty
```

Use for:
- CI/dev environments where you need the table to exist for downstream models or unit tests, without the cost of loading the data.
- Schema-only validation runs that pair with `dbt run --empty` / `dbt build --empty`.

## Example output
```
14:46:15 | 1 of 1 START seed file analytics.country_codes...     [RUN]
14:46:15 | 1 of 1 OK loaded seed file analytics.country_codes... [INSERT 3 in 0.01s]
14:46:16 | Finished running 1 seed in 0.14s.
```

## Artifacts
Produces a `run_results.json` entry per seed for inspection/troubleshooting.

## When NOT to use seeds
- Loading source data from an external system — use an EL tool (Fivetran, Airbyte, custom Python). Seeds aren't a data-ingest pipeline.
- Big files. Seeds are designed for tens of rows up to a few thousand — keep it lookup-table-sized.
- Anything that changes outside source control. Seeds are versioned alongside your project.

## Configuring seeds
- Folder path: `seed-paths` in `dbt_project.yml`.
- Column types / quoting / database / schema: under `seeds:` in `dbt_project.yml` or in a seed YAML's `config:` block.
- See *Seed configurations* reference for the full key list.

## Common patterns
```bash
dbt seed                                          # load all seeds
dbt seed --select "country_codes"                 # one seed
dbt seed --full-refresh                           # rebuild all
dbt seed --select my_seed --empty                 # schema-only
dbt build                                         # seeds + models + tests + snapshots
```

## Key takeaways
- Seeds = small CSVs versioned in your project, loaded into the warehouse as tables.
- Reference with `{{ ref('seed_name') }}`.
- `--full-refresh` rebuilds from scratch (use after CSV schema changes).
- `--empty` (v1.12+) creates the table with no rows — for CI/unit tests.
- Don't use seeds for source data — use a proper EL tool.

## Related
- Seed configurations (column types, quoting, paths).
- `Add Seeds to your DAG` build docs.
- `dbt build` — integrated runner that includes seeds.
