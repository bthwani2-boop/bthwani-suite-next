# DSH Database Scripts

`invoke-dsh-database.ps1` is the canonical database entry point for local Docker, CI, and direct PostgreSQL verification.

Supported actions:

```powershell
# Docker-backed local runtime
pwsh -File services/dsh/database/scripts/invoke-dsh-database.ps1 -Action migrate -Transport docker
pwsh -File services/dsh/database/scripts/invoke-dsh-database.ps1 -Action seed -Transport docker -AllowLocalSeeds
pwsh -File services/dsh/database/scripts/invoke-dsh-database.ps1 -Action test -Transport docker -TestSuite schema

# Isolated CI or another explicitly supplied PostgreSQL database
pwsh -File services/dsh/database/scripts/invoke-dsh-database.ps1 -Action migrate -Transport url -DatabaseUrl $env:DATABASE_URL
```

Rules:

- Schema changes are forbidden in ad hoc maintenance scripts; create a migration instead.
- Destructive local diagnostics must be explicit, local-only, and separately reviewed.
- The runner fails closed on migration checksum drift.
- Migration and seed ledger writes occur inside the same transaction as their SQL file.
