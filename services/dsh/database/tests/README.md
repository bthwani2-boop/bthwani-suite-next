# DSH Database Contract Tests

These tests validate PostgreSQL invariants independently from Go repository tests.

- `schema/`: migration ledger, required tables and columns, identifier compatibility, indexes, constraints, triggers, and tenant ownership.
- `seed/`: local fixture ownership and seed-run audit invariants. Run only after local seeds.

Execution:

```powershell
pwsh -File services/dsh/database/scripts/invoke-dsh-database.ps1 -Action test -Transport docker -TestSuite schema
pwsh -File services/dsh/database/scripts/invoke-dsh-database.ps1 -Action test -Transport docker -TestSuite seed
```

CI applies migrations, reruns migrations, executes schema tests, applies local seeds twice, and then executes seed tests before backend tests and build.
