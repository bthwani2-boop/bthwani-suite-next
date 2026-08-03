# DSH Database Runtime

This directory owns the PostgreSQL schema and local-development fixtures for the DSH service only. DSH owns operational commerce, store, catalog, order, dispatch, and DSH access-scope truth; it does not own WLT financial truth or Workforce employment-profile truth.

## Canonical execution

The service-facing command is:

```powershell
services/dsh/database/scripts/invoke-dsh-database.ps1
```

It is a thin adapter, not an independent migration or seed engine. The authoritative chains are:

```text
migrations/manifest.json + manifest.extensions.json
  -> infra/docker/scripts/schema-migration-runner.ps1
  -> schema_migrations

seeds/local/*.local.sql
  -> tools/scripts/invoke-service-seeds.ps1
  -> runtime_seed_history
```

Docker runtime and isolated CI use the same engines. The migration runner validates exact manifest coverage, explicit ordering, portable SHA-256 checksums, dirty state, and any governed legacy-ledger reconciliation. A valid historical `runtime_schema_migrations` table is imported once and renamed to `runtime_schema_migrations_legacy_retired`; conflicting or inferred history fails closed.

The seed runner accepts only `*.local.sql`, rejects embedded transaction control and psql meta-commands, normalizes checksums across LF/CRLF worktrees, and commits each fixture together with its history record in one transaction. DSH does not permit an empty local seed set.

## Operator context

Root DSH records must receive operator-context ownership explicitly or from the trusted PostgreSQL session setting `bthwani.operator_context_id`. The backend or worker connection owns this setting; it is not accepted from an untrusted client and is not installed as a column or database default by migrations.

Child records derive operator-context ownership from their owning partner or store. Operator-context ownership is immutable after persistence, and a missing explicit, parent-derived, or trusted session operator context fails closed.

`dsh_store_actor_scopes` represents DSH-owned operational access to DSH stores. It does not own Workforce employment, activation, supervisor, shift, or HR profile state. Workforce remains the owner of those records and DSH consumes them only through approved service boundaries.

## Directory ownership

- `migrations/`: the only executable source of schema changes, constraints, triggers, read models, and operational indexes.
- `migrations/manifest.json` and `manifest.extensions.json`: the executable ordering and checksum authority.
- `seeds/local/`: deterministic local-development fixtures named `*.local.sql`; forbidden in staging and production.
- `scripts/`: thin service adapters and read-only/assertion diagnostics; no parallel schema or seed engine is allowed.
- `tests/schema/`: schema, identifier-type, constraint, and operator-context isolation contracts.
- `tests/seed/`: local seed ownership and idempotency contracts.

There is no executable `indexes/` lane. Every runtime index must be introduced by a migration so it is ordered, atomic, checksum-protected, and verified in CI.

## Allowed

- DSH-owned tables and relationships.
- Manifest-registered forward migrations and operator-context-safe data backfills.
- Governed local fixtures under `seeds/local` only.
- DSH indexes introduced through migrations.
- DSH-owned read models and operational projections.
- Database contract tests that fail closed on schema drift.
- Trusted server-side operator context established by the backend, worker, or isolated CI connection.
- Opaque WLT decision references required for DSH operational flows, without duplicating wallet balances, financial policy, or ledger truth.

## Forbidden

- WLT wallet, payment, refund, settlement, commission, payout, reconciliation, or ledger truth in DSH.
- Workforce HR or employment-profile truth in DSH.
- Donor or legacy database names as active authorities.
- Mock, demo, or preview data in runtime migrations.
- Executing local fixtures in staging or production.
- Editing an applied migration instead of adding a governed forward migration.
- Probe-based migration inference, synthesized migration rows, or automatic ledger repair.
- Schema-changing maintenance scripts outside `migrations/`.
- Identifier relationships whose PostgreSQL types do not match their owning keys.
- Installing a global operator-context default or accepting ownership directly from an untrusted request.
