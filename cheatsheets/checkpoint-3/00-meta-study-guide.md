# Checkpoint 3 — Build Resilient Pipelines at Scale (Meta Study Guide)

> Synthesized exam-prep guide for Checkpoint 3. Reorganizes the 19 per-resource cheat sheets into the larger story: **how to design, test, deploy, and recover dbt pipelines at scale without alert fatigue or runaway warehouse cost**.

## The shape of Checkpoint 3
CP3 is the operational checkpoint. It bundles four related concerns:

1. **Testing strategy** — what to test, where to put tests, which tools (generic, singular, unit, custom).
2. **State-aware execution** — Slim CI, defer, clone, retry, source-freshness-driven builds.
3. **Discoverability** — exposures and data product surface area.
4. **Project resilience** — the *Essential Checklist*, the structure guide as a foundation.

If CP1 is the mental model and CP2 is the API contract, CP3 is **how to run a dbt project in production without setting your warehouse on fire**.

---

## 1. The CP3 worldview

**Read first:** `01-how-we-structure-overview.md` (cross-reference into CP1).

Everything in CP3 assumes the staging → intermediate → marts structure. State-based selectors, exposures, source freshness, test placement — all rely on the standard folder layout for power. If you skip this, none of the rest works cleanly.

Key reminder of where CP3 artifacts live:
| Artifact | Location |
|---|---|
| Source freshness + tests | `_<dir>__sources.yml` (staging) |
| Model data tests | `_<dir>__models.yml` next to model |
| Singular tests | `tests/*.sql` |
| Custom generic tests | `tests/generic/*.sql` (or `macros/`) |
| Unit tests | YAML next to model, **under `models/`** (NOT `tests/`) |
| Exposures | `_<area>__exposures.yml` alongside marts |
| State (CI artifact) | Prod's `target/manifest.json` + `run_results.json` |

---

## 2. Testing strategy — what & where

### The "Test smarter" framework

**Read in order:** `02-blog-test-smarter.md`, `03-blog-test-smarter-where.md`.

#### Phase 1: identify (three buckets)
- **Data hygiene** — granularity (PK uniqueness, not-null), completeness, formatting. Lives in **staging**.
- **Business-focused anomalies** — relative to known business norms. Threshold drifts; humans set and adjust. Discovered by surveying critical BI dashboards.
- **Stats-focused anomalies** — distributional (volume, dimensional, column outliers). Out of scope until hygiene + business are solid.

#### Phase 2: prioritize (three filters → severity)
Is the data:
- **Customer-facing?**
- **Used for financial decisions?**
- **Executive-facing?**

If yes to any: **severity = error**. Otherwise: **warn**, or **delete the test entirely**.

> If you don't have an immediate action when a test fails, it should be a warning. Or removed.

#### Phase 3: action plan
For every concern, write 1–2 initial debugging steps. Put them in:
- A team **testing framework doc** linked from the README.
- The test's own **description** field.

If you can't articulate an action step → drop the test.

### Where each test type lives (the layer map)

**Read:** `03-blog-test-smarter-where.md` again — the lookup table from this post is the most-asked CP3 question.

| Layer | What to test |
|---|---|
| **Sources** | Only **fixable-at-source** issues + freshness. If you can't fix at source, mitigate in staging instead — don't add a source test. |
| **Staging** | Single-table **business anomalies** (accepted ranges, sign invariants, volume bounds). **Don't test your own cleanup work**. |
| **Intermediate** | PK tests on re-grained or enriched models. Anomaly tests on new categorical/range/computed columns. Unit tests for complex transforms. |
| **Marts** | Unit tests for complex transformation logic. PK tests where grain changes (or is intentionally preserved). Singular tests for high-impact, high-impact-only-here checks. |
| **CI/CD** | Slim CI; all the above tests run automatically. |
| **Advanced CI** | Modified/added/removed diff flags as reviewer evidence (dbt Cloud). |

### Source freshness severity rule
- Source feeds high-impact output → severity = **error** (stale source fails pipeline).
- Otherwise → severity = **warn**.

---

## 3. The four test families

**Read:** `08-data-tests.md`, `10-custom-generic-tests.md`, `12-unit-tests.md`, `09-test-source.md`.

| Family | Where defined | Runs against | When validated |
|---|---|---|---|
| **Generic data tests** | YAML `data_tests:` on model/source/seed/snapshot | Real data | After build |
| **Singular data tests** | `tests/*.sql` (raw SELECT returning failing rows) | Real data | After build |
| **Custom generic tests** | `tests/generic/*.sql` (`{% test name(...) %}`) | Real data | After build |
| **Unit tests** | YAML `unit_tests:` under `models/` | Synthetic inputs (given/expect) | **Before** materialization |

### Pass/fail mechanic (all four)
Test = `select` query returning failing rows. **0 rows = pass.**

### Built-in generics
`unique`, `not_null`, `accepted_values`, `relationships`. Plus everything in `dbt_utils` and `dbt-expectations`.

### Custom generic essentials
```sql
-- tests/generic/test_is_even.sql
{% test is_even(model, column_name) %}
    select * from {{ model }} where ({{ column_name }} % 2) = 1
{% endtest %}
```
- Accepts `model` (always called that, even for sources/seeds/snapshots) and optionally `column_name`.
- Add extra args (e.g. `to`, `field` for `relationships`).
- Use `{{ config(severity=...) }}` inside the test for defaults, override per-instance.
- Document the underlying macro with name `test_<name>`.

### Unit test essentials
```yaml
unit_tests:
  - name: test_is_valid_email_address
    model: dim_customers
    given:
      - input: ref('stg_customers')
        format: dict
        rows: [{email: cool@example.com, ...}]
    expect:
      format: dict
      rows: [{email: cool@example.com, is_valid_email_address: true}]
```
- v1.8+ feature. Live in YAML next to the model under `models/`.
- Three fixture formats: `dict` (inline), `csv` (inline or file), `sql` (inline or file).
- Direct parents must exist in the warehouse before running the test (use `--empty` to bootstrap).
- `dbt build` flow: unit tests → materialize → data tests. Warehouse spend is skipped if unit tests catch the bug.
- **Don't run in production** — `--exclude-resource-type unit_test`.
- For incrementals: expected output = the merge/insert result, not the final table.

### Source testing nuance
Same toolkit as model tests, attached to source YAML. Only test **fixable-at-source** problems. Mitigate everything else in staging.

---

## 4. Data test configurations

**Read:** `11-data-test-configs.md`.

### Three places to configure, most-specific wins
1. **Property YAML** (next to the test instance)
2. **`config()` in test SQL** (the test definition or singular test)
3. **`dbt_project.yml`** under `data_tests:`

Singular tests can't be configured from property YAML — only their own `config()` or the project file.

### Configs you'll use
- `severity: error | warn` + `error_if`/`warn_if` thresholds (`">0"`, `">10"`).
- `where:` — filter the rows the test runs over (huge cost win on big tables).
- `store_failures: true` (+ `store_failures_as`, `database`, `schema`, `alias`) — persist failing rows.
- `fail_calc: "<sql>"` — override how failures are counted.
- `limit: <int>` — cap failing rows returned.
- General: `enabled`, `tags`, `meta`.

### Killer recipe: cheap test on huge table
```yaml
- unique:
    config:
      where: "order_date >= dateadd('day', -30, current_date)"
```

### Store failures pattern
```bash
dbt test --store-failures
```
Failures land in `dbt_test__audit` schema; replaced on each run.

---

## 5. State-aware execution

This is the half of CP3 most people skip and then suffer for.

**Read in order:** `17-state-selection.md`, `18-state-method.md`, `13-cmd-test.md`, `19-cmd-retry.md`, `06-cmd-clone.md`, `07-clone-incremental.md`, `05-blog-defer-or-clone.md`.

### State artifacts (recap from CP2's compile)
- `manifest.json` — current/state project structure.
- `run_results.json` — node-level results of last invocation.
- `sources.json` — output of `dbt source freshness`.

### `--state` is the gateway
Pass `--state path/to/manifest_dir` to enable:
- `state:` selectors (modified, new, old, modified.body, etc.)
- `result:` selectors (pass/fail/error/warn/skipped from last run)
- `source_status:` (fresher+, etc.)
- Deferral (`--defer`)
- `dbt clone`

### Slim CI — the canonical pattern
```bash
dbt build --select state:modified+ --defer --state path/to/prod
```
- Builds only modified models + their descendants.
- For unselected models, `ref()` resolves to production via `--defer`.
- Cheap, fast, mimics post-merge behavior.

### The state selectors you must know
| Selector | Selects |
|---|---|
| `state:new` | New since state |
| `state:modified` | Changed since state |
| `state:modified.body` | SQL body changes only |
| `state:modified.configs` | Config changes only |
| `state:modified.relation` | Materialization/alias changes |
| `state:modified.contract` | Contract changes |
| `state:old` | Already exists in state |
| `state:unmodified` | Opposite of modified |
| `result:fail` / `result:error` / `result:pass` / `result:warn` / `result:skipped` | From `run_results.json` |
| `source_status:fresher+` | Sources fresher than the prior `sources.json` |

### Defer vs clone — quick decision

| | defer (`--defer`) | clone (`dbt clone`) |
|---|---|---|
| Creates objects? | ❌ | ✅ (real warehouse objects) |
| BI-visible? | ❌ | ✅ |
| Safely mutate target? | ❌ | ✅ |
| Multi-source? | ✅ | ❌ (one src schema → one target) |
| Drift? | Always latest | Point-in-time |
| Typical use case | **Slim CI** | **CD / blue-green / sandboxes** |

Rule of thumb: **defer for CI, clone for CD**.

### The clone-incremental recipe (most-loved CP3 trick)
```bash
# Step 1: clone modified incrementals (+ downstream) that already exist in prod
dbt clone --select state:modified+,config.materialized:incremental,state:old \
          --state path/to/prod

# Step 2: Slim CI as normal — incrementals now exist in PR schema, so is_incremental() is true
dbt build --select state:modified+ --defer --state path/to/prod
```
Why `state:old`? Filters out brand-new incrementals that don't exist in prod yet to clone — they should run full-refresh anyway.

### `dbt retry`
Resumes the prior invocation from the point of failure using `run_results.json`. Idempotent — same bug = same failure. Fix the bug, then retry runs only what's still failing/skipped.

Works for: `build`, `compile`, `clone`, `docs generate`, `seed`, `snapshot`, `test`, `run`, `run-operation`.

Core inherits selection from prior run. Fusion lets you override with `--select`/`--exclude`.

Pairs especially well with **microbatch** incremental models — retries failed batches independently rather than the whole model.

### `dbt source freshness` and `source_status:fresher+`
**Read:** `16-cmd-source.md`.

```bash
dbt source freshness                                          # snapshot
dbt build --select source_status:fresher+ --state path/to/prod  # rebuild downstream of fresh sources
```
Set `error_after` for high-impact sources; `warn_after` only for nice-to-knows.

### `dbt test` CP3 angle
**Read:** `13-cmd-test.md`.

Most-used selectors in CP3:
- `test_type:data` / `test_type:unit` / `test_type:generic` / `test_type:singular`
- `result:fail` / `result:error`
- `state:modified`
- `source_status:fresher+`
- `+exposure:<name>`

⚠️ `dbt test` overwrites `run_results.json` — for combined `result:fail` + `result:error` selectors, use one `dbt build` invocation.

---

## 6. Exposures — make consumers visible

**Read:** `14-exposures.md`, `15-exposure-properties.md`.

An exposure declares a downstream use (dashboard, ML model, app, notebook, analysis) as a first-class node in the DAG.

### Minimum viable exposure
```yaml
exposures:
  - name: weekly_jaffle_metrics
    type: dashboard
    owner: { email: data@jaffleshop.com }
    depends_on: [ ref('fct_orders'), ref('dim_customers') ]
```

### Five `type` values
`dashboard`, `notebook`, `analysis`, `ml`, `application`.

### Why exposures matter for resilience
- `dbt build --select +exposure:executive_summary` — rebuild & test everything an exposure depends on.
- The exposure appears in docs/Catalog (orange **EXP** badge in the DAG).
- Health tiles let BI users see freshness/test status at a glance.
- "Test smarter — where" uses exposures to identify high-impact pipelines for stricter testing.

### v1.10+ structure
`tags` and `meta` moved under `config:`:
```yaml
- name: my_exposure
  config:
    tags: ['critical']
    meta: {tier: 1}
    enabled: true
```

### Project-level toggle
```yaml
exposures:
  +enabled: true
```

---

## 7. The Essential Project Checklist

**Read:** `04-blog-essential-checklist.md`.

A field-tested audit pass for any 2+ month-old dbt project. Run through it quarterly. Categories:

- **dbt_project.yml** — meaningful name, no redundant `materialized: view`, folder-level materializations, `on-run-end` grants, sparing tags, YAML selectors.
- **Package management** — `packages.yml` up-to-date; `dbt_utils` installed.
- **Code style** — documented + enforced.
- **Project structure** — staging/marts present, prefixes (`stg_`, `fct_`, `dim_`), modular, filter early.
- **dbt usage** — recent version; know longest-running models; sources used everywhere; tests in dev *and* prod; Jinja readable; incrementals use `unique_key` + `is_incremental()`.
- **Testing & CI** — 100% test coverage ideal; minimum PK uniqueness + not-null; PRs with mandatory review.
- **Documentation** — descriptions on every model; doc blocks for column descriptions; current README.
- **dbt Cloud** — jobs inherit env dbt version; CI job exists; run cadence matches source cadence; Slack notifications.

---

## 8. Putting CP3 together — end-to-end resilience

Imagine a production dbt project with daily `dbt build` jobs, Slim CI, an executive dashboard exposure, several incremental models, and source-freshness SLAs.

### Daily prod workflow
1. **Source freshness snapshot** (every 30 min): `dbt source freshness`.
2. **Hourly rebuild**: `dbt build --select source_status:fresher+ --state path/to/prod`.
3. **Build alerts**: failed test severity = `error` → pipeline fails → ops gets paged.

### When a build fails
1. **Diagnose**: `dbt show --select <failing_test>`; read `target/run/<model>.sql`; check `dbt.log`.
2. **Fix code**, push commit.
3. **Resume**: `dbt retry` picks up from the failure point.

### PR workflow
1. Slim CI clones modified incrementals first:
   ```bash
   dbt clone --select state:modified+,config.materialized:incremental,state:old --state path/to/prod
   ```
2. Then runs:
   ```bash
   dbt build --select state:modified+ --defer --state path/to/prod
   ```
3. Unit tests catch logic bugs before materialization.
4. Failed tests block the PR.

### Test placement during the PR
- Source tests catch fixable issues at the boundary.
- Staging tests catch business anomalies on single tables.
- Intermediate tests cover new joins/calculations and grain changes.
- Marts tests cover the calculated fields and any singular high-impact checks.
- Unit tests cover complex transformation logic — they're cheap (synthetic data).

### Sandbox for analysts
1. Need a fresh prod-shaped dataset to experiment with: `dbt clone --select <whatever> --state path/to/prod`.
2. Now analysts can mutate the sandbox without touching prod (and the BI tool can read it).

### Quarterly hygiene
Run the Essential Checklist; close gaps as tickets.

---

## Exam-ready summary tables

### Test family quick map
| Family | Where | Inputs | When validated |
|---|---|---|---|
| Generic data | YAML `data_tests:` | Real data | Post-build |
| Singular data | `tests/*.sql` | Real data | Post-build |
| Custom generic | `tests/generic/*.sql` (or `macros/`) | Real data | Post-build |
| Unit | `unit_tests:` YAML under `models/` | Synthetic | Pre-materialization |

### Severity decision (per "Test smarter")
| Concern feeds... | Severity |
|---|---|
| Customer / financial / executive | `error` |
| Future research, within 6 months | `warn` |
| Anything else | no test |

### State selector → use
| Selector | Use |
|---|---|
| `state:modified+` | Slim CI scope |
| `state:old` | Clone-incremental filter |
| `result:fail` | Rerun failed tests |
| `result:error+` | Rerun errored nodes + downstream |
| `source_status:fresher+` | Rebuild downstream of fresh sources |
| `+exposure:<name>` | Build everything a downstream consumer needs |

### Defer vs clone
| Need | Use |
|---|---|
| Slim CI / cheap CI | **defer** |
| Object in BI tool / mutable sandbox / blue-green | **clone** |
| Test incrementals as incremental in CI | **clone** (then defer) |

### Tests where to put them (layer map)
| Layer | Tests |
|---|---|
| Source | Fixable-at-source; freshness |
| Staging | Business anomalies (single-table) |
| Intermediate | New columns; re-grained PKs; unit tests for complex SQL |
| Marts | New calculated fields; unit tests; singular high-impact tests |
| CI/CD | All the above on `state:modified+ --defer` |

### Resilience commands
| Command | Purpose |
|---|---|
| `dbt build` | Run + test in DAG order; production default |
| `dbt source freshness` | Check source SLAs |
| `dbt clone` | Copy schemas; CD use cases |
| `dbt retry` | Resume failed invocation from point of failure |
| `dbt show` | Preview failing rows / inspect model |

### Exposure types
| Type | What it represents |
|---|---|
| `dashboard` | A BI dashboard |
| `notebook` | A Jupyter / similar analysis |
| `analysis` | One-off analytical write-up |
| `ml` | ML model or pipeline |
| `application` | App consuming dbt-produced data |

---

## How to study from here
1. Walk through the "PR workflow" and "production failure" stories in §8 mentally.
2. Memorize the testing-layer map and the severity decision tree.
3. Know defer vs clone cold — they show up in scenarios.
4. Know the `state:` and `result:` selector names and what each picks.
5. Be able to write the clone-incremental + Slim CI two-command CI job from memory.
6. Run through the Essential Checklist on a project you know — note 3 things you'd change.

## File index (this directory)
- `01-how-we-structure-overview.md`
- `02-blog-test-smarter.md`
- `03-blog-test-smarter-where.md`
- `04-blog-essential-checklist.md`
- `05-blog-defer-or-clone.md`
- `06-cmd-clone.md`
- `07-clone-incremental.md`
- `08-data-tests.md`
- `09-test-source.md`
- `10-custom-generic-tests.md`
- `11-data-test-configs.md`
- `12-unit-tests.md`
- `13-cmd-test.md`
- `14-exposures.md`
- `15-exposure-properties.md`
- `16-cmd-source.md`
- `17-state-selection.md`
- `18-state-method.md`
- `19-cmd-retry.md`
