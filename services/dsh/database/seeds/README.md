# DSH Local Seeds

Only `seeds/local/*.local.sql` is executable by the canonical seed runner.

Local seeds are development fixtures, not production data. They may run only when the canonical runner receives `-AllowLocalSeeds` and the environment is local, development, test, or CI.

Requirements:

- Each seed must be safe to run repeatedly.
- Use stable identifiers and `ON CONFLICT` behavior deliberately.
- OperatorContext ownership must be explicit or derived by a database ownership trigger.
- A seed must not move an existing row between OperatorContexts during conflict handling.
- Relative times such as `NOW() - INTERVAL ...` are allowed only when the fixture intentionally models a moving local timeline.
- Every applied seed is recorded in the shared `runtime_seed_history` ledger under `service_name = 'dsh'`, with seed name, SHA-256 checksum, source commit SHA, run count, and timestamp.
- `runtime_seed_history` is the only local-seed execution ledger; service-specific aliases are forbidden.
- CI applies the governed local seed set twice; the second pass must succeed without duplicate, checksum, or ownership errors.
