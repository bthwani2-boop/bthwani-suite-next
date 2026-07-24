# DSH Migrations

This directory is the only executable source of DSH schema evolution.

Rules:

1. Applied migrations are immutable. Never edit history; add a new migration.
2. Files execute in lexical filename order through the canonical database runner.
3. Every file is wrapped in one PostgreSQL transaction together with its migration-ledger record.
4. `CREATE INDEX CONCURRENTLY` is forbidden in this atomic lane and requires a separately governed online procedure.
5. Runtime indexes, constraints, triggers, functions, and tenant-safe backfills belong here.
6. DSH identifiers used in relationships must use the same PostgreSQL type as their owning primary or unique key.
7. WLT financial schema is forbidden.

Legacy-compatible filename pattern:

```text
dsh-NNN[_or_legacy_letter]_descriptive_name.sql
```

Existing historical names remain valid. New migrations must use the next unallocated numeric sequence and a descriptive snake-case suffix.
