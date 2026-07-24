# DSH Database Runtime

This directory owns the PostgreSQL schema and local-development fixtures for the DSH service only.

## Canonical execution

All database operations must use:

```powershell
services/dsh/database/scripts/invoke-dsh-database.ps1
```

The runner supports Docker-backed local development and direct `DATABASE_URL` execution in isolated CI. It provides atomic migrations, immutable SHA-256 migration history, audited local seeds, and standalone SQL contract tests.

## Tenant context

Root DSH records must receive tenant ownership explicitly or from the trusted PostgreSQL session setting `bthwani.tenant_id`. The backend or worker connection owns this setting; it is not accepted from an untrusted client and is not installed as a column or database default by migrations.

Child records derive tenant ownership from their owning partner or store. Tenant ownership is immutable after persistence, and a missing explicit, parent-derived, or trusted session tenant fails closed.

## Directory ownership

- `migrations/`: the only executable source of schema changes, constraints, triggers, read models, and operational indexes.
- `seeds/local/`: deterministic local-development fixtures. These are forbidden in staging and production.
- `scripts/`: governed database runners and diagnostics. Scripts must not bypass migration history to change schema.
- `tests/schema/`: schema, identifier-type, constraint, and tenant-isolation contracts.
- `tests/seed/`: local seed ownership and idempotency contracts.

There is no executable `indexes/` lane. Every index required by runtime must be introduced by a migration so it is ordered, atomic, checksum-protected, and verified in CI.

## Allowed

- DSH-owned tables and relationships.
- DSH migrations and tenant-safe data backfills.
- Local fixtures under `seeds/local` only.
- DSH indexes introduced through migrations.
- Read models owned by DSH.
- Database contract tests that fail closed on schema drift.
- Trusted server-side tenant context established by the backend, worker, or isolated CI connection.

## Forbidden

- WLT wallet, payment, refund, settlement, or ledger schema.
- Donor or legacy database names.
- Mock, demo, or preview data in runtime migrations.
- Executing `seeds/local` in staging or production.
- Editing a migration after it has been applied.
- Schema-changing maintenance scripts outside `migrations/`.
- Identifier relationships whose PostgreSQL types do not match their owning keys.
- Installing a global tenant default or accepting tenant ownership directly from an untrusted request.
