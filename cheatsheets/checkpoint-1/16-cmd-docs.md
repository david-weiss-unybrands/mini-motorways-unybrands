# `dbt docs`

**Source:** https://docs.getdbt.com/reference/commands/cmd-docs
**Type:** Documentation · Checkpoint 1

## What it does
Generates and serves dbt's documentation website — a browsable view of your project's models, sources, lineage, and column-level metadata.

Two subcommands: `generate` and `serve`. (Fusion 2.0+ replaces `generate` with a `--write-catalog` flag.)

## `dbt docs generate`
Three steps under the hood:
1. Copies the docs site's `index.html` into `target/`.
2. Compiles project resources so their `compiled_code` lands in `manifest.json`.
3. Queries the warehouse for metadata → writes `catalog.json` (column names, types, table stats).

```bash
dbt docs generate
dbt docs generate --select +orders     # limit catalog to selected nodes + upstream
dbt docs generate --no-compile         # skip step 2
dbt docs generate --empty-catalog      # skip step 3 (dev shortcut)
dbt docs generate --static             # single self-contained HTML
```

### `--select`
Restricts step 3 (catalog query) to selected nodes. Step 2 (compile) is unaffected.

> **Perf note**: under 100 selected nodes → filter at DB level via `WHERE` (fast). 100+ → query everything in the schemas, then filter in memory. Final `catalog.json` is post-filtered either way.

### `--no-compile`
Skip re-compilation. Special macros like `generate_schema_name` still run during parsing.

### `--empty-catalog`
Skip the metadata queries. Use only in dev — production docs need column-level info.

### `--static`
Bundles `catalog.json` + `manifest.json` into the `index.html` itself, producing a single shareable HTML file (email, S3-served, etc.).

## `dbt docs serve`
Starts a local webserver on port 8080 rooted at `target/`, opens the docs in your browser.

```bash
dbt docs serve                       # default
dbt docs serve --port 8001           # custom port
dbt docs serve --host ""             # all interfaces (Core only; not Cloud CLI)
dbt docs serve --no-browser          # don't auto-open
```
Requires `dbt docs generate` to have run first (needs `catalog.json`).

- Available in dbt Core and Cloud CLI; **not** in the dbt Studio IDE.
- v1.8.1+ default host is `127.0.0.1`; earlier versions used `""`.

## Fusion: `--write-catalog`
In Fusion 2.0+, you don't run `dbt docs generate` for the catalog — instead pass `--write-catalog` to other commands:
```bash
dbt build  --write-catalog
dbt run    --write-catalog
dbt parse  --write-catalog
dbt compile --write-catalog
```
- Hydrates `catalog.json` *during* the run.
- Faster than the separate-command approach.
- Does **not** produce the static docs site HTML — for that, still use `dbt docs generate` with Core.
- dbt Platform jobs on Fusion auto-substitute `--write-catalog` when `dbt docs generate` is called.

## Artifacts
- `manifest.json` — your project's parsed/compiled state.
- `catalog.json` — warehouse metadata (columns, types, statistics).
- `index.html` — the docs site shell.

## Key takeaways
- `generate` builds the artifacts; `serve` hosts them locally.
- `--select` lets you narrow the catalog query to relevant nodes (fast for <100; in-memory filter beyond).
- `--static` gives you a single-file shareable docs page.
- Fusion uses `--write-catalog` on `build`/`run`/`parse`/`compile` instead of a separate `docs generate`.
- `dbt docs serve` isn't available in Studio IDE.

## Related
- `manifest.json` / `catalog.json` reference (artifacts).
- dbt Explorer (Cloud) — Cloud-hosted docs alternative.
- The `description`, `columns`, doc-block conventions that populate the docs site.
