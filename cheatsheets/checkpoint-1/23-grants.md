# `grants` Resource Config

**Source:** https://docs.getdbt.com/reference/resource-configs/grants
**Type:** Documentation · Checkpoint 1

## What it is
A resource config that lets you define warehouse `GRANT` statements declaratively in your dbt project. When the model/seed/snapshot is built, dbt issues `GRANT`/`REVOKE` so the object's permissions exactly match your config.

Applies to: **models, seeds, snapshots** (not sources, not tests).

## Two pieces
- **Privilege** — the action being granted: `select`, `insert`, etc.
- **Grantees** — the recipients (users, groups, roles on Snowflake, service accounts on BigQuery).

## Where to configure

### In `dbt_project.yml`
```yaml
models:
  +grants:
    select: ['user_a', 'user_b']
```

### In a properties YAML
```yaml
models:
  - name: specific_model
    config:
      grants:
        select: ['reporter', 'bi']
```

### In the model SQL via `config()`
```sql
{{ config(grants = {'select': ['user_c']}) }}
```

Same `grants:` syntax for seeds and snapshots — under `seeds:` or `snapshots:` keys.

## Inheritance: clobber vs add

### Default = clobber
The more-specific config replaces the less-specific list.
```yaml
# dbt_project.yml
models:
  +grants:
    select: ['user_a', 'user_b']
```
```sql
{{ config(grants = {'select': ['user_c']}) }}
```
Result: `specific_model` grants `select` to **user_c only**.

### Add with `+` prefix
Prefix the privilege name with `+` to **append** rather than replace:
```sql
{{ config(grants = {'+select': ['user_c']}) }}
```
Result: `user_a`, `user_b`, AND `user_c` all get `select`.

Notes:
- The `+` controls merge behavior **per privilege**. Privileges without `+` still clobber.
- This `+` (inside the grants dict) is distinct from the `+` prefix used to mark configs in `dbt_project.yml`.
- `grants` is currently the only config supporting `+`-prefixed merge behavior.

## Conditional grants (Jinja)
```yaml
models:
  +grants:
    select: "{{ ['user_a', 'user_b'] if target.name == 'prod' else ['user_c'] }}"
```

## Revoking

dbt only manages grants where a `grants` config is attached. Three behaviors:

| To... | Do this |
|---|---|
| Revoke from one user | Remove them from the grants list |
| Revoke from everyone | Set the list to `[]` (empty) |
| Stop managing grants | Delete the `+grants:` block entirely — dbt leaves existing grants alone |

```yaml
models:
  +grants:
    select: []          # revokes all grantees of 'select'
```

## When to fall back to hooks

`grants` is the right call for typical view/table SELECT/INSERT permissions. Use `on-run-end` or `post-hook` SQL when you need:
- Permissions on database objects other than views/tables (e.g., functions, schemas).
- Row-level or column-level security, masking policies, **future grants**.
- Platform-specific advanced features not exposed by the config.
- Complex custom logic.

## Efficiency
dbt picks the most efficient pattern per adapter — replacing object vs. updating in place. Inspect debug logs to see the exact GRANT/REVOKE statements emitted.

## Common patterns
```yaml
# Default for the whole project
models:
  +grants:
    select: ['bi_reader']

# More permissive for marts
models:
  my_project:
    marts:
      +grants:
        +select: ['analyst', 'data_science']    # adds to inherited bi_reader
```

```yaml
# Different grants in prod vs dev
models:
  +grants:
    select: "{{ ['bi_prod'] if target.name == 'prod' else ['bi_dev'] }}"
```

## Key takeaways
- Define grants as configs in `dbt_project.yml`, YAML, or model SQL.
- Default merge = clobber; use `+select`/`+insert`/etc. to add.
- Empty list `[]` revokes all; deleted block stops management.
- Use Jinja for env-specific grants.
- Drop to hooks only when grants config can't express what you need.

## Related
- Hooks & operations — when grants aren't enough.
- `dbt_project.yml` `+` prefix (config marker) vs `+` inside grants dict (merge marker).
- Resource configs reference.
