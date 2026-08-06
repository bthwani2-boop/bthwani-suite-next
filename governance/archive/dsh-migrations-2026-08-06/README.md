# Retired: dsh-991_eradicate_store_team_members.sql

**Classification:** `DUPLICATE_MERGED`

## Why this was retired, not registered

`tools/diagnose-implementing/dsh-wlt-remaining-gaps-2026-08-06` (FND-0010)
found this file present on disk but absent from both
`services/dsh/database/migrations/manifest.json` and
`manifest.extensions.json`, causing the canonical migration runner's
fail-closed drift check (`infra/docker/scripts/schema-migration-runner.ps1:206-208`)
to fail in CI.

The package's prescribed fix was to *register* the file. That fix is wrong:
the file's entire body is

```sql
DROP TABLE IF EXISTS dsh_store_team_member_actions CASCADE;
DROP TABLE IF EXISTS dsh_store_team_members CASCADE;
```

which is byte-for-byte identical to the first two `DROP TABLE` statements in
`dsh-990_workforce_assignment_cleanup.sql:14-15`, a migration that is already
`HISTORICAL_IMMUTABLE` and sorts before this file. Registering it would
permanently append a no-op to the canonical migration chain.

## Disposition

Retired here instead. It is never read by the migration runner (only files
under `services/dsh/database/migrations/` are), so the drift check now
reports zero unregistered files without ever having applied this file
anywhere. The tables it targets are dropped exactly once, by dsh-990.

No other file, test, or script references
`dsh-991_eradicate_store_team_members.sql` by name (verified by repo-wide
search before the move).
