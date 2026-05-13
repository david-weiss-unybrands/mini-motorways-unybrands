# Python Models

**Source:** https://docs.getdbt.com/docs/build/python-models
**Type:** Documentation · Checkpoint 1

## What it is
A dbt Python (`dbt-py`) model is a `.py` file in `models/` whose `model()` function returns a DataFrame. dbt persists that DataFrame as a table in your warehouse. Python models join the same DAG as SQL models — same `ref`, same tests, same documentation, same lineage.

## Supported platforms
- Snowflake (Snowpark)
- BigQuery
- Databricks (PySpark)

Python models for Snowflake/BigQuery/Databricks are also supported in Fusion.

## Anatomy of a Python model
```python
# models/my_python_model.py
def model(dbt, session):
    upstream_df = dbt.ref("stg_orders")
    upstream_src = dbt.source("jaffle_shop", "customers")

    # transformations you couldn't do in SQL
    final_df = ...

    return final_df
```

**Two required arguments**:
- `dbt` — a class dbt builds for each model. Provides `dbt.ref()`, `dbt.source()`, `dbt.this()`, `dbt.is_incremental`, `dbt.config()`, `dbt.config.get()`, `dbt.config.meta_get()`.
- `session` — the platform's connection (Snowpark, BigFrames, SparkSession). dbt passes it in explicitly.

**Required return**: a single DataFrame.
- Snowflake: Snowpark or pandas
- BigQuery: BigFrames, pandas, or Spark
- Databricks: Spark, pandas, or pandas-on-Spark

## Materializations
Only **table** (default) and **incremental**. No view, no ephemeral. (Ephemeral refs aren't supported either.)

```python
def model(dbt, session):
    dbt.config(materialized="incremental")
    df = dbt.ref("upstream_table")

    if dbt.is_incremental:
        max_from_this = f"select max(updated_at) from {dbt.this}"
        df = df.filter(df.updated_at >= session.sql(max_from_this).collect()[0][0])

    return df
```

Incremental strategies are adapter-dependent. BigQuery/Dataproc: `merge` works, `insert_overwrite` does not.

## Configuration

### Three options
1. `dbt_project.yml` (folder-wide).
2. A `.yml` properties file.
3. `dbt.config()` inside the model.

`dbt.config()` only accepts **literal** values — strings, bools, numbers — plus dynamic config access. No functions, no nested data. dbt parses it statically.

### YAML config with column tests + custom tests
```yaml
models:
  - name: my_python_model
    description: My Python transformation
    config:
      materialized: table
      tags: ['python']
    columns:
      - name: id
        data_tests:
          - unique
          - not_null
    data_tests:
      - custom_generic_test
```

### Accessing vars, env_vars, target
Set them through YAML config (Jinja-rendered there), then read via `dbt.config.get()`:
```yaml
models:
  - name: my_python_model
    config:
      target_name: "{{ target.name }}"
      specific_var: "{{ var('SPECIFIC_VAR') }}"
```
```python
def model(dbt, session):
    if dbt.config.get("target_name") == "dev":
        df = dbt.ref("fct_orders").limit(500)
```

### Accessing meta
```yaml
config:
  meta:
    custom_value: "111"
```
```python
value = dbt.config.meta_get("custom_value")
# or
value = dbt.config.get("meta", {}).get("custom_value")
```

### Dynamic config (v1.8+)
```python
print(f"my_var = {dbt.config.get('my_var')}")
```

## What you get from `dbt`
- `dbt.ref("model")` → upstream DataFrame.
- `dbt.source("src","tbl")` → source DataFrame.
- `dbt.this`, `dbt.this.database`, `.schema`, `.identifier` → current model location.
- `dbt.is_incremental` → boolean (true on incremental rebuilds, not initial).
- `dbt.config(...)`, `dbt.config.get(...)`, `dbt.config.meta_get(...)`.

## Execution model
Code runs **remotely on the data platform**, not on the dbt host. dbt separates definition from execution. You declare *what*; the warehouse runs *how*.

## Limits / gotchas
- No Jinja in `.py` files — context comes from the `dbt` argument.
- Can't `ref()` ephemeral models.
- `dbt.config()` is static — no dynamic Python at config time.
- `dbt show` does not support Python models.
- Adapter-specific incremental strategies; check per-platform docs.

## Referencing Python from SQL
Totally fine:
```sql
-- models/downstream.sql
with up as (
    select * from {{ ref('my_python_model') }}
)
...
```

## Key takeaways
- Python models = `.py` files defining `model(dbt, session)` that return a DataFrame.
- Supported on Snowflake, BigQuery, Databricks (and Fusion).
- Materializations: only `table` and `incremental`.
- `dbt.ref()` / `dbt.source()` instead of Jinja; `dbt.config.get()` for vars/env/target.
- Tests, docs, lineage, selection — all the same as SQL models.

## Related
- Materializations doc — for the table/incremental limits.
- Incremental strategy — for adapter-specific options.
- Snapshots / tests — not supported in Python.
