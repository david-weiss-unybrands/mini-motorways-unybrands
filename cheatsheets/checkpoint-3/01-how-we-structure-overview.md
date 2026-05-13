# How We Structure Our dbt Projects (CP3 Reading)

**Source:** https://docs.getdbt.com/best-practices/how-we-structure/1-guide-overview
**Type:** Reading · Checkpoint 3 (cross-referenced from Checkpoint 1)

> ℹ️ This resource also appears in Checkpoint 1. The full cheat sheet lives at `checkpoint-1/02-how-we-structure-overview.md` (plus the four layer-specific sheets `03`–`06`). This file highlights what Checkpoint 3 cares about most: where tests, exposures, and other resilience artifacts fit in the structure.

## Why CP3 sends you back to this guide
Checkpoint 3 is about **resilient pipelines** — testing strategy, exposures, defer/clone, source freshness, state, retries. None of that lands cleanly unless you can name *where each artifact lives* in the canonical staging → intermediate → marts shape.

## The structure (recap, abridged)

```
models/
├── staging/<source_system>/
│   ├── stg_<source>__<entity>s.sql
│   ├── _sources.yml         ← source-level tests, freshness, exposures, event_time
│   ├── _models.yml          ← staging-model tests
│   └── base/                ← only when joins/unions are needed pre-stage
├── intermediate/<area>/
│   └── int_<entity>_<verb>s.sql
└── marts/<department>/
    └── <entity>.sql         ← table or incremental; consumers expect contracts
```

Plus:
- `tests/` — singular tests (cross-model logic that generic tests can't express)
- `snapshots/`, `seeds/`, `analyses/`, `macros/`
- A `_<dir>__models.yml` per folder with model configs/tests

## Where CP3 artifacts live

| Artifact | Lives where |
|---|---|
| **Source freshness** | `_sources.yml` under `freshness:` and `loaded_at_field` |
| **Source data tests** | `_sources.yml` columns (`unique`, `not_null`, ranges) |
| **Generic data tests** | `_<dir>__models.yml` under each model's `columns:` |
| **Singular tests** | `tests/` directory; one `.sql` per test |
| **Custom generic tests** | `tests/generic/` directory; macros named `test_<name>` |
| **Unit tests** | YAML next to the model (`models/.../*.yml`) |
| **Exposures** | YAML in the relevant area (often `models/marts/<area>/_<area>__exposures.yml`) |
| **Snapshots** | `snapshots/` (or `models/` per v1.9 YAML config) |
| **State artifacts** | Outside the project — production `target/` from a previous run, referenced via `--state path/to/prod` |

## Selection patterns that depend on this structure
The whole point of the folder hierarchy is **node selection power**. CP3 commands rely on it constantly:
```bash
# Run all tests on staging Stripe data
dbt test --select staging.stripe

# Test only what changed (Slim CI)
dbt build --select state:modified+ --defer --state path/to/prod

# Source-freshness-driven build
dbt source freshness
dbt build --select source_status:fresher+ --state path/to/prod

# Rerun only failed batches/tests
dbt retry

# Build everything downstream of an exposure
dbt build --select +exposure:my_dashboard
```

Each pattern selects by folder, state, source status, or graph operator — these only work if the structure is consistent.

## Why CP3 keeps quoting this guide
- "Test smarter not harder" tells you *what* tests to write. **Structure** tells you *where* to put them.
- "Where should tests go in your pipeline?" maps test types to layers — that mapping only makes sense with this structure in mind.
- Defer/clone, state selection, source freshness — all rely on a project organized so that `--select state:modified+` is meaningful.

## Key takeaways
- The structure isn't decorative — CP3's selection, defer, and CI workflows depend on it.
- Tests live close to the resource they validate: source tests in `_sources.yml`, model tests in `_<dir>__models.yml`, unit tests next to the model, singular tests in `tests/`.
- Exposures sit alongside their owning marts so node selection can find them via `+exposure:name`.
- State-comparison patterns (`--state`, `--defer`) treat the structured folder layout as their stable contract.

## Related
- Layer-specific guides (staging / intermediate / marts / rest-of-project) in CP1.
- Test-smarter (CP3) — testing by layer.
- Slim CI / state selection / defer / source-freshness selectors.
