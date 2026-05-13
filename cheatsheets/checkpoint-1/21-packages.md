# dbt Packages

**Source:** https://docs.getdbt.com/docs/build/packages
**Type:** Documentation · Checkpoint 1

## What it is
A package is a standalone dbt project (with models, macros, snapshots, etc.) that you import as a library. Adding a package makes its models referencable via `{{ ref('pkg_model') }}` and its macros usable in your own code.

## Common use cases
- **Modeled SaaS datasets** — Snowplow events → sessions, Stripe → standardized billing.
- **Macro utilities** — `dbt_utils` (pivots, surrogate keys, schema tests), `audit_helper`.
- **Adapter helpers** — Redshift privileges, Stitch utilities.

## How to add a package
1. Create `packages.yml` (or `dependencies.yml`) at project root, next to `dbt_project.yml`.
2. Add packages.
3. `dbt deps` to install. Installs under `dbt_packages/` (default; gitignored).

```yaml
packages:
  - package: dbt-labs/dbt_utils
    version: 1.1.1
  - git: "https://github.com/dbt-labs/dbt-utils.git"
    revision: 1.1.1
  - local: /opt/dbt/redshift
```

## Sources of packages

### Hub (recommended)
```yaml
packages:
  - package: dbt-labs/snowplow
    version: 0.7.3
```
- Requires a version. Pin to a patch range:
  ```yaml
  version: [">=0.7.0", "<0.8.0"]
  ```
- Only Hub installs let dbt **dedupe shared transitive dependencies** (e.g., both Snowplow and Stripe depend on `dbt_utils`).
- Prereleases: explicit version `0.4.5-a2` or `install_prerelease: true` with a range.

### Git
```yaml
packages:
  - git: "https://github.com/dbt-labs/dbt-utils.git"
    revision: 1.1.1      # branch, tag, or 40-char commit
```
Includes `subdirectory:` for packages nested in monorepos.

### Internal tarball
```yaml
packages:
  - tarball: https://artifactory.example.com/dbt-utils/1.1.1.tar.gz
    name: 'dbt_utils'
```

### Local
```yaml
packages:
  - local: relative/path/to/subdirectory
```
Best for: monorepos, testing in-development packages, nested integration-test projects.

## Private packages

### Native (recommended)
Uses your existing dbt Cloud git integration — no token wrangling. Supports GitHub, GitLab, Azure DevOps.
```yaml
packages:
  - private: dbt-labs/awesome_repo
    revision: "0.9.5"
    provider: github       # required for Fusion or multi-integration setups
```
Fusion locally uses your SSH config.

### SSH key (CLI only)
```yaml
packages:
  - git: "git@github.com:dbt-labs/dbt-utils.git"
```
Not supported on dbt Cloud.

### Git token (HTTPS)
```yaml
packages:
  - git: "https://{{env_var('DBT_ENV_SECRET_GIT_CREDENTIAL')}}@github.com/dbt-labs/awesome_repo.git"
```
dbt Cloud env vars must be prefixed `DBT_` or `DBT_ENV_SECRET_`.

## `dbt deps` and pinning
- `dbt deps` installs/updates packages.
- Creates/updates `package-lock.yml` (commit this!) — pins every install to a specific commit/version.
- Subsequent `dbt deps` runs reuse the lock until `packages.yml` changes.
- To force upgrades: `dbt deps --upgrade`.
- Unpinned git packages produce a warning; silence with `warn-unpinned: false` (not recommended).

## Configuring an installed package
You can configure a package's models, seeds, and vars from your `dbt_project.yml`:
```yaml
vars:
  snowplow:
    'snowplow:timezone': 'America/New_York'

models:
  snowplow:
    +schema: snowplow

seeds:
  snowplow:
    +schema: snowplow_seeds
```
Configs in *your* `dbt_project.yml` override anything in the package's own config.

## Updating and uninstalling
- **Update**: change version in `packages.yml` → `dbt deps`. You may also need `dbt run --full-refresh` for affected models.
- **Uninstall**: remove from `packages.yml`. Either delete the package folder under `dbt_packages/` or run `dbt clean` to nuke everything, then `dbt deps`.

## Key takeaways
- Packages = importable dbt projects; reference their models via `ref`.
- Install via Hub (preferred — handles transitive deps), git, tarball, local, or private.
- Always pin (or use a range) — commit `package-lock.yml`.
- Configure package models from your own `dbt_project.yml`; your configs win.
- Private packages: prefer the `private:` key with `provider:`.

## Related
- `dbt deps` command.
- `dbt clean`.
- `dispatch` config — override package macros.
- Mesh / `private:` packages for governance.
