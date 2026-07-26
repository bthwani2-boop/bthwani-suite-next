# Migration Safety Checklist

This applies to any `.sql` file added under `services/*/database/migrations/` or
`core/*/database/migrations/`.

## Why this exists

`wlt-013_wallet_actor_unique_and_field_commission_effect.sql` shipped an
unconditional `DELETE FROM wlt_wallets WHERE id NOT IN (...)` that discards the
balance of any duplicate wallet row without backing it up or reconciling it.
Because WLT had no migration-ledger table at the time, there was also no
record of what had already run in which environment. Both problems are now
fixed structurally (see below), but the checklist exists so a future migration
doesn't reintroduce the same class of mistake by hand.

## Every migration must

1. **Be idempotent or ledger-tracked.** `Invoke-WltMigrate` / `Invoke-Migrate`
   (DSH) in `infra/docker/scripts/runtime.ps1` record each applied file's
   SHA-256 checksum in a `runtime_schema_migrations` table and refuse to
   silently re-apply a file whose content changed after it was recorded.
   Never edit an already-applied migration file — add a new one.
2. **Prefer additive changes.** New tables, new nullable/defaulted columns,
   new indexes. Avoid `DROP TABLE`, `DROP COLUMN`, or narrowing a `CHECK`
   constraint unless the checklist below is followed.
3. **Never run an unconditional `DELETE` or `UPDATE` that can discard
   financial data** (balances, ledger rows, payout/refund/settlement amounts)
   without first:
   - Logging a dry-run count: run the equivalent `SELECT COUNT(*)` /
     `SELECT ...` for the rows that would be affected and record it in the PR
     description.
   - Snapshotting what would be deleted/changed into an audit table
     (`<table>_pre_migration_snapshot` or similar) in the same migration,
     *before* the destructive statement.
   - Getting explicit reviewer sign-off called out in the PR description
     (not just an approval click — a sentence acknowledging the destructive
     step and why it's safe).
   - Preferring a merge/reconciliation path over a delete when duplicate or
     conflicting rows are involved (e.g. sum conflicting balances into one
     surviving row, or open a reconciliation case, rather than discarding
     either).
4. **Guard `ADD CONSTRAINT` / `CREATE TYPE` / any DDL Postgres doesn't support
   an `IF NOT EXISTS` clause for** with an explicit existence check (e.g.
   `IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '...')`), so the
   file is safe to run twice. Several existing WLT migrations
   (`wlt-002`, `wlt-011`, `wlt-015`) currently skip this — new migrations
   should not repeat that gap even though the ledger now prevents them from
   actually being re-run in practice.
5. **State the rollback story** in the migration file's header comment when
   the change isn't trivially reversible (e.g. a `DROP COLUMN` needs a note on
   how to recover the data if the migration must be rolled back).

## Reviewer checklist (paste into the PR description)

- [ ] Migration is additive, or the destructive-change steps above were
      followed with a logged dry-run count and an audit snapshot.
- [ ] Any new `ADD CONSTRAINT`/`CREATE TYPE`/similar DDL is guarded so the file
      is safe to run twice.
- [ ] No existing, already-applied migration file was edited.
- [ ] Ran the migration against a snapshot of an existing (non-empty)
      environment's schema, not just a fresh database, if the change touches
      a table that predates this migration.
