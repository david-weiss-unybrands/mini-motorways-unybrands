# The dbt Viewpoint

**Source:** https://docs.getdbt.com/community/resources/viewpoint
**Type:** Reading · Checkpoint 1

## What it is
The 2016 manifesto that defines dbt's reason for existing: treating analytic code like software, so analytics teams can collaborate the way engineering teams do. It's foundational philosophy, not features — but exam questions often probe whether you can articulate *why* dbt looks the way it does.

## The problem it names
Analytics teams ship slow, low-quality output because:
- Knowledge is siloed; analysts duplicate work.
- The same metric is calculated differently in different places.
- Datasets are poorly understood by downstream consumers.

The fix isn't a new BI tool — it's a workflow borrowed from software engineering.

## Three pillars

### 1. Analytics is collaborative
- **Version control** — all analytic code (SQL, Python, anything) belongs in git. Who changed what, when.
- **QA** — code that produces data or analyses must be reviewed and tested.
- **Documentation** — analyses are software; consumers need to know what "Revenue" means.
- **Modularity** — treat a table's schema as a public interface. No copy-paste of business logic; reference shared datasets so a definition change propagates once.

### 2. Analytic code is an asset
- **Environments** — analysts need a place to experiment without affecting production users; users need SLAs on prod data.
- **Service-level guarantees** — production analytics errors are bugs and should be treated with that urgency; retiring something from prod uses a deprecation process.
- **Design for maintainability** — most cost is in maintenance. Anticipate schema/data drift and write code that absorbs it.

### 3. Analytics workflows need automated tools
The manual plumbing (pulling source data, configuring environments, testing, deploying) should be automated. A canonical workflow:
1. Models/analyses pulled from version control,
2. Configured for the target environment,
3. Tested,
4. Deployed — all triggered by a single command.

dbt is dbt Labs' implementation of these ideas.

## Why this matters for the exam
Several certification questions test *concepts* (separation of dev/prod, modularity via `ref`, the idea that the warehouse output is an "asset") more than commands. When you see questions about "why" — environments, why staging-models-as-views, why ref instead of hard-coded table names — the answer almost always traces back to a viewpoint principle.

## Key takeaways
- dbt's design choices (refs, tests, docs, environments) map 1:1 to the pillars above.
- Modularity → schema is the public interface → `{{ ref('...') }}` is the implementation.
- Maintainability is the dominant cost — pick patterns that absorb change.
- Consistency across the team beats individual cleverness.

## Related
- *How we structure our dbt projects* — operationalizes the modularity pillar.
- *Best practice workflows* — the workflow automation pillar in concrete form.
