# WLT Database Runtime

This directory owns WLT financial schema assets only. WLT is the exclusive financial source of truth for wallet, payment, refund, settlement, payout, commission, COD, ledger, reconciliation, and finance-audit state.

## Canonical execution

All WLT schema changes are ordered by `services/wlt/database/migrations/manifest.json` and are executed only through:

```text
infra/docker/scripts/invoke-runtime-database-migrations.ps1
  -> infra/docker/scripts/schema-migration-runner.ps1
  -> schema_migrations
```

The governed runner validates manifest coverage and checksums, rejects dirty or unknown history, and reconciles a valid legacy `runtime_schema_migrations` table once before renaming it to `runtime_schema_migrations_legacy_retired`. Probe-based schema inference, synthesized ledger rows, and mobile/runtime ledger repair scripts are forbidden.

`wlt-904_reconciliation_claim_guard_repair.sql` is a real forward repair. Its live trigger is verified by `services/wlt/database/tests/payout-destination-invariants.sql`; no parallel probe map is authoritative.

## Local fixtures

WLT currently declares an explicit empty local SQL seed set. The declaration is made by `infra/docker/scripts/invoke-runtime-database-seeds.ps1` through `AllowEmptySeedSet`; an absent or empty WLT seed directory is therefore an intentional governed no-op, not a silent skip. Any future WLT local fixture must use `*.local.sql` and the canonical `tools/scripts/invoke-service-seeds.ps1` authority.

## Allowed

- WLT-owned financial tables, constraints, triggers, indexes, and read models.
- Manifest-registered forward migrations.
- Real database invariant tests against the migrated schema.
- DSH references represented as identifiers and validated through approved boundaries.

## Forbidden

- DSH order, catalog, store, dispatch, or workforce ownership.
- Financial mutation or financial truth outside WLT.
- Donor or legacy database names as active runtime authorities.
- Mock, demo, or preview data in runtime migrations.
- Probe-based migration backfill or inferred migration completion.
- Editing applied migrations instead of adding a governed forward migration.
- Recreating `runtime_schema_migrations` as an active ledger.
