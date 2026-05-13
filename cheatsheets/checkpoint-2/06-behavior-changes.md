# Behavior Changes (Flags)

**Source:** https://docs.getdbt.com/reference/global-configs/behavior-changes
**Type:** Documentation · Checkpoint 2

## What they are
A specific category of dbt flags that **opt projects into new runtime behaviors gradually**. They give a migration window between an old behavior and a new, better one. Set in the `flags:` dictionary in `dbt_project.yml`.

In **dbt Fusion**, all behavior-change flags are removed — the new behavior is always on. Read this doc primarily for Core 1.x and dbt Latest release track migrations.

## Why they exist
- **Better defaults for new users** without breaking existing projects overnight.
- **Migration window for existing projects** — opt in when ready, see warnings until you do.
- **Maintainability for dbt itself** — every branching behavior is testing/cognitive overhead; flags are meant to be temporary.

## The lifecycle (three phases)
1. **Introduction** — new behavior gated behind flag, **disabled by default**. Old behavior preserved.
2. **Maturity** — default flips to `true`. New behavior is the default. You can still opt out (`false`) to keep old behavior, but you'll see deprecation warnings.
3. **Removal** — flag and old behavior deleted from dbt entirely. Significant advance notice given.

## What counts as a "behavior change"
Same project code + same command → different result.

Examples:
- dbt newly raises a validation **error** (not a warning).
- Built-in macro signature changes (your custom override may break).
- Adapter renames/removes a method on `{{ adapter }}`.
- Breaking change to artifact JSON contract (removed required field, etc.).
- Removed structured-log field.

**Not** behavior changes:
- Bug fixes (the prior behavior was defective).
- New **warnings** (not errors).
- Updated human-readable log strings.
- Non-breaking artifact additions.

## Where to set them
`dbt_project.yml`, under `flags:`. They're project-code-adjacent, so they belong in version control with PR review.

```yaml
flags:
  require_explicit_package_overrides_for_builtin_materializations: true
  require_resource_names_without_spaces: true
  source_freshness_run_project_hooks: true
  skip_nodes_if_on_run_start_fails: false
  state_modified_compare_more_unrendered_values: false
  validate_macro_args: false
  require_generic_test_arguments_property: true
  # ... many more
```

To opt out of a matured flag (keep old behavior): set its value to `false`. You'll see warnings — either fix the underlying issue (flag → `true`) or suppress via `warn_error_options.silence`.

## Examples of common behavior-change flags

| Flag | Effect when `true` |
|---|---|
| `require_explicit_package_overrides_for_builtin_materializations` | Packages can't silently override `table`/`view`/`incremental` etc. |
| `require_resource_names_without_spaces` | Spaces in model names raise an error |
| `source_freshness_run_project_hooks` | `dbt source freshness` runs `on-run-start`/`-end` hooks |
| `skip_nodes_if_on_run_start_fails` | Failed `on-run-start` hook skips selected resources |
| `state_modified_compare_more_unrendered_values` | Compare unrendered values during `state:modified` — reduces false positives across envs |
| `require_yaml_configuration_for_mf_time_spines` | MetricFlow time spine must be in YAML, not a SQL config block |
| `require_batched_execution_for_custom_microbatch_strategy` | Custom microbatch macros run in batches |
| `validate_macro_args` | dbt validates macro call arguments against declarations |
| `require_generic_test_arguments_property` | Generic tests must use `arguments:` instead of inline kwargs |
| `enable_truthy_nulls_equals_macro` | Null-safe equality macro behavior |

## Adapter-specific flags
Adapters (Databricks, Redshift, BigQuery, Snowflake) ship their own behavior-change flags too — for things like `use_info_schema_for_columns` (Databricks), `redshift_skip_autocommit_transaction_statements`, `bigquery_use_batch_source_freshness`, `snowflake_default_transient_dynamic_tables`. Same lifecycle pattern; same `flags:` block.

## Practical migration playbook
1. After upgrading, look for deprecation warnings in your run logs.
2. For each flag with TBD maturity: assess whether you can adopt now.
3. To adopt: fix the underlying issue, set the flag to `true`, confirm builds pass.
4. To defer: set explicitly to `false` so the warning doesn't surprise you when the default flips later.
5. Track deprecation/email notifications — they're sent before maturity dates.

## Key takeaways
- Behavior-change flags = controlled migration mechanism for breaking changes.
- Three phases: introduction → maturity → removal.
- Configure in `flags:` block of `dbt_project.yml`.
- Default `true` = the new behavior is on; set `false` to revert (you'll see warnings).
- **Fusion removes them entirely** — new behavior always wins.

## Related
- Deprecations index (`/reference/deprecations`).
- About global configs (the broader flag system).
- `warn_error_options` (silencing matured-but-opted-out warnings).
- Upgrading guides per dbt release.
