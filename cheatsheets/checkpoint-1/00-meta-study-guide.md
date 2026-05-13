# Checkpoint 1 — Build a Foundation (Meta Study Guide)

> Synthesized exam-prep guide for Checkpoint 1. Reorganizes the 29 per-resource cheat sheets by topic so concepts cluster and cross-reference cleanly.

## The shape of Checkpoint 1
CP1 is **the dbt mental model**. Every other checkpoint assumes you have:
- A worldview (the Viewpoint).
- A project structure (How we structure).
- Sources, models, materializations, and the run/build/test/seed/snapshot/docs commands.
- Awareness of incremental models and the v1.10+ `--empty` / `--sample` flags.

Read this guide top-to-bottom. Each section links to the deeper per-resource sheets in this directory.

---

## 1. The dbt worldview

**Read first:** `01-dbt-viewpoint.md`

dbt was conceived to fix analytics workflows by **borrowing software engineering practices**:
- Version control everything; code review every change.
- Separate dev and prod environments with SLAs.
- Modularity: a table's schema is its public interface; `ref()` is the implementation.
- Tests, docs, deprecation processes — like a real software project.
- Design for **maintainability** — most cost is in maintenance.

Every dbt feature (refs, sources, tests, docs, environments, contracts) traces back to a Viewpoint principle. When the exam asks *why* dbt does something, the answer usually lives here.

---

## 2. Project structure (the most-questioned topic)

**Read in order:**
- `02-how-we-structure-overview.md` — the arc and three layers.
- `03-how-we-structure-staging.md` — atoms.
- `04-how-we-structure-intermediate.md` — molecules.
- `05-how-we-structure-marts.md` — cells / entities.
- `06-how-we-structure-rest.md` — YAML, auxiliary folders, project splitting.

### The arc you must internalize
**Source-conformed → business-conformed.** Every other rule serves this trajectory.

| Layer | Atoms / molecules / cells | Group by | Default materialization | Allowed transforms |
|---|---|---|---|---|
| **staging** | atoms | source system | view | rename, cast, basic compute, categorize. **No joins** (use `base/`), **no aggregations** |
| **intermediate** | molecules | business area | ephemeral (or view in custom schema) | re-grain, isolate complexity, structurally simplify joins |
| **marts** | cells | department/domain | table → incremental | denormalize aggressively (unless on Semantic Layer) |

### Naming conventions
- Staging: `stg_[source]__[entity]s.sql` — **double underscore** between source and entity.
- Intermediate: `int_[entity]_[verb]s.sql` — verbs (`pivoted`, `summed`, `joined`).
- Marts: plain English by entity (`orders.sql`, `customers.sql`), no time-grain suffix.
- YAML: `_[directory]__models.yml`, `_[directory]__sources.yml`, `_[directory]__docs.md`.

### The `dbt_project.yml` config cascade
```yaml
models:
  jaffle_shop:
    staging: { +materialized: view }
    intermediate: { +materialized: ephemeral }
    marts:
      +materialized: table
      finance: { +schema: finance }
      marketing: { +schema: marketing }
```
Set defaults at the highest scope; override only where needed. Folders > tags. Tags mark exceptions.

### Other folders
- `seeds/` — small lookup tables (NOT source data — use EL).
- `analyses/` — Jinja queries, version-controlled, not built into the warehouse.
- `tests/` — singular tests (cross-model logic).
- `snapshots/` — SCD2 capture.
- `macros/` — DRY helpers; document each with `_macros.yml`.

### Project splitting
Use **dbt Mesh** when domains, governance (PII), or size demand it. Not for ML vs reporting — same source of truth.

---

## 3. Sources

**Read:** `08-sources.md`, `09-source-configs.md`.

A source is a named raw table you reference via `{{ source('src','tbl') }}` — only in staging models, 1:1 with source tables.

```yaml
sources:
  - name: jaffle_shop
    database: raw
    config:
      freshness:               # v1.9+ inside config
        warn_after:  {count: 12, period: hour}
        error_after: {count: 24, period: hour}
      loaded_at_field: _etl_loaded_at   # v1.10+ inside config
    tables:
      - name: orders
```

### Three big configs (v1.9+)
- `enabled` — toggle on/off (most common use: disabling sources from imported packages).
- `event_time` — column representing the actual event timestamp (powers microbatch and advanced CI).
- `meta` — free-form metadata.

### Why sources exist
- Lineage (`{{ source() }}` puts them in the DAG).
- Source freshness monitoring (`dbt source freshness`).
- One place to edit if upstream changes schema/location.

### Cross-references
- Source freshness mechanics → CP3 `cmd-source` cheat sheet.
- Source-driven builds → CP3 `state-selection` / `source_status:fresher+`.

---

## 4. Materializations

**Read:** `10-materializations.md`, `11-materializations-best-practices.md`.

### Five built-ins
| Materialization | Best for |
|---|---|
| view (default) | staging; cheap; always fresh |
| table | BI-queried marts; faster queries; full rebuild |
| incremental | event-style data; advanced; needs `unique_key` |
| ephemeral | DRY light transforms; inlined as CTE; **no contracts**, can't be ref'd from operations |
| materialized_view | warehouse-managed refresh (Snowflake uses Dynamic Tables instead) |

### The escalation ladder (memorize)
1. **View** → upgrade when **querying** is too slow.
2. **Table** → upgrade when **building** is too slow.
3. **Incremental** → only when full-refresh tables hurt.
4. (Optional sidestep) Materialized view if warehouse supports it.

Don't pre-optimize. Most models should never leave step 1 or 2.

### Python models
Only `table` and `incremental`. No view or ephemeral. Models live in `.py` files; `model(dbt, session)` returns a DataFrame. Use `dbt.ref()`, `dbt.source()`, `dbt.config.get()`, `dbt.is_incremental`. Snowflake/BigQuery/Databricks only (and Fusion). See `22-python-models.md`.

---

## 5. Commands

Read each per-command sheet for syntax depth; here's the synthesis.

### Production workhorses
- **`dbt build`** (`13-cmd-build.md`) — runs models, tests, snapshots, seeds (and v1.11+ UDFs) in DAG order. **Failing tests skip downstream**. Default for production.
- **`dbt run`** (`14-cmd-run.md`) — models only. `--full-refresh` forces incrementals to rebuild and makes `is_incremental()` return false everywhere.
- **`dbt test`** (`15-cmd-test.md`) — data + unit tests. Filter via `test_type:data` / `unit` / `generic` / `singular`. Standalone test reruns; use build for prod.

### Build-time previews
- **`dbt show`** (`17-cmd-show.md`) — compile + run + preview rows. Single node at a time. `--limit n` pushes into SQL. `--inline "..."` for ad-hoc Jinja-SQL. Best for inspecting failing tests.
- **`dbt compile`** — render SQL into `target/` without executing. Use to inspect, debug, or hand-execute. (CP2 sheet.)

### Data-type-specific
- **`dbt snapshot`** (`18-cmd-snapshot.md`) — runs Type-2 SCD snapshots. Usually run via `dbt build`.
- **`dbt seed`** (`19-cmd-seed.md`) — loads CSVs from `seeds/`. `--full-refresh` rebuilds; `--empty` (v1.12+) creates schema-only.
- **`dbt docs`** (`16-cmd-docs.md`) — `generate` builds docs site artifacts; `serve` hosts locally. Fusion replaces `generate` with `--write-catalog` on `run`/`build`/`compile`.

### Two universal "save warehouse spend" flags
- **`--empty`** (`28-empty-flag.md`) — zero rows for all refs/sources; SQL still runs. CI/compile validation.
- **`--sample`** (`29-sample-flag.md`) — time-bounded slice of real data. Needs `event_time` on the sampled model and its parents. `.render()` opts a ref out.

---

## 6. `dbt_project.yml`

**Read:** `20-dbt-project-yml.md`.

Required, root-level. Naming gotcha: **dashes** inside `dbt_project.yml` for multi-word resource types (`saved-queries`, `semantic-models`); **underscores** everywhere else.

Key sections:
- Identity: `name`, `version`, `profile`, `config-version: 2`.
- Paths: `model-paths`, `seed-paths`, `snapshot-paths`, `macro-paths`, `analysis-paths`, `test-paths`, `docs-paths`, `asset-paths`, `function-paths`.
- `require-dbt-version`, `query-comment`, `clean-targets`.
- `flags:` block — global config defaults.
- Resource-type config trees (`models:`, `seeds:`, etc.) — use `+` prefix to mark configs.
- `on-run-start` / `on-run-end` hooks.
- `dbt-cloud:` mapping (`project-id`, `defer-env-id`).

The `+` prefix marks a config (vs a folder-path key) inside resource trees.

---

## 7. Packages

**Read:** `21-packages.md`.

A package is a standalone dbt project consumed as a library. Reference its models with `ref('pkg_model')`. Sources from: **Hub** (recommended — handles transitive dedup), **git**, **tarball**, **local**, **private** (native via `private:` key with `provider:`).

Always pin versions (or use ranges) and commit `package-lock.yml`. `dbt deps` installs; `dbt clean` nukes; `dbt deps --upgrade` bumps pins.

Override package configs from your `dbt_project.yml` — your config wins.

---

## 8. Snapshots (Type-2 SCD)

**Read:** `24-snapshots.md` + `18-cmd-snapshot.md`.

Capture historical states of mutable source tables. Adds `dbt_valid_from`/`dbt_valid_to` columns.

Two strategies:
- **`timestamp`** (recommended) — uses an `updated_at` column. Robust to schema change.
- **`check`** — compares listed columns. Use when no reliable `updated_at`.

v1.9+ uses YAML config form. New configs: `dbt_valid_to_current` (set a sentinel like `9999-12-31` instead of NULL), `hard_deletes` (`ignore` | `invalidate` | `new_record`).

Keep snapshots in a **separate schema** with locked-down permissions; they cannot be rebuilt.

---

## 9. Incremental models

**Read in order:**
- `25-incremental-models-overview.md` — concept.
- `26-incremental-strategy.md` — `merge` / `append` / `delete+insert` / `insert_overwrite` / `microbatch`.
- `27-incremental-microbatch.md` — time-series specialization.

### Don't reach for incremental until you have to
View → table → incremental. Stop at the lowest tier that works.

### The five strategies
| Strategy | Use when |
|---|---|
| `merge` | You have a reliable `unique_key`; SCD1-like upsert |
| `append` | Append-only data; duplicates tolerable; cheapest |
| `delete+insert` | `merge` unsupported, or key isn't truly unique |
| `insert_overwrite` | Partition-aligned warehouses (BQ, Spark, Databricks, Snowflake); replace whole partitions |
| `microbatch` | Large time-series; backfill / late data; per-batch retry |

### Microbatch (the modern way for time-series)
Required configs:
- `event_time` on the model AND on its direct parents you want filtered.
- `begin` — initial-build start.
- `batch_size` — `hour` / `day` / `month` / `year`.
- Optional: `lookback`, `concurrent_batches`.

Each batch is idempotent. `dbt retry` reruns failed batches independently. Best practice: `full_refresh: false` so you don't accidentally rebuild from `begin`.

---

## 10. `grants` config

**Read:** `23-grants.md`.

Declare warehouse permissions in code. Applies to models, seeds, snapshots (not sources/tests).

- **Default = clobber**: a more-specific config replaces the less-specific list.
- **Add with `+select`**: prefix the privilege name with `+` to merge instead of replace.
- **Empty list `[]`** revokes all; **deleting the block** stops dbt managing grants entirely.
- Use **Jinja** for env-conditional grants: `{{ ['prod_role'] if target.name == 'prod' else ['dev_role'] }}`.

Fall back to **hooks** for row-level security, future grants, masking policies, anything not expressible via `grants`.

---

## 11. Best practice workflows

**Read:** `12-best-practice-workflows.md` and `07-refactoring-legacy-sql.md`.

### Operational baselines (non-negotiable)
- Everything in version control with PR review.
- Separate dev/prod targets in `profiles.yml`.
- A documented style guide.
- `ref()` everywhere; sources for raw; rename/recast once.
- Test PK uniqueness + not-null at minimum.

### Slim CI
```bash
dbt build --select state:modified+ --defer --state path/to/prod
```
Plus `--store-failures` for test debugging, `result:*` selectors for cheap reruns.

### Refactoring legacy SQL — the 6-step process
1. Migrate 1:1 into a `models/` file. Run it.
2. Replace raw refs with **sources**.
3. Pick a strategy: **alongside** (recommended) or in-place.
4. Implement CTE groupings: import → logical → final → simple SELECT.
5. Port CTEs to staging/intermediate/marts models.
6. Audit with `audit_helper`.

---

## 12. The `--empty` and `--sample` flags

**Read:** `28-empty-flag.md`, `29-sample-flag.md`.

| Flag | Input data | Use |
|---|---|---|
| `--empty` | 0 rows | Cheap CI validation; schema-only builds |
| `--sample` | Time-bounded slice | Realistic dev with cheap reads |
| (none) | All rows | Production |

Both flags ignore Python models. `--sample` requires `event_time` on the sampled models. Use `.render()` on a ref to opt it out of sampling.

---

## Exam-ready summary tables

### Materialization → use case
| Materialization | Use case |
|---|---|
| view | Staging; light transforms |
| table | BI marts; many descendants |
| incremental | Slow-to-build tables, append-mostly |
| ephemeral | Light intermediate; one or two consumers |
| materialized_view | Managed-refresh alternative to incremental |

### Folder → group-by rule
| Layer | Group by |
|---|---|
| staging | source system |
| intermediate | business area |
| marts | department/domain |

### Command → primary purpose
| Command | Purpose |
|---|---|
| `dbt build` | Run + test + snapshot + seed (+ functions) in DAG order |
| `dbt run` | Models only |
| `dbt test` | Data + unit tests |
| `dbt snapshot` | T2 SCD capture |
| `dbt seed` | Load CSVs |
| `dbt show` | Preview SQL/test rows |
| `dbt docs generate` | Build docs site artifacts |
| `dbt docs serve` | Host docs site locally |

### Incremental strategy → typical adapter
| Strategy | Typical adapters |
|---|---|
| `append` | postgres, redshift, snowflake, databricks |
| `merge` | most adapters |
| `delete+insert` | postgres, redshift, snowflake |
| `insert_overwrite` | bigquery, spark, databricks, snowflake |
| `microbatch` | most adapters in latest release |

---

## How to study from here
1. Read this meta guide top to bottom.
2. For each section, open the linked per-resource cheat sheets and skim the **Key takeaways**.
3. Make flashcards from the tables.
4. Build a tiny project that exercises: sources → staging view → intermediate ephemeral → marts table → snapshot → exposure → test. Use `dbt build`, then `dbt show` failing tests, then `dbt docs generate && dbt docs serve`.
5. Move to Checkpoint 2.

## File index (this directory)
- `01-dbt-viewpoint.md`
- `02-how-we-structure-overview.md`
- `03-how-we-structure-staging.md`
- `04-how-we-structure-intermediate.md`
- `05-how-we-structure-marts.md`
- `06-how-we-structure-rest.md`
- `07-refactoring-legacy-sql.md`
- `08-sources.md`
- `09-source-configs.md`
- `10-materializations.md`
- `11-materializations-best-practices.md`
- `12-best-practice-workflows.md`
- `13-cmd-build.md`
- `14-cmd-run.md`
- `15-cmd-test.md`
- `16-cmd-docs.md`
- `17-cmd-show.md`
- `18-cmd-snapshot.md`
- `19-cmd-seed.md`
- `20-dbt-project-yml.md`
- `21-packages.md`
- `22-python-models.md`
- `23-grants.md`
- `24-snapshots.md`
- `25-incremental-models-overview.md`
- `26-incremental-strategy.md`
- `27-incremental-microbatch.md`
- `28-empty-flag.md`
- `29-sample-flag.md`
