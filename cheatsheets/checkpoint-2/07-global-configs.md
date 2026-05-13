# About Flags (Global Configs)

**Source:** https://docs.getdbt.com/reference/global-configs/about-global-configs
**Type:** Documentation · Checkpoint 2

## What they are
"Flags" (a.k.a. global configs) control **how** dbt runs — log levels, fail-fast behavior, partial parsing, color output, caching, defer, threads, target, etc. They differ from **resource configs** (which describe **what** to build).

## Where you can set them
Three layers. Most flags can be set in more than one; CLI > env var > project.

1. **CLI option** at invocation time (`--full-refresh`, `--debug`).
2. **Environment variable** — `DBT_FOO` (v1.10 and earlier) or `DBT_ENGINE_FOO` (v1.11+).
3. **`dbt_project.yml` `flags:` block**.

```yaml
# dbt_project.yml
flags:
  fail_fast: true
  partial_parse: true
  use_colors: true
  warn_error_options:
    include: all
    silence: ["NoNodesForSelectionCriteria"]
```

Some flags can **only** live in `dbt_project.yml`. Some can **only** be set per-invocation. The reference table in this doc lists each flag's allowed locations.

## Accessing flags from Jinja
The `flags` context variable exposes flag values inside templates:
```yaml
on-run-start:
  - '{{ log("I will stop at the first sign of trouble", info=true) if flags.FAIL_FAST }}'
```

⚠️ Don't use `flags` to drive `ref`/`source`/configurations that dbt resolves at parse time — flags can vary per invocation, parse-time resolution can't.

## Commonly used flags (quick reference)

| Flag | Type | What it does |
|---|---|---|
| `target` (`--target dev`) | string | Which target/profile to use |
| `profile` | string | Which top-level profile in `profiles.yml` |
| `debug` (`--debug`) | bool | Verbose logging |
| `fail_fast` (`-x`) | bool | Stop on first error |
| `full_refresh` (`--full-refresh`) | bool | Force-rebuild incremental models |
| `empty` (`--empty`) | bool | Build schemas with no rows |
| `sample` (`--sample`) | string | Time-bounded sample data |
| `partial_parse` | bool (default true) | Reuse parser state across runs for speed |
| `populate_cache` | bool (default true) | Warm warehouse metadata cache |
| `introspect` | bool (default true) | Allow introspective queries during compile |
| `defer` / `state` / `favor_state` | bool/path | Slim CI defer pattern |
| `warn_error` / `warn_error_options` | bool/dict | Treat warnings as errors |
| `store_failures` | bool | Persist failing test rows to a table |
| `printer_width` | int | Console width for output |
| `use_colors` | bool | Colored output |
| `write_json` | bool | Write `manifest.json` etc. |
| `log_level` / `log_format` / `log_path` | enum/path | Log shaping |
| `quiet` | bool | Suppress non-error logs |
| `resource-type` / `--exclude-resource-type` | string | Filter what runs |
| `event_time_start` / `event_time_end` | datetime | Microbatch backfill window |
| `cache_selected_only` | bool | Cache only nodes you selected |

## CLI vs project — when each makes sense
- **CLI**: per-invocation overrides — `--target prod`, `--full-refresh`, `-x` to fail fast.
- **Env var**: CI/CD secrets (`DBT_PROFILES_DIR`) and consistent invocation context (`DBT_TARGET=prod`).
- **`dbt_project.yml`**: durable defaults the team needs every time (`partial_parse: true`, `printer_width: 120`).

## Targets (`--target`)
Run the same code against different environments:
```bash
dbt run --target dev
dbt run --target prod
dbt build --target staging
```
Targets live in `profiles.yml`. Without `--target`, dbt uses the profile's default target.

## The v1.11+ env-var rename
Starting v1.11, env vars are prefixed `DBT_ENGINE_` instead of `DBT_` (e.g., `DBT_ENGINE_FAIL_FAST` vs `DBT_FAIL_FAST`). Functional behavior is identical. v1.10 and earlier still use `DBT_`.

## Behavior change flags (related but distinct)
There's a separate category of flags called **behavior changes** that gate migration between old and new dbt behaviors. They have a strict lifecycle (intro → maturity → removal) and live in the same `flags:` block. See *Behavior changes* cheat sheet.

## High-impact recipes

```bash
# Slim CI
dbt build --select state:modified+ --defer --state path/to/prod

# Diagnose a flaky build with full logs
dbt --debug build --log-level debug --fail-fast

# CI-friendly: warnings become errors
dbt build --warn-error

# Zero-cost compile validation
dbt build --empty

# Store failing test rows for inspection
dbt test --store-failures
```

## Key takeaways
- Flags = how dbt runs; resource configs = what dbt builds.
- Set in three places: CLI, env var, `dbt_project.yml`. CLI overrides env overrides project.
- Use `flags` Jinja var to read values in macros/hooks (but not at parse-time-resolved configs).
- Each flag's reference page lists where it can be set, env-var name, and CLI form.
- v1.11+ rename: `DBT_FOO` → `DBT_ENGINE_FOO`.

## Related
- Behavior changes (cousin doc — migration-controlling flags).
- Environment variable configs.
- Slim CI pattern (uses defer/state/favor_state).
- `warn_error_options` (granular warning-to-error control).
