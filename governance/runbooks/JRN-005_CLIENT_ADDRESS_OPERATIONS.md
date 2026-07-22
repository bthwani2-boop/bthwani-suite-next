# JRN-005 — Client Address Operations Runbook

Status: ACTIVE

Owner: DSH Operations

Canonical contract: `services/dsh/contracts/dsh.client-address.openapi.yaml`

## Scope

This runbook covers the authenticated client address book, logical-duplicate protection, default-address invariants, governed service-area binding, soft deletion, privacy retention and checkout address resolution.

## Triage inputs

Record the exact commit, environment, operation ID, HTTP status, error code and `X-Correlation-ID`. Do not copy recipient names, phone numbers, address lines, coordinates or delivery instructions into tickets, logs or chat.

## 5xx burn

1. Confirm DSH health and database readiness.
2. Group failures by operation and error class without PII labels.
3. Check migration order for `dsh-056`, privacy migrations, `dsh-901` and `dsh-906`.
4. Verify PostgreSQL constraint names and trigger presence.
5. Reproduce with synthetic client and address data only.
6. Roll back the application release when failures began after a code deployment; do not roll back constraints while incompatible writers remain active.

## Conflict spike

`ADDRESS_CONFLICT` indicates a stale optimistic-concurrency version. `ADDRESS_ALREADY_EXISTS` indicates an active logical duplicate. Confirm clients refresh the committed list after mutation and preserve create idempotency identity across restarts. Never bypass the unique index or convert either conflict into success.

## Default invariant

Run a read-only diagnostic for clients with more than one active default or active rows with no default. The partial unique index prevents multiple defaults. A missing default requires investigation of direct database writes or an interrupted legacy migration. Repair under an explicit transaction and record an audit event; do not mass-update without owner scoping.

## Privacy job

Confirm `dsh_client_address_privacy_policy` is enabled and the configured batch limit and retention interval are valid. Verify expired soft-deleted rows are selected with `FOR UPDATE SKIP LOCKED`, address-event metadata is scrubbed, the subject link is severed and a privacy event is recorded. Escalate immediately when expired PII remains after its purge deadline.

## Service-area rejection

For `ADDRESS_SERVICE_AREA_UNVERIFIED`, verify that both coordinates are present, the supplied service-area code is active and the point resolves inside the governed polygon. Do not accept free-form area text or bypass geofence validation.

## Duplicate recovery

The client should display the duplicate recovery message, keep the committed list authoritative and allow editing the existing row. Support must not delete an existing address merely to make a repeated create succeed.

## Checkout mismatch

Checkout accepts `deliveryAddressId` only. Confirm `clientaddress.GetOwned` resolves the active row for the authenticated client and that serviceability uses the persisted service-area code and coordinates. Reject client-supplied snapshots as truth.

## Rollback

1. Pause deployment of incompatible writers.
2. Restore the prior application commit.
3. Preserve address rows, soft-delete timestamps, events and privacy audit data.
4. Keep the single-default, owner and active-idempotency constraints enabled.
5. Remove the active fingerprint index only through an approved migration after documenting duplicate risk and a forward-repair plan.
6. Re-run targeted Go, static and PostgreSQL tests before resuming traffic.

## Closure evidence

The journey may be `READY_FOR_REVIEW` after `journeys/jrn-005/all-slices` succeeds on the exact implementation commit. `CLOSED_WITH_EVIDENCE` additionally requires independent Product, QA, Security, Privacy, Accessibility and Release approvals plus device evidence.
