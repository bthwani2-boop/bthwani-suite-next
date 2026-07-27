# App Field Workforce Scope Correction — Remote Verification

- Repository: `bthwani2-boop/bthwani-suite-next`
- Verification branch: `work/smar-field-workforce-scope-correction-20260727`
- Verified source commit: `6096c2d8483dcfc145454adf057409bbd9e28f09`
- Workflow run: `30229092581`
- Verified at: `2026-07-27T01:10:01Z`

## Architecture verified

- Field identity is globally owned by `core/workforce` through `actor_id`.
- Merchant `tenant_id` is not part of offline queue or mutation receipt identity.
- Offline queue scope is `actorId + installationId`.
- Replay receipt identity is `actor_id + operation + idempotency_key`.
- Store and partner tenant context remains target-resource authorization data.

## Checks

- Workspace install: PASS
- DSH OpenAPI generation and modular verification: PASS
- app-field TypeScript: PASS
- Identity TypeScript: PASS
- JRN-024 source guard: PASS
- DSH database contract: PASS
- Go formatting: PASS
- Canonical PostgreSQL migrations: PASS
- All field-readiness Go tests: PASS
