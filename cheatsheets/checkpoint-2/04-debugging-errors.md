# Debugging Errors

**Source:** https://docs.getdbt.com/guides/debug-errors
**Type:** Documentation · Checkpoint 2

## The general debugging loop
1. **Read the error message.** dbt error messages name the error *type* and the *file* where it happened.
2. **Open the offending file.** Often the fix is obvious.
3. **Isolate.** Run one model at a time; revert the change that broke things.
4. **Use compiled files and logs.**
   - `target/compiled/` — `select` statements you can run in any SQL editor.
   - `target/run/` — the SQL dbt executes (with materialization wrappers).
   - `logs/dbt.log` — all queries dbt ran, plus structured logging. **Recent errors at the bottom.**
   - dbt Cloud: use the `Details` tab in command output.
5. **Ask for help** — but write a good question first.

## Error types (by execution phase)

| Phase | What dbt is doing | Error type |
|---|---|---|
| Initialize | Confirm this is a dbt project + can reach the warehouse | `Runtime Error` |
| Parsing | Validate Jinja in `.sql`, YAML in `.yml` | `Compilation Error` |
| Graph validation | Build dependency graph, check it's acyclic | `Dependency Error` |
| SQL execution | Run the models | `Database Error` |

## Runtime Errors (initialization)

### "Not a dbt project"
Missing `dbt_project.yml` in CWD or parents.
- `pwd` to check directory.
- `ls` to confirm `dbt_project.yml` is there.

### "Could not find profile"
The `profile:` key in `dbt_project.yml` doesn't match any block in `profiles.yml`. Usually a typo (singular vs plural). Run `dbt debug --config-dir` to locate `profiles.yml`.

### "Failed to connect"
Credentials wrong. Update `profiles.yml`, then `dbt debug` to test:
```bash
dbt debug
# Connection test: OK connection ok
```

### Invalid `dbt_project.yml`
"Additional properties are not allowed ('hello' was unexpected)" — you have a key dbt doesn't recognize. Either remove/rename it, or check `dbt --version` (key may belong to a newer release).

## Compilation Errors (parsing)

### Invalid `ref`
"depends on a node named 'stg_customer' which was not found" — typo on a model name. Open the SQL file, fix the `ref()` argument, or rename the upstream file.

### Invalid Jinja
"Reached EOF without finding a close tag" — missing `{% endmacro %}`, `{% endif %}`, `}`, etc. Read the line number in the error.

### Invalid YAML
Indentation error → the YAML parser can't build a dict. Use:
- Indentation guides in your editor.
- A YAML validator (yamllint, yamllint.com).

### Incorrect YAML spec
YAML is well-formed but uses a key dbt doesn't recognize for that resource. Check the reference for the resource type.

## Dependency Errors (graph)
- **Circular dependency** — Model A `refs` Model B which `refs` Model A. Break the cycle (often by pulling a shared concept up into an intermediate).
- **Disabled model still referenced** — A disabled model can't be `ref`'d. Either enable it or remove the reference.

## Database Errors (execution)
The warehouse rejected the SQL dbt sent.
- Read the warehouse-specific error in the dbt error message.
- Open `target/run/<model>.sql` (the exact SQL dbt sent) and try it in your warehouse client.
- Common causes: type mismatch, missing column, permissions, syntax dialect difference.

## Useful commands for debugging

| Command | What it tells you |
|---|---|
| `dbt debug` | Project setup + connection test |
| `dbt debug --config-dir` | Where your `profiles.yml` lives |
| `dbt parse` | Parse without executing — finds syntax errors fast |
| `dbt compile --select my_model` | Renders the SQL to `target/compiled/` |
| `dbt compile --inline "..."` | Compile arbitrary Jinja-SQL inline |
| `dbt show --select unique_my_model_id` | Preview a failing test's results |
| `dbt run --select my_model --debug` | Verbose log output |
| `dbt run --fail-fast` | Stop at first error |

## Pro tips
- Always compile before running on big projects — it's cheap and catches Jinja errors.
- For models with stacked views/ephemerals, an SQL error can appear in a downstream model that's "really" caused upstream. Temporarily materialize the chain as `table` to surface the error where it originated.
- Keep `dbt.log` open in a separate terminal pane during debugging — `tail -f`.
- `dbt show` is the fastest way to see what a failing test query actually returns.

## Key takeaways
- Four error types map to four phases of execution — error type tells you where to look.
- `target/compiled/` and `target/run/` are your friends — the SQL dbt actually generated.
- `dbt.log`, `--debug`, and `dbt debug` cover most setup issues.
- For database errors, copy the SQL out of `target/run/` and run it manually.
- `dbt show` lets you peek at the rows behind any test or model.

## Related
- `dbt compile` (inspect generated SQL).
- `dbt show` (preview results).
- `dbt parse` (fast parse-only check).
- Global configs / `--debug`, `--fail-fast`.
