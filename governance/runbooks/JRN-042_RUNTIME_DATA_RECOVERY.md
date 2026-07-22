# JRN-042 Runtime, Data, Migrations, Backup and Recovery Runbook

## Scope

This runbook operates the six sovereign services on the canonical runtime only:

- Identity — `58082` — `identity_runtime`
- Workforce — `58086` — `workforce_runtime`
- DSH — `58080` — `dsh_runtime`
- WLT — `58083` — `wlt_runtime`
- Providers — `58087` — `providers_runtime`
- Platform Control — `58088` — `platform_control_runtime`

PostgreSQL remains on loopback `55432`. MinIO remains on loopback `59000/59001`. Redis is inactive and MongoDB is forbidden. Production providers, production deployment and SaaS activation are outside this journey.

## Authority and exact-commit rule

Run from repository root on the resolved `sambassam` commit. The command refuses execution without an immutable 40-character commit SHA. Evidence records the branch and source SHA. A later evidence-record commit does not change the source commit that was tested.

Canonical inputs:

- `infra/docker/compose.runtime.yml`
- `infra/docker/env/runtime.env.example`
- `infra/data-plane/jrn-042-runtime-governance.json`
- `infra/docker/scripts/invoke-runtime-database-migrations.ps1`
- `tools/scripts/run-jrn-042-runtime-data.ps1`

## Static verification

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/run-jrn-042-runtime-data.ps1 `
  -Mode Static
```

This verifies the six-service catalog, unique database ownership, migration policy, outbox worker controls, checksummed backup/restore scripts, pinned observability image, loopback bindings and non-destructive defaults.

## Runtime verification

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/run-jrn-042-runtime-data.ps1 `
  -Mode Runtime `
  -Posture Local
```

The command performs the following sequence:

1. Validates the canonical compose graphs.
2. Starts PostgreSQL and MinIO.
3. Applies ordered, checksummed migrations for all six services using the governed ledger and advisory lock.
4. Builds and starts the six APIs.
5. Verifies public health and database-backed readiness.
6. Reads back each database owner and exact migration-ledger count with zero dirty rows.
7. Verifies durable outbox presence for Identity, DSH and WLT.
8. Starts and probes the pinned Jaeger observability profile.
9. Writes sanitized evidence to `artifacts/jrn-042-runtime-data-evidence.json`.

Use `-Cleanup` to remove containers and networks after verification. Cleanup intentionally does not remove volumes.

## Full disaster-recovery drill

The full drill is intentionally destructive inside an isolated local runtime and therefore requires an explicit switch:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File tools/scripts/run-jrn-042-runtime-data.ps1 `
  -Mode Full `
  -Posture Local `
  -ForceDisasterRecovery `
  -Cleanup
```

The drill:

1. Inserts independent integrity probes into all six databases and governed MinIO.
2. Quiesces the six API writers and MinIO.
3. Creates a checksummed backup manifest for six PostgreSQL databases and MinIO.
4. Mutates the isolated runtime after backup.
5. Restores only after explicit force, manifest verification and checksum verification.
6. Verifies database ownership, table counts, integrity probes and MinIO object integrity.
7. Restarts services and verifies health/readiness.

Never run the automated drill against a production or shared environment.

## Migration failure handling

The migration runner fails closed on:

- dirty ledger rows;
- checksum drift for an applied migration;
- untracked legacy schema;
- concurrent migration execution;
- missing immutable source SHA;
- SQL failure.

Do not edit an applied migration. Create a new forward-fix migration. A data-loss event may require restoring the latest verified backup only after writer quiescence and explicit authorization.

## Outbox and dead-letter handling

Owned workers must retain:

- durable event rows in the service-owned database;
- bounded batch and lease controls;
- bounded retries with attempt count and next-attempt time;
- last-error persistence;
- terminal failed, exhausted or dead-letter state;
- observable backlog and age.

Do not delete failed rows to make the queue appear healthy. Correct the cause, preserve audit evidence, then replay using the owning service's idempotent operation.

## Secret and environment posture

`Local` posture may use values clearly marked as local-only examples. `LiveLike` posture refuses missing, weak, placeholder or development-only values and refuses `WLT_FINANCIAL_PROVIDER_MODE=mock`.

Never commit `.env`, provider credentials, activation secrets, internal service tokens, database passwords, MinIO credentials or payout encryption keys. Logs and evidence must remain sanitized.

## Rollback and recovery decision

Preferred schema rollback is a forward-fix migration. Restore is reserved for verified data-loss recovery.

Before restore:

- confirm explicit force and authorization;
- verify manifest and every SHA-256 checksum;
- verify all six required database roles;
- quiesce writers;
- preserve the failed-state evidence.

After restore:

- verify database ownership and table counts;
- verify MinIO integrity;
- run health and readiness for all six services;
- inspect migration dirty rows and outbox backlog;
- record the exact source SHA and recovery result.

## Decision boundary

A successful executor workflow is implementation/runtime evidence only. It is not Product, QA, Security, Release or Production approval. Release remains `NOT_RELEASED`, production remains `NOT_DEPLOYED`, and SaaS activation remains `NOT_ACTIVATED` until independent protected gates are completed.
