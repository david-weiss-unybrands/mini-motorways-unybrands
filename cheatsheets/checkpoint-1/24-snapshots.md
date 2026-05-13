# Snapshots — Add Snapshots to Your DAG

**Source:** https://docs.getdbt.com/docs/build/snapshots
**Type:** Documentation · Checkpoint 1

## What it is
Snapshots implement **Type-2 Slowly Changing Dimensions** on top of mutable source tables. They record changes over time by adding rows with validity windows (`dbt_valid_from` / `dbt_valid_to`).

## The problem they solve
Source data:
| id | status  | updated_at |
|----|---------|-----------|
| 1  | pending | 2024-01-01 |

After the order ships, source overwrites the row:
| id | status  | updated_at |
|----|---------|-----------|
| 1  | shipped | 2024-01-02 |

You've lost the "pending" history. Snapshot table:
| id | status  | updated_at | dbt_valid_from | dbt_valid_to |
|----|---------|-----------|----------------|--------------|
| 1  | pending | 2024-01-01| 2024-01-01     | 2024-01-02   |
| 1  | shipped | 2024-01-02| 2024-01-02     | NULL         |

## Configuration (v1.9+ YAML form)

```yaml
# snapshots/orders_snapshot.yml
snapshots:
  - name: orders_snapshot
    relation: source('jaffle_shop', 'orders')
    config:
      schema: snapshots
      unique_key: id
      strategy: timestamp
      updated_at: updated_at
      dbt_valid_to_current: "to_date('9999-12-31')"   # optional
      hard_deletes: invalidate                          # ignore | invalidate | new_record
```

| Config | Required? | Notes |
|---|---|---|
| `strategy` | ✅ | `timestamp` or `check` |
| `unique_key` | ✅ | column name, array, or expression |
| `updated_at` | for `timestamp` strategy | column tracking last-modified time |
| `check_cols` | for `check` strategy | list of columns or `'all'` |
| `database` / `schema` / `alias` | optional | (v1.9 made `target_schema`/`target_database` optional) |
| `dbt_valid_to_current` | optional | replace NULL with a sentinel value (e.g. `9999-12-31`) |
| `snapshot_meta_column_names` | optional | rename `dbt_valid_from` etc. |
| `hard_deletes` | optional | how to handle deletes — see below |

## Two strategies

### `timestamp` (recommended)
Uses an `updated_at` column. If a row's `updated_at` > the snapshot's last seen value, the old version is invalidated and a new row inserted.
- Tracks **one** column.
- Handles new/removed source columns gracefully.
- Doesn't need updating when source schema evolves.

### `check`
Compares specified columns between current and historical values. Use when no reliable `updated_at` exists.
```yaml
strategy: check
check_cols: ["status", "shipping_address"]
# or: check_cols: 'all'   (not recommended — fragile to schema change)
```

## Hard deletes (v1.9+)
- `ignore` (default) — deleted source rows just stop updating; their last version stays "current".
- `invalidate` — closes the validity window (sets `dbt_valid_to`).
- `new_record` — inserts a new row marking the deletion.

## Add a snapshot — workflow
1. Create `snapshots/orders_snapshot.yml`.
2. Pick `timestamp` if you have a reliable `updated_at`; otherwise `check`.
3. (Optional) Use an ephemeral model to clean/dedup source before snapshotting:
   ```sql
   -- models/ephemeral_orders.sql
   {{ config(materialized='ephemeral') }}
   select * from {{ source('jaffle_shop','orders') }}
   ```
   Then `relation: ref('ephemeral_orders')`.
4. `dbt snapshot` — initial run captures current state with `dbt_valid_to = NULL` (or `dbt_valid_to_current`).
5. Reference downstream: `{{ ref('orders_snapshot') }}`.
6. Schedule `dbt snapshot` regularly.

## How it works
- **First run:** select-statement output + meta columns; all rows current.
- **Subsequent runs:** changed rows get `dbt_valid_to` set, new versions inserted with `dbt_valid_to = NULL`.

## Best practices
- ✅ Prefer `timestamp` strategy.
- ✅ Use `dbt_valid_to_current` for easier range queries.
- ✅ Add a uniqueness test on the source for `unique_key` — duplicate keys destroy history.
- ✅ Keep snapshots in a **separate schema**, restricted permissions. Snapshots cannot be rebuilt.
- ✅ Use an ephemeral model to clean source before snapshotting.

## v1.12+ tip
You can `dbt compile` to inspect the SQL dbt generates for the snapshot — the file lands in `target/compiled/`.

## Key takeaways
- Snapshots = T2 SCD: keep `dbt_valid_from`/`dbt_valid_to` for every change.
- `timestamp` strategy unless you can't.
- Snapshots are write-only history — protect them; don't drop.
- v1.9 made YAML the canonical config format and added `hard_deletes`.
- Define `unique_key` truly uniquely; test it.

## Related
- `dbt snapshot` command.
- Snapshot configs reference.
- Snapshot meta columns / `snapshot_meta_column_names`.
