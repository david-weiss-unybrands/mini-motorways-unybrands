# How We Structure — The Rest of the Project

**Source:** https://docs.getdbt.com/best-practices/how-we-structure/5-the-rest-of-the-project
**Type:** Reading · Checkpoint 1

## What it is
Everything outside `models/`: YAML configuration strategy, the auxiliary folders (`seeds`, `analyses`, `tests`, `snapshots`, `macros`), and when to split a monolithic project.

## YAML strategy

### ✅ Config per folder (recommended)
- One `_[directory]__models.yml` per model directory (configures all models in that folder).
- For staging: also `_[directory]__sources.yml`.
- For doc blocks: `_[directory]__docs.md`.
- Leading underscore sorts YAML to the top of the folder, separating it from SQL files visually.
- File names don't need to be globally unique (unlike SQL model files).

### ❌ Config per project
Everything in one giant YAML file. Easy to find the file; impossible to find the config inside.

### ⚠️ Config per model
One YAML per SQL file. Some teams like it (instant file-tree spotting of models without configs). But the tab-juggling slows development for most teams.

### ✅ Cascade configs in `dbt_project.yml`
Set defaults at the directory level; override per-model only when needed.

```yaml
# dbt_project.yml
models:
  jaffle_shop:
    staging:
      +materialized: view
    intermediate:
      +materialized: ephemeral
    marts:
      +materialized: table
      finance:
        +schema: finance
      marketing:
        +schema: marketing
```

## Tags vs folders
- ✅ Folders are the *primary* selector mechanism (`dbt build --select marts.marketing`).
- ⚠️ Tags should mark **exceptions** — groups that cut across folders.
- ❌ Tagging every model defeats the purpose; over-reliance on tags is a structure smell.

## Groups
A *group* is a collection of nodes in the DAG that enables intentional collaboration and **restricts access to private models**. Useful for multi-team or mesh setups (see `access` resource config).

## The other folders

| Folder | ✅ Use for | ❌ Avoid |
|---|---|---|
| `seeds/` | Small lookup tables (zip→state, UTM→campaign) | Loading source data — use an EL tool |
| `analyses/` | Auditing queries you want versioned with Jinja but never materialized; common use: `audit_helper` migration queries | – |
| `tests/` | Singular tests when generic packages (`dbt-utils`, `dbt-expectations`) don't cover the case; especially good for testing interactions between specific models | – |
| `snapshots/` | Type-2 SCDs from Type-1 source data | – |
| `macros/` | DRY-ing transformations; document each with `_macros.yml` | – |

## Project splitting (when to break up the monolith)
Default recommendation: use **dbt Mesh** rather than copying code between projects.

### ✅ Good reasons to split
- **Business domains owning their data products** (the primary Mesh use case).
- **Data governance** — e.g., PII restricted to a small team; import their staging project as a private package.
- **Project size** — thousands of models hurt developer experience.

### ❌ Bad reasons to split
- **ML vs. reporting** — same data, same single source of truth; both should consume the same marts and metrics.

## Key takeaways
- One YAML per directory; sources YAML in staging dirs; doc blocks in `_*__docs.md`.
- Cascade defaults from `dbt_project.yml` down through folders.
- Folders select; tags label exceptions; groups govern access.
- Seeds = lookups, not source data.
- Singular tests are for cross-model logic that generic tests can't express.
- Split with Mesh when domains, governance, or size demand it — not for use-case taxonomy.

## Related
- `dbt_project.yml` reference for full config cascade syntax.
- Groups / access configs for governance.
- Mesh module (Checkpoint 2) for project-splitting mechanics.
