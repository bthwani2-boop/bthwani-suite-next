# JRN-004 — Store Discovery and Governance Operations

Status: `ACTIVE_RUNBOOK`

Owner: `DSH Operations`

## Primary health checks

1. Confirm `GET /dsh/health` and `GET /dsh/readiness` succeed.
2. Confirm public `GET /dsh/stores?cityCode=...&serviceAreaCode=...&limit=20&offset=0` returns the expected page.
3. Confirm operator `GET /dsh/operator/stores?limit=20&offset=0` returns matching pagination metadata.
4. Open the store detail, publication diagnostics, and audit trail using the same store ID.
5. Use `correlationId` from the audit event to trace a mutation attempt.

## Publication incident diagnosis

Check blockers from `/dsh/operator/diagnostics/stores/{storeId}` in this order:

1. `STORE_NOT_ACTIVE`
2. `STORE_HIDDEN`
3. `STORE_NOT_SERVICEABLE`
4. `PARTNER_NOT_READY`
5. `CATALOG_NOT_APPROVED`
6. `MARKETING_HIDDEN`
7. `DELIVERY_MODES_MISSING`
8. `ADDRESS_MISSING`
9. `COVERAGE_MISSING`
10. `OPERATING_HOURS_MISSING`
11. `DELIVERY_NOT_READY`
12. `STORE_LOGO_MISSING`
13. `STORE_COVER_MISSING`

Never repair publication by changing a surface-local value. Apply the governed owner action and verify detail, diagnostics, list, and audit readback.

## Actor-scope incident

- `403`: verify role, surface, permission and active `dsh_store_actor_scopes` row.
- `404` or scoped not found: verify the requested store ID belongs to the actor scope.
- Do not create an `all` scope for a partner, field agent or captain as a shortcut.
- Operator fallback role is migration compatibility; prefer explicit `partners.read` or `partners.manage` permission.

## Mutation failure handling

- `409`: reload the store, use the new version and start a new mutation attempt.
- Network timeout after submit: retry with the same Idempotency-Key until readback is known.
- Idempotency conflict: compare request payload and correlation ID; do not reuse the key for a different request.
- Field verification rejection: confirm visit ownership, completion, required checklist/evidence and open escalations.
- Captain blocked readiness: retain the reason and do not start pickup until operational context is complete.

## Emergency hide and reactivation

1. Use operator governance to set visibility hidden or partner readiness blocked.
2. Supply a specific reason and correlation ID.
3. Confirm the audit row exists and public discovery no longer returns the store.
4. Resolve all diagnostics blockers.
5. Reactivate through a new governed action with the current version.
6. Confirm public list/detail, partner context, captain/field context, diagnostics and audit readback.

## Idempotency retention

- `dsh_store_idempotency.expires_at` defaults to seven days.
- A governed cleanup worker may delete rows only after `expires_at` and only when no incident or replay investigation is active.
- Store action audit is not deleted by the idempotency cleanup.

## Rollback

- Revert code commits only after hiding affected stores when customer impact is possible.
- Do not delete audit, verification or readiness history.
- Database rollback may remove JRN-004 indexes and constraints only after confirming no dependent query or cleanup worker.
- Re-run `.github/workflows/jrn-004-fullstack-slices.yml` after rollback or forward repair.

## FS-15 decision

`CLOSED_WITH_IMPLEMENTATION_EVIDENCE`: support diagnosis, metrics, incident response, retention and rollback procedures are defined and checked by the JRN-004 gate.
