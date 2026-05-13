# `dbt show`

**Source:** https://docs.getdbt.com/reference/commands/show
**Type:** Documentation · Checkpoint 1

## What it does
Compile a single resource (or an inline SQL query), execute it against the warehouse, and print a preview of the result rows to the terminal.

## What it can preview
- A **model** (single one only)
- A **test** (super useful for inspecting failing-row queries)
- An **analysis**
- An **arbitrary inline query** via `--inline`

Not supported: Python (`dbt-py`) models, multi-node selectors, selector methods, graph operators.

## Default behavior
- Prints the first **5 rows**.
- Always compiles and runs the *query* from source — even for a model that's already materialized. (It doesn't `select * from` the existing relation.)

## Key flags

### `--limit n`
Sets row count. The flag **modifies the SQL itself** (wraps the query in a `LIMIT n` CTE/subquery), so the warehouse only processes and returns `n` rows. This matters for large datasets — it's not just a display limit.

```bash
dbt show --select stg_orders --limit 20
```

### `--inline "..."`
Run ad-hoc SQL. Output goes to logs/terminal, not the warehouse.

```bash
dbt show --inline "select * from {{ ref('stg_orders') }} where status = 'returned'"
```

⚠️ Since inline SQL is arbitrary, **dbt can't guarantee it won't modify the warehouse**. Use a read-only profile/role to be safe:
```bash
dbt show --inline "select * from my_table" --profile my-read-only-profile
```

### `--output json` (and `--log-format json`)
Machine-readable output. `--output json` switches the rendered preview to JSON; `--log-format json` makes the *entire* log line machine-readable.

```bash
dbt show --inline "select 1" --output json --log-format json
```

Example response:
```json
{"data": {"is_inline": true, "preview": "[{\"ID\": 1}]", ...}}
```

## Killer use case: debug a failing test
```bash
$ dbt build -s "my_model_with_duplicates"
... Failure in test unique_my_model_with_duplicates_id ...

$ dbt show -s "unique_my_model_with_duplicates_id"
| unique_field | n_records |
| ------------ | --------- |
|            1 |         2 |
```
You're directly previewing the test's failing-row SQL — no need to go open the compiled `.sql` file in `target/`.

## Common patterns
```bash
# preview a model
dbt show --select stg_orders

# preview a model with 20 rows
dbt show --select stg_orders --limit 20

# preview a test's failing rows
dbt show --select unique_orders_order_id

# ad-hoc query
dbt show --inline "select count(*) from {{ ref('orders') }}"

# scripting/automation
dbt show --inline "select 1" --output json --log-format json
```

## Gotchas
- **One node at a time.** Selector methods and graph operators are ignored.
- **Always re-compiles & re-queries.** Even if the model just ran, `dbt show` doesn't read from the materialized relation.
- **`--inline` is arbitrary SQL.** Use read-only credentials if you don't trust yourself.
- **No Python models.**

## Key takeaways
- The fast way to peek at a model, test, or ad-hoc query without opening a SQL editor.
- `--limit` is pushed into the SQL — cheap on big tables.
- `--inline` makes it a SQL REPL; pair with a read-only profile.
- Most powerful when chained with `dbt build` to debug failing tests.

## Related
- `dbt test` — generates the failing-row queries that `show` previews.
- `dbt compile` — when you want the SQL but not a result preview.
- Node selection syntax (single-node form).
