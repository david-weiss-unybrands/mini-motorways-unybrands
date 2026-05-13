# `dbt snapshot`

**Source:** https://docs.getdbt.com/reference/commands/snapshot
**Type:** Documentation · Checkpoint 1

## What it does
Executes the snapshots defined in your project — generating **Type-2 Slowly Changing Dimension** records that track how source data changes over time.

## What is a snapshot?
A snapshot captures the state of a row each time the source changes, preserving history that the source itself overwrites destructively. Each row gets `dbt_valid_from`/`dbt_valid_to` timestamps so you can reconstruct point-in-time views.

## Where snapshots live
- Defined in **YAML** with a `strategy` (`timestamp` or `check`) and a `unique_key`.
- dbt looks in the directories listed under `snapshot-paths` in `dbt_project.yml`. Default: `snapshots/`.
- You can list multiple paths.

## Schedule
Run `dbt snapshot` regularly (typically daily) so changes are captured between runs. If a row changes twice between snapshot runs, you only see the latest version — frequency drives fidelity.

## Usage

```bash
dbt snapshot                                # all snapshots
dbt snapshot --select my_snapshot           # one snapshot
dbt snapshot --select tag:nightly           # by tag
dbt snapshot --exclude my_snapshot
dbt snapshot --help                         # full options
```

### Selection
Use `--select` / `--exclude` with standard node selection syntax (graph operators, methods, tags). See *Node selection syntax* for the full grammar.

### Global flags
Honors all standard global flags — `--threads`, `--target`, `--profile`, `--profiles-dir`, logging options. See "About flags (global configs)" for the list.

## Snapshot vs `dbt build`
- Snapshots can be run via `dbt build` (in DAG order with everything else) — usually what you want in production.
- Use `dbt snapshot` directly when you specifically want to capture history without re-running models/tests/seeds (e.g., a separate "capture state every 15 min" job, with a slower model-build job running hourly).

## Output
- Each snapshot becomes a table in the warehouse with the snapshot's name (in the configured snapshot schema/database).
- Added columns: `dbt_valid_from`, `dbt_valid_to` (and a `dbt_scd_id` hash).
- Rows are inserted, never deleted; the open/active version has `dbt_valid_to IS NULL`.

## Common operational pattern
A typical setup:
- `dbt snapshot` on a 15- or 30-minute cron — fast, lightweight, captures change history.
- `dbt build` on an hourly cron — runs models that read from those snapshots.

## Gotchas
- Snapshots are stateful — they read the *current* snapshot table to decide what changed. Don't drop or alter them by hand.
- `unique_key` must be truly unique in the source at any given moment; ambiguity causes duplicate history rows.
- The `check` strategy compares specified columns; the `timestamp` strategy uses an `updated_at` column. Pick the one that matches how your source signals changes.

## Key takeaways
- `dbt snapshot` runs all snapshots in your project — capturing Type-2 SCD history of source data.
- Defined in YAML with `strategy` + `unique_key`; lives in `snapshots/` by default.
- Run on a schedule appropriate to how fast your source changes.
- Use `dbt build` in prod to integrate with the rest of the DAG; `dbt snapshot` standalone for capture-only jobs.

## Related
- Snapshots (build docs) — full reference on `strategy`, `unique_key`, `check_cols`, etc.
- Snapshot configs reference.
- `dbt build` — the integrated runner.
