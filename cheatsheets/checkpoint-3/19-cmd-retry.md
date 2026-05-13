# `dbt retry`

**Source:** https://docs.getdbt.com/reference/commands/retry
**Type:** Documentation · Checkpoint 3

## What it does
Re-executes the **last invocation from the point of failure**. dbt reads `run_results.json` (in `target/` by default, or wherever `--state` points), skips everything that already succeeded, and reruns the failing nodes (and any that were skipped because of them).

If the previous command finished successfully, `dbt retry` is a no-op.

## Supported commands
`build`, `compile`, `clone`, `docs generate`, `seed`, `snapshot`, `test`, `run`, `run-operation`.

## What it inherits from the prior invocation
- The original `--select` / `--exclude` / `--selector` choices.
- The same target, profile, vars (unless you override).

In **Core**, you cannot override the selection — retry reuses the prior run's selection set exactly.

In **Fusion**, you **can** narrow the retry scope with `--select`, `--exclude`, `--selector` — those override the prior invocation's selection.

## Core flags
```
--threads INT             override original thread count
--vars YAML               override vars
--target NAME             different target
--profile NAME            different profile
--profiles-dir PATH       where profiles.yml lives
--project-dir PATH        where dbt_project.yml lives
--target-path PATH        override target directory
--state PATH              read run_results.json from elsewhere (defaults to target/)
--full-refresh            force incrementals to full-refresh
```

`dbt retry --help` for the full list your local build supports.

## Fusion flags (v2.0+)
```
-t, --target TARGET
--project-dir PATH
--profile PROFILE
--profiles-dir PATH
--packages-install-path PATH
--target-path PATH
--vars VARS
--select / --exclude / --selector       (Fusion only — overrides prior selection)
```

## dbt Platform CLI note
When using the dbt Platform CLI against a Cloud environment, `dbt retry` accepts only a small subset of overrides — typically `--threads`, `--vars`, and a few others. Run `dbt retry --help` locally for your CLI's exact list.

## How it works under the hood
- Reads `run_results.json` to identify each node's last status.
- Builds the *remaining* DAG: failed nodes + their previously-skipped descendants.
- Runs that subset, **idempotently** — given the same code and same data, repeated retries (without fixing the bug) produce the same failure each time.

## When retry won't help
If the previous run failed **before** any node executed — for example, a warehouse connection or permission error — there are no recorded nodes for retry to use. dbt's recommendation: inspect `run_results.json`, manually re-run the full job, and once nodes have started executing, retry becomes useful.

## Example flow

### Initial run with a syntax error
```
1 of 5 OK   created sql view model stg_customers
2 of 5 OK   created sql view model stg_orders
3 of 5 OK   created sql view model stg_payments
4 of 5 ERROR creating sql table model customers      <-- syntax error
5 of 5 OK   created sql table model orders

Completed with 1 error. PASS=4 ERROR=1 SKIP=0 TOTAL=5
```

### Retry without fixing — still fails
```
1 of 1 ERROR creating sql table model customers
```
Idempotent — same input, same output.

### Fix the SQL, then retry
```
1 of 1 OK   created sql table model customers
Done. PASS=1 ERROR=0 TOTAL=1
```
Only the failing node ran. Everything upstream/successful was skipped.

## How retry pairs with microbatch
The microbatch incremental strategy makes each time-window batch its own retryable node. `dbt retry` reruns just the **failed batches**, not the whole model — a big win for big time-series tables.

## Common patterns
```bash
# Standard retry of the prior invocation
dbt retry

# Retry but bump threads
dbt retry --threads 16

# Retry with overridden vars
dbt retry --vars '{"backfill_date": "2024-01-15"}'

# Force incrementals to rebuild in the retry
dbt retry --full-refresh

# Retry reading state from a CI artifact path
dbt retry --state path/to/saved-target
```

## Where retry fits in the resilience story (CP3)
- A scheduled `dbt build` fails partway through.
- Operator gets paged.
- After diagnosing & fixing (probably with `dbt show` + `target/run/`), `dbt retry` finishes the job — no recomputing everything that already succeeded.
- Cheaper than a full rerun; faster mean-time-to-recovery.

Microbatch + retry is the canonical "resilient pipeline at scale" pattern: long time-series rebuilds are split into batches, failures retry per-batch.

## Key takeaways
- `dbt retry` resumes the prior invocation from where it failed, using `run_results.json`.
- Idempotent — same inputs, same outcome, until you fix something.
- Inherits original selection on Core; Fusion lets you override `--select`/`--exclude`.
- Works with: `build`, `compile`, `clone`, `docs generate`, `seed`, `snapshot`, `test`, `run`, `run-operation`.
- If the prior run failed pre-node-execution, retry has nothing to resume — rerun the full job.
- Combine with microbatch for per-batch retry on huge time-series models.

## Related
- `run_results.json` artifact.
- Microbatch incremental models (per-batch retry).
- `result:` selectors — the more flexible "pick up failures" alternative.
- `--state` flag.
