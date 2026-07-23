# DSH Local Seeds

Only `seeds/local/*.sql` is executable.

Local seeds are development fixtures, not production data. They may run only when the canonical runner receives `-AllowLocalSeeds` and the environment is local, development, test, or CI.

Requirements:

- Each seed must be safe to run repeatedly.
- Use stable identifiers and `ON CONFLICT` behavior deliberately.
- Tenant ownership must be explicit or derived by a database ownership trigger.
- A seed must not move an existing row between tenants during conflict handling.
- Relative times such as `NOW() - INTERVAL ...` are allowed only when the fixture intentionally models a moving local timeline.
- Every run is recorded in `runtime_seed_runs` with SHA-256 checksum, run count, and timestamp.
- CI applies all local seeds twice; the second pass must succeed without duplicate or ownership errors.
