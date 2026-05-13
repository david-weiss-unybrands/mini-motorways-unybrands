# Checkpoint 2 — Govern and Debug Your Models (Meta Study Guide)

> Synthesized exam-prep guide for Checkpoint 2. Reorganizes the 7 per-resource cheat sheets by topic and shows how they fit together as a single story: **how to publish reliable model APIs and debug when things go wrong**.

## The shape of Checkpoint 2
CP2 is significantly tighter than CP1 — 7 resources, two themes:

1. **Governance** — contracts, versions, constraints, data-product management. How to make a model into a trustworthy API for downstream consumers.
2. **Debug & control** — compile, debugging errors, behavior changes, global configs. How to inspect what dbt is doing and configure its behavior.

> ⚠️ The Checkpoint 2 readings list one item, *Data product management: best practices*, hosted at `www.getdbt.com/blog/data-product-management`. That post lives on dbt's marketing site, which is **not open-sourced** and was unreachable from this sandbox. I've flagged it here; if you can paste the contents, I can produce a per-resource cheat sheet for it. The synthesis below incorporates its themes based on the rest of the CP2 material and the Mesh courses it draws from.

---

## 1. The "models as APIs" mental model

**Read:** `01-model-contracts.md`, `02-model-versions.md`, `03-constraints.md`.

The core idea: a public dbt model has **producers** (your team) and **consumers** (other teams, dashboards, ML pipelines, other dbt projects). Producers want freedom to iterate; consumers want stability. CP2 is the toolkit that makes both possible:

| Concern | Tool |
|---|---|
| What columns/types will the model produce? | **Contract** |
| How do I change those guarantees without breaking consumers? | **Versions** + **deprecation_date** |
| What guarantees does the warehouse enforce? | **Constraints** |
| How do producers and consumers coordinate at scale? | **Data product management practices** (the missing post) |

This is conceptually the same arc you see for web APIs — define the contract, version it, deprecate old versions on a schedule, communicate clearly.

---

## 2. Contracts — shape guarantees enforced at build time

**Read:** `01-model-contracts.md`.

A contract defines a model's column names, data types, and (optionally) constraints. With `enforced: true`:

1. **Preflight check** — dbt verifies the SQL *would* produce columns matching the contract before sending DDL.
2. **DDL enforcement** — column types and constraints land in the `CREATE TABLE` statement; the warehouse enforces them on insert.

```yaml
models:
  - name: dim_customers
    config:
      materialized: table              # required: table or incremental, NOT view/ephemeral
      contract: {enforced: true}
    columns:
      - name: customer_id
        data_type: int
        constraints:
          - type: not_null
      - name: customer_name
        data_type: string
```

### Hard rules
- Materialization must be `table` or `incremental`.
- **Every** column needs `data_type`.
- Ephemeral and view models can't carry contracts.

### Contracts vs data tests
| | Contract | Data test |
|---|---|---|
| Validates | **shape** (columns/types) | **content** (rows) |
| Failure effect | Build doesn't happen | Test reports failure |
| When | Build-time | After build |
| Configurable severity | No | Yes |

For exam purposes: contracts catch *structural* breakage; tests catch *data quality* issues. Some platform-enforced constraints (`not_null` everywhere; everything else is platform-dependent) can replace equivalent data tests — cheaper, build-time enforcement.

### Which models should have contracts?
**Public models** — anything other teams, projects (Mesh), or external systems consume. Internal intermediate models usually don't need them.

---

## 3. Versions — evolve models without breaking consumers

**Read:** `02-model-versions.md`.

When a contract change would break consumers (drop column, rename, type change), you don't just push it. You **create a new version**:

```yaml
models:
  - name: dim_customers
    latest_version: 1
    config:
      materialized: table
      contract: {enforced: true}
    columns:
      - name: customer_id
        data_type: int
      - name: country_name
        data_type: varchar
    versions:
      - v: 1                  # current latest; matches the shared spec
      - v: 2                  # the new shape
        columns:
          - include: all
            exclude: [country_name]   # breaking change: dropping country_name
```

### How `ref` resolves
- `ref('dim_customers')` → resolves to **latest** automatically.
- `ref('dim_customers', v=1)` → pins to v1.
- dbt prints notices when an unpinned ref resolves to latest *and* a prerelease exists.

### File / relation conventions
| v | role | file name | relation |
|---|---|---|---|
| 3 | prerelease | `dim_customers_v3.sql` | `dim_customers_v3` |
| 2 | latest | `dim_customers.sql` or `dim_customers_v2.sql` | `dim_customers_v2` AND `dim_customers` (recommended) |
| 1 | old | `dim_customers_v1.sql` | `dim_customers_v1` |

### The deprecation loop
1. Develop new version.
2. Bump latest to point at it.
3. Mark old for deprecation (`deprecation_date` resource property).
4. Wait for consumers to migrate.
5. Delete old version.

### Tactical notes
- Only version **public/contracted models** with downstream commitments. Don't version every change.
- Keep ≤ 2–3 live versions at a time (same rule as web APIs).
- Non-breaking additions (new column, bug fix) don't need a new version — update latest in place.
- Schedule periodic version bumps (1–2× per year) where you sweep out unused columns rather than versioning every small change.

### Selecting by version
```yaml
selectors:
  - name: exclude_old_versions
    default: "{{ target.name == 'dev' }}"
    definition:
      method: fqn
      value: "*"
      exclude:
        - method: version
          value: old
```
Useful for skipping deprecated versions in dev while still building them in prod during migration.

---

## 4. Constraints — warehouse-enforced rules

**Read:** `03-constraints.md`.

Constraints attach to columns or models, declaring rules the warehouse enforces on insert. Types: `not_null`, `unique`, `primary_key`, `foreign_key`, `check`, `custom`.

### Prerequisites
- Materialization: `table` or `incremental`.
- The model has an **enforced contract**.
- Every column declares `data_type`.

### Column-level vs model-level
- ✅ Single-column constraints → **column-level**.
- ✅ Multi-column constraints (composite PK, multi-column FK, cross-column check) → **model-level**.
- Multiple `primary_key` constraints must be model-level.

```yaml
models:
  - name: dim_customers
    config: {materialized: table, contract: {enforced: true}}
    constraints:
      - type: primary_key
        columns: [customer_id, region]
      - type: foreign_key
        columns: [customer_id]
        to: ref('stg_customers')
        to_columns: [customer_id]
      - type: check
        columns: [start_date, end_date]
        expression: "start_date <= end_date"
        name: dim_customers_valid_window
    columns:
      - name: customer_id
        data_type: int
        constraints: [{type: not_null}]
```

### Platform enforcement reality
- **Postgres** enforces everything.
- **Most analytical platforms** enforce only `not_null`; PK/UQ/FK are *informational*.
- Use `warn_unenforced: false` to silence noise on supported-but-not-enforced constraints; `warn_unsupported: false` for those the platform doesn't recognize.

### Foreign keys (v1.9+)
```yaml
- type: foreign_key
  columns: [customer_id]
  to: ref('stg_customers')
  to_columns: [customer_id]
```
Using `ref()` for `to:` captures the dependency in the DAG and survives environment switches — much better than hardcoding schema names in `expression`.

### Constraints vs data tests
Constraints win when the platform actually enforces them — they fail the build at insert time, no extra query. For everything informational, pair with a data test.

---

## 5. Data product management (the missing-blog gap)

The Checkpoint 2 readings list one resource I couldn't fetch — *Data product management: best practices* on `www.getdbt.com`. I'll note its themes here based on adjacent dbt material; replace this section if you can pull the actual post.

### Why this complements the technical CP2 toolkit
Contracts, versions, and constraints give you the *mechanics* of treating models as APIs. The data-product-management practices give you the *organizational* side:

- **Producers** (data engineers / analytics engineers) are responsible for the contract, freshness SLA, and migration plan. They publish a versioned, documented product.
- **Consumers** (BI teams, ML engineers, downstream dbt projects via Mesh) are responsible for staying within the contract and migrating when notified.
- **The contract** is the formal boundary; everything else (tests, exposures, freshness, version-bump cadence) is the SLA.

This is the same idea as product management for software APIs: ownership, lifecycle, communication, deprecation.

### How CP2 features support this division
| Practice | Mechanism in dbt |
|---|---|
| "Declare the API" | Contract |
| "Communicate the API" | Description + doc blocks; rendered docs site |
| "Make consumers visible" | Exposures (CP3) |
| "Version & sunset" | Versions + `deprecation_date` |
| "Health monitoring" | Source freshness, data tests, data health tiles |
| "Restrict access" | Groups + `access: public/private/protected` (CP1's rest-of-project + Mesh) |

### Action items the missing post almost certainly recommends
- Treat each public model as a product with an owner, an SLA, and consumers.
- Bake the migration cadence (e.g., once-or-twice-yearly version bump) into the team's calendar.
- Use exposures and Catalog/Explorer to keep producers and consumers visible to each other.
- Tie test severity to consumer impact (this is also the *Test smarter* framework in CP3).

---

## 6. Debugging — the systematic approach

**Read:** `04-debugging-errors.md`.

### The five-step loop
1. **Read the error message** — names the type and the file.
2. **Open the file** — fix is often obvious.
3. **Isolate** — run one model; revert recent changes.
4. **Use compiled files and logs**:
   - `target/compiled/<model>.sql` — bare `select`, runnable in a SQL client.
   - `target/run/<model>.sql` — the SQL dbt actually sent (with materialization DDL).
   - `logs/dbt.log` — every query dbt ran. Recent errors at the bottom.
5. **Ask for help** — write a good question, with the error + the file content.

### Error type → likely cause
| Type | Phase | Likely cause |
|---|---|---|
| `Runtime Error` | Initialize | Not a dbt project; bad profile; failed connection; invalid `dbt_project.yml` |
| `Compilation Error` | Parsing | Invalid Jinja; invalid YAML; bad `ref`; wrong schema key |
| `Dependency Error` | Graph validation | Circular `ref`; disabled model still ref'd |
| `Database Error` | SQL execution | Type mismatch; missing column; permissions; dialect mismatch |

### Tools that solve most debugging
- `dbt debug` — connection check.
- `dbt debug --config-dir` — find your `profiles.yml`.
- `dbt parse` — fast syntax check, no warehouse.
- `dbt compile` — render SQL; inspect what dbt is sending.
- `dbt show --select <test>` — see the failing rows for a test.
- `--debug` flag — verbose log output.
- `--fail-fast` — stop at first error.

### Diagnostic pro tip
When a database error shows up in a downstream model but feels off, temporarily materialize the upstream chain as tables. The warehouse will throw the error at the real culprit.

---

## 7. `dbt compile`

**Read:** `05-cmd-compile.md`.

Renders compiled SQL into `target/` without executing it. Used to:
- Inspect rendered Jinja/macros/refs.
- Manually run a model's SQL in a SQL client for debugging.
- Compile analyses (analyses aren't materialized any other way).

### Common patterns
```bash
dbt compile                                    # everything
dbt compile --select stg_orders                # one model
dbt compile --inline "select * from {{ ref('raw_orders') }}"  # ad-hoc
dbt compile --no-introspect                    # avoid metadata queries
dbt --no-populate-cache compile                # skip warehouse cache warm-up
```

### `compile` vs `parse` vs `run` vs `build`
| Command | Compiles | Connects to warehouse | Executes |
|---|---|---|---|
| `dbt parse` | ❌ | ❌ | ❌ |
| `dbt compile` | ✅ | usually (cache/introspection) | ❌ |
| `dbt run` | ✅ | ✅ | ✅ models |
| `dbt build` | ✅ | ✅ | ✅ everything |

v1.12+ extends `compile` to **snapshots** — you can finally inspect the generated SCD SQL.

---

## 8. Behavior changes — controlled migration of dbt's runtime

**Read:** `06-behavior-changes.md`.

A specific category of flags that gate **breaking dbt-runtime changes**. They live in `dbt_project.yml`'s `flags:` block, version-controlled and PR-reviewed.

### Three-phase lifecycle
1. **Introduction** — new behavior available but disabled by default.
2. **Maturity** — default flips to `true`; old behavior still selectable but warned about.
3. **Removal** — flag and old behavior deleted from dbt.

### What counts as a behavior change
- Same code + same command → different result.
- New errors (not warnings).
- Macro signature changes.
- Breaking changes to artifact JSON.

### What's NOT a behavior change (handled in regular releases)
- Bug fixes.
- New warnings.
- New artifact fields with defaults.

### The flags you'll see most often
```yaml
flags:
  require_explicit_package_overrides_for_builtin_materializations: true
  require_resource_names_without_spaces: true
  source_freshness_run_project_hooks: true
  state_modified_compare_more_unrendered_values: false  # turn ON to reduce CI false positives
  validate_macro_args: false
  require_generic_test_arguments_property: true
```

### Fusion erases the migration
All behavior-change flags are removed in Fusion — the new behavior is always on.

---

## 9. Global configs — how dbt runs

**Read:** `07-global-configs.md`.

Flags vs resource configs:
- **Resource configs** describe **what** to build (materialization, tags, schema).
- **Flags / global configs** describe **how** dbt runs (logging, fail-fast, threads, partial parse, defer, target).

### Three layers of setting (most specific wins)
1. CLI option (`--full-refresh`).
2. Environment variable (`DBT_FOO` v1.10−; `DBT_ENGINE_FOO` v1.11+).
3. `dbt_project.yml` under `flags:`.

### Common flags
- Logging: `debug`, `log_level`, `log_format`, `log_path`, `quiet`, `printer_width`, `use_colors`.
- Behavior: `fail_fast`, `warn_error`, `warn_error_options`, `partial_parse`, `populate_cache`.
- Targets: `target`, `profile`, `profiles_dir`, `project_dir`.
- Slim CI: `defer`, `defer_state`, `favor_state`, `state`.
- Build cost: `empty`, `sample`, `event_time_start`, `event_time_end`.
- Resource type: `resource-type`, `--exclude-resource-type`.
- Failures: `store_failures`.

### Reading flags from Jinja
```yaml
on-run-start:
  - '{{ log("I will fail fast", info=true) if flags.FAIL_FAST }}'
```
Don't use `flags` for parse-time-resolved configs (refs, sources).

---

## 10. Putting CP2 together

Imagine you own a public `dim_customers` mart consumed by three dashboards and another dbt project via Mesh.

1. **Contract.** Declare every column with its `data_type`. Add `not_null` and `primary_key` constraints on `customer_id`. Materialize as `table`.
2. **Tests.** PK uniqueness + not-null (data tests); business-anomaly tests on the calculated fields (CP3 *Test smarter*).
3. **Exposures.** Declare the three dashboards as exposures so the lineage is explicit (CP3).
4. **Version.** Today the model is v1. Tomorrow you need to drop `country_name`. Create `dim_customers_v2.sql`, declare `versions:` in YAML, set `latest_version: 2`, give v1 a `deprecation_date`. Inform consumers.
5. **Debug.** A consumer reports unexpected NULLs. You `dbt show --select unique_dim_customers_customer_id` to see failing rows; trace to the upstream staging model. Fix and `dbt build --select stg_customers+`.
6. **Behavior changes.** Upgrading to next dbt version surfaces a warning about `state:modified` comparisons. Turn on `state_modified_compare_more_unrendered_values` to reduce CI false positives.
7. **Compile.** Add a complex `check` constraint expression; `dbt compile --select dim_customers` to confirm the DDL renders correctly before running.

---

## Exam-ready summary tables

### Governance tool → role
| Tool | Role |
|---|---|
| Contract | Shape guarantee (columns/types) enforced before/during build |
| Version | Mechanism for evolving contracts without breaking consumers |
| Constraints | Per-column / per-model rules the warehouse enforces |
| `deprecation_date` | Sunset signal for old versions |
| Exposures (CP3) | Make consumers visible |

### Materialization compatibility
| | Contract | Constraints (enforced) |
|---|---|---|
| view | ❌ | ❌ |
| ephemeral | ❌ | ❌ |
| table | ✅ | ✅ |
| incremental | ✅ | ✅ |
| materialized_view | varies | varies |

### Behavior-change-flag lifecycle phases
1. Introduction (default `false`).
2. Maturity (default flips to `true`).
3. Removal (flag and old behavior deleted).
4. Fusion: all flags removed.

### Compile-related commands
| Command | When |
|---|---|
| `dbt parse` | Validate parse without warehouse |
| `dbt compile` | Render compiled SQL into `target/` |
| `dbt compile --inline` | One-off Jinja-SQL rendering |
| `dbt show` | Compile + execute + preview rows |

---

## File index (this directory)
- `01-model-contracts.md`
- `02-model-versions.md`
- `03-constraints.md`
- `04-debugging-errors.md`
- `05-cmd-compile.md`
- `06-behavior-changes.md`
- `07-global-configs.md`
- *(Missing — provided by user later if available)* `08-data-product-management.md`

## How to study from here
1. Walk through the "publishing a public model" scenario in §10 mentally.
2. Memorize the contract prerequisites and the version naming conventions.
3. Know `not_null` is the only constraint most analytical warehouses enforce.
4. Reproduce the four error-type → likely-cause table.
5. Distinguish `flags:` from resource configs cold.
6. Move to Checkpoint 3.
