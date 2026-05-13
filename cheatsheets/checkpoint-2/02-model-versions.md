# Model Versions

**Source:** https://docs.getdbt.com/docs/mesh/govern/model-versions
**Type:** Documentation · Checkpoint 2

## What it is
A mechanism for shipping multiple **live, simultaneous versions** of the same model so producers can iterate on breaking changes while consumers get a migration window. Versioning is to dbt models what semver is to public APIs.

## The producer/consumer tension
- **Producer** wants to evolve logic and structure.
- **Consumer** wants stability and notice before things break.

Model versions resolve this by letting both happen concurrently for a while.

## When to version
- A change is **breaking**: column dropped, renamed, type changed, nullability flipped — anything that breaks a contracted shape.
- A recalc that doesn't break the contract but materially changes results (judgment call).

**Don't** version every change. Non-breaking additions (new column, bug fix in an existing column's logic) should go on the latest version. Plan periodic version bumps (1–2× a year) where you sweep out unused columns.

## Versions vs version control vs new model

| | Version control | New model | Model versions |
|---|---|---|---|
| Lives in repo? | Always 1 state on `main` | Independent model | Multiple live versions |
| Deployed at once? | One environment at a time | One name | Multiple at once |
| Notifies consumers? | No | No | Yes (prerelease/deprecation) |
| Reusable config? | – | No | Yes (define diffs only) |

## How `ref` resolves
- `ref('dim_customers')` → resolves to the model's **latest** version automatically.
- `ref('dim_customers', v=1)` → pins to v1.

dbt prints helpful messages when an unpinned `ref` resolves to latest and a prerelease is available:
```
Found an unpinned reference to versioned model 'dim_customers'.
Resolving to latest version: my_model.v2
A prerelease version 3 is available...
```

## File / relation naming convention
| v | version | `ref` syntax | File name | Relation |
|---|---|---|---|---|
| 3 | prerelease | `ref('dim_customers', v=3)` | `dim_customers_v3.sql` | `analytics.dim_customers_v3` |
| 2 | latest | `ref('dim_customers')` or `ref(..., v=2)` | `dim_customers_v2.sql` or `dim_customers.sql` | `analytics.dim_customers_v2` **and** `analytics.dim_customers` (recommended) |
| 1 | old | `ref('dim_customers', v=1)` | `dim_customers_v1.sql` | `analytics.dim_customers_v1` |

## Defining versions in YAML

### Diffs-only style (recommended)
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
      - v: 1
        # matches what's above
      - v: 2
        # breaking change: dropped country_name
        columns:
          - include: all
            exclude: [country_name]
```

### Fully specified
You can also re-state config and columns inline under each version entry.

### `include` / `exclude` helpers
`include: all` plus `exclude: [col1, col2]` produces the diff cleanly — useful when wide models change only a few columns.

## Deprecation
Pair versions with `deprecation_date` to announce a sunset date for old versions. dbt warns consumers as the date approaches. Once past it, the version should be deleted from the project.

The whole loop: **develop new version → bump latest → mark old for deprecation → wait for migration → delete old**.

## Selection by version
`dbt-` selectors support `method: version`:
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
Lets you skip old versions in dev while still building them in prod during the migration window.

## Practical guidance
- Version only models with downstream commitments (public/contracted models).
- Avoid having more than 2–3 live versions at a time — same wisdom as web APIs.
- Communicate deprecation dates clearly and well in advance.
- Each version has its own warehouse relation — be aware of storage cost.

## Key takeaways
- Model versions = multiple live versions of one logical model.
- Breaking changes → new version; non-breaking → just update latest.
- `ref(name, v=N)` to pin; `ref(name)` for latest.
- Define in YAML with `versions:` + `latest_version` + per-version diffs.
- Pair with `contract` to detect breaks and `deprecation_date` to sunset.

## Related
- Model contracts (catches the breaking change).
- `deprecation_date` resource property.
- `ref` with `version` argument.
- `state:modified.body` / version-aware state selection.
