# `dbt compile`

**Source:** https://docs.getdbt.com/reference/commands/compile
**Type:** Documentation · Checkpoint 2

## What it does
Generates executable SQL for models, data tests, analyses, functions (and, in v1.12+, snapshots) **without executing it against the warehouse**. The output lands in `target/`.

## What you can compile
- Models (v1.7+)
- Data tests
- Analyses
- Functions (UDFs)
- Snapshots (v1.12+)

## Why use it
- **Inspect compiled SQL** — verify Jinja, macros, and refs resolved correctly.
- **Manually run a model's SQL** — copy the compiled `select` and execute in your warehouse client to debug a database error.
- **Render analyses** — the only way to materialize their SQL (analyses aren't built by `dbt run`).

## Common misconceptions
- ❌ `dbt compile` is NOT required before `dbt run`/`dbt build`/`dbt test`. Those commands compile internally.
- ❌ Use `dbt parse` (not `compile`) if you only want to validate that the project loads, no warehouse connection involved.

## Interactive compile (v1.5+)
Print compiled SQL directly to the terminal — useful for one-offs.

### `--select` a single named node
```bash
dbt compile --select stg_orders
```
Output:
```
Compiled node 'stg_orders' is:
with source as (
    select * from "jaffle_shop"."main"."raw_orders"
), renamed as (
    select id as order_id, user_id as customer_id, order_date, status
    from source
)
select * from renamed
```

### `--inline` an arbitrary dbt-SQL query
```bash
dbt compile --inline "select * from {{ ref('raw_orders') }}"
```
Output:
```
Compiled inline node is:
select * from "jaffle_shop"."main"."raw_orders"
```

Both forms also write to `target/` in addition to printing.

## Performance/connection flags

### `--no-populate-cache` (dbt-level flag)
Skips initial cache population of warehouse metadata. If metadata is later needed, dbt incurs a cache miss and queries the warehouse on demand.
```bash
dbt --no-populate-cache compile --select my_model
```

### `--no-introspect` (compile-level flag)
Disables introspective queries. If a resource definition requires running one (e.g., to expand `*` to column names), dbt raises an error rather than connecting.
```bash
dbt compile --no-introspect
```

⚠️ When models use introspective queries (`run_query`, `get_columns_in_relation`, etc.), compiled SQL depends on warehouse metadata. Compilation may be incomplete or inconsistent depending on the warehouse state at compile time.

## Where the SQL lives
| Folder | Contains |
|---|---|
| `target/compiled/<project>/<path>/<model>.sql` | The bare compiled `select` |
| `target/run/<project>/<path>/<model>.sql` | The compiled SQL wrapped in materialization DDL (`create table as`, `merge into`, etc.) |

Use the **compiled** version for ad-hoc query/debug; the **run** version to see exactly what dbt would send.

## Common patterns
```bash
# Compile everything
dbt compile

# Just one model
dbt compile --select stg_orders

# A test
dbt compile --select unique_stg_orders_order_id

# Ad-hoc Jinja
dbt compile --inline "select count(*) from {{ ref('stg_orders') }} where status = 'returned'"

# Compile without hitting the warehouse for metadata
dbt --no-populate-cache compile --no-introspect

# Compile snapshots (v1.12+) — generates SQL with dbt_valid_from/to logic
dbt compile --select my_snapshot
```

## Compile vs run vs build vs parse

| Command | Compiles SQL | Connects to warehouse | Executes SQL |
|---|---|---|---|
| `dbt parse` | ❌ (syntax check only) | ❌ | ❌ |
| `dbt compile` | ✅ | usually (for cache/introspection) | ❌ |
| `dbt run` | ✅ | ✅ | ✅ (models only) |
| `dbt build` | ✅ | ✅ | ✅ (everything) |

## Key takeaways
- `dbt compile` renders compiled SQL into `target/` without executing.
- Two ways to inspect in-terminal: `--select <node>` and `--inline "<sql>"`.
- Not a prerequisite for `run`/`build`/`test` — they compile internally.
- For pure project parsing without warehouse access, use `dbt parse`.
- For metadata-free compile, combine `--no-populate-cache` and `--no-introspect`.
- v1.12+ extends compile to snapshots.

## Related
- `dbt parse` — parse-only validation.
- `dbt show` — compile + execute + preview rows.
- Debugging errors guide — the consumer of compile output.
