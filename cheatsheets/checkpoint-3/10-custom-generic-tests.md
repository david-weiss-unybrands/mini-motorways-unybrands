# Writing Custom Generic Data Tests

**Source:** https://docs.getdbt.com/best-practices/custom-generic-tests
**Type:** Documentation · Checkpoint 3

## What they are
Generic data tests beyond the four built-ins (`unique`, `not_null`, `accepted_values`, `relationships`). A reusable, parameterized assertion you define once and apply across many columns/models.

## Where they live
Two valid locations:
- ✅ **`tests/generic/`** — the conventional home for custom generic tests.
- ✅ **`macros/`** — works because generic tests are macros under the hood. Use this when the test depends on other macros you're co-defining.

## The two standard arguments
Every generic test should accept one or both of:
- **`model`** — the resource being tested, templated to its full relation name. Always called `model` even when applied to a source/seed/snapshot.
- **`column_name`** — the column being tested. Only when the test operates at the column level.

## Minimal example (column-level)

```sql
-- tests/generic/test_is_even.sql
{% test is_even(model, column_name) %}

with validation as (
    select {{ column_name }} as even_field
    from {{ model }}
),
validation_errors as (
    select even_field
    from validation
    where (even_field % 2) = 1
)
select * from validation_errors

{% endtest %}
```

Apply it:
```yaml
# models/users.yml
models:
  - name: users
    columns:
      - name: favorite_number
        data_tests:
          - is_even:
              description: "This is a test"
```

## Tests with extra arguments

```sql
-- tests/generic/test_relationships.sql (rebuild of the built-in)
{% test relationships(model, column_name, field, to) %}

with parent as (
    select {{ field }} as id from {{ to }}
),
child as (
    select {{ column_name }} as id from {{ model }}
)
select *
from child
where id is not null
  and id not in (select id from parent)

{% endtest %}
```

Apply with arguments in a dict (v1.10.5+ syntax; older versions place them at top level):
```yaml
models:
  - name: people
    columns:
      - name: account_id
        data_tests:
          - relationships:
              description: "..."
              arguments:
                to: ref('accounts')
                field: id
```

`model` and `column_name` are provided by context — you don't redeclare them.

## Default config inside a generic test

You can `{{ config(...) }}` inside the test definition. Values become the *defaults* for every use of that test (overridable on each instance).

```sql
-- tests/generic/warn_if_odd.sql
{% test warn_if_odd(model, column_name) %}
    {{ config(severity = 'warn') }}
    select * from {{ model }} where ({{ column_name }} % 2) = 1
{% endtest %}
```
```yaml
columns:
  - name: favorite_number
    data_tests:
      - warn_if_odd                    # severity: warn (default)
  - name: other_number
    data_tests:
      - warn_if_odd:
          arguments:
            severity: error            # overrides
```

## Documenting custom generic tests
Document the underlying macro in a `schema.yml`:

```yaml
# macros/generic/schema.yml
macros:
  - name: test_not_empty_string             # the test block's name with `test_` prefix
    description: Complementary to not_null — also rejects empty strings.
    arguments:
      - name: model
        type: string
        description: Model Name
      - name: column_name
        type: string
        description: Column that should not be empty
```

> **Important:** the *macro* name is `test_<your_test_name>`. The *test block name* (the one users reference in YAML) omits the `test_` prefix.

## Overriding a built-in
To replace a built-in test (e.g., make `unique` ignore nulls differently), define a test block with that exact name in your project. dbt will prefer the project's version over the built-in.

```sql
-- tests/generic/unique.sql
{% test unique(model, column_name) %}
    -- your custom logic
{% endtest %}
```

## When to write one
- You write the same singular test pattern 3+ times → promote to a generic.
- You want the assertion to live as YAML metadata next to a column rather than as a `.sql` file.
- You need a default `severity`/`tags` policy across many models for a given check.

## Don't reinvent
Many useful generic tests already exist:
- `dbt_utils` — `not_constant`, `expression_is_true`, `mutually_exclusive_ranges`, `at_least_one`, `equal_rowcount`, ...
- `dbt-expectations` — Great-Expectations-flavored assertions, especially distribution and statistical checks.

## Key takeaways
- Custom generics are `test` blocks defined in `tests/generic/` (or `macros/`).
- Accept `model` and/or `column_name` as the canonical arguments.
- Add extra arguments and pass them via `arguments:` in YAML (v1.10.5+).
- `{{ config(severity=...) }}` inside the test sets defaults that instances can override.
- Document the underlying macro using a `test_<name>` entry in `macros:`.
- Override built-ins by re-defining a block with the same name in your project.

## Related
- Data tests (the consumer doc).
- Data test configurations (`severity`, `where`, `store_failures`...).
- `dbt_utils`, `dbt-expectations` packages.
- *Test smarter not harder* — what tests to write in the first place.
