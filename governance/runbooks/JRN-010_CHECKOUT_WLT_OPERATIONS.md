# JRN-010 — Checkout and WLT Operations Runbook

Status: ACTIVE  
Owner services: DSH + WLT boundary  
Required surfaces: app-client, control-panel, DSH backend/PostgreSQL, WLT  
Financial authority: WLT only

## Purpose

Operate and recover the checkout-to-WLT payment-session handoff without creating duplicate payment sessions, duplicating discounts, editing financial truth in DSH, or losing tenant isolation.

## Normal path

1. The authenticated client creates a checkout intent with a 16–200 character `Idempotency-Key`.
2. DSH validates cart ownership, current item snapshots, store, fulfillment mode, address ownership, serviceability, delivery pricing and coupon eligibility.
3. DSH persists the checkout intent and pricing snapshot.
4. DSH requests a WLT payment-session reference with `dsh-checkout-intent:<intentId>` as the stable WLT idempotency key.
5. DSH stores only the opaque WLT session reference and projected payment status.
6. WLT posts authenticated payment-session events. DSH records the event receipt and updates checkout/coupon projections in one PostgreSQL transaction.
7. The app polls canonical DSH checkout state; the operator screen reads the same projection.

## Operational queues

### Unknown WLT outcome

Filter the control-panel checkout screen by `wlt_outcome_unknown`.

- Do not create a manual WLT session.
- Use the governed reconcile action. It reuses the stable checkout-owned WLT idempotency key.
- A repeated unknown result keeps the checkout recoverable.
- A definitive failure moves the checkout to `wlt_handoff_failed` and releases applicable operational reservations.
- A successful read/create response attaches the existing WLT session and moves the checkout to `payment_pending`.

Database diagnostic:

```sql
SELECT id, tenant_id, client_id, state, wlt_payment_session_id,
       reconciliation_attempt_count, updated_at
FROM dsh_checkout_intents
WHERE state = 'wlt_outcome_unknown'
ORDER BY updated_at ASC;
```

### Unapplied WLT event receipt

```sql
SELECT event_key, tenant_id, checkout_intent_id, payment_session_id,
       wlt_status, delivery_attempt_count, received_at, last_received_at
FROM dsh_checkout_wlt_event_receipts
WHERE applied_at IS NULL
ORDER BY received_at ASC;
```

A normal request cannot commit an unapplied receipt because receipt, checkout projection and coupon projection share one transaction. Any row returned by this query requires database/runtime investigation before retrying delivery.

### Replayed event

An identical event key and payload is safe. DSH increments `delivery_attempt_count`, returns `replayed=true`, and does not create a second financial or coupon effect. Reuse of the same event key with a different tenant, checkout, session or status returns `WLT_EVENT_REPLAY_CONFLICT` and must be treated as a service integration incident.

## Alerts and service-level indicators

Monitor:

- Count and oldest age of `wlt_outcome_unknown` intents.
- Count and oldest age of receipts with `applied_at IS NULL`.
- Rate of `WLT_EVENT_REPLAY_CONFLICT`.
- Rate of `PAYMENT_SESSION_MISMATCH` and tenant mismatch database violations.
- Rate of `WLT_HANDOFF_UNAVAILABLE` and reconciliation failures.
- Checkout creation latency and WLT session handoff latency.
- Difference between payment-pending checkout count and WLT active payment-session references.

Suggested operational thresholds:

- Warning: unknown outcome older than 60 seconds.
- Critical: unknown outcome older than 5 minutes or more than 10 concurrent unknown outcomes per tenant.
- Critical: any unapplied receipt older than 30 seconds.
- Critical: any tenant/session mismatch or replay conflict.

Thresholds are operational defaults and require production tuning; they do not change domain truth.

## Security and privacy

- Client routes require the authenticated `client` actor and tenant/client ownership.
- Operator list requires operations read permission; reconcile requires operations manage permission.
- WLT event delivery requires the WLT service caller token.
- Never expose coupon code, wallet credentials, provider token, payment instrument data or ledger details in DSH logs or UI.
- `delivery_address` is an operational checkout snapshot and must follow the address retention/privacy policy.
- Never use a default or synthetic tenant for a new checkout or event.

## Runtime verification

Run from repository root:

```powershell
pwsh -NoProfile -File infra/docker/scripts/runtime.ps1 -Action up -Profiles dsh,wlt
pwsh -NoProfile -File infra/docker/scripts/runtime.ps1 -Action migrate -Profiles dsh,wlt
pwsh -NoProfile -File infra/docker/scripts/runtime.ps1 -Action seed -Profiles dsh,wlt
pwsh -NoProfile -File infra/docker/scripts/runtime.ps1 -Action smoke -Profiles dsh,wlt
```

Apply the JRN-010 invariant test to `dsh_runtime` after migrations and seeds:

```powershell
Get-Content services/dsh/database/tests/dsh-910_jrn_010_wlt_event_receipts.sql -Raw |
  docker compose --env-file infra/docker/env/runtime.env.example -f infra/docker/compose.runtime.yml exec -T postgres \
  psql -U dsh_runtime -d dsh_runtime -v ON_ERROR_STOP=1
```

## Rollback

Rollback is a coordinated code rollback, not a manual financial correction.

1. Stop new releases that contain the defective change.
2. Preserve all rows in `dsh_checkout_wlt_event_receipts`; do not delete event evidence.
3. Roll back the application commits through a normal revert commit. Do not force-push the branch.
4. Do not drop `dsh_checkout_wlt_event_receipts`, the tenant/session trigger, or observability columns during incident response. They are backward-compatible evidence structures.
5. Keep WLT as the financial authority and reconcile any affected checkout by its WLT payment-session reference.
6. Verify coupon reservation status against checkout intent and order truth before re-enabling mutations.
7. Re-run the dedicated JRN-010 workflow and runtime database invariants on the rollback commit.

For a forward database correction, add a new migration. Never edit an applied migration whose checksum is recorded by `runtime_schema_migrations`.

## Closure policy

Technical completion requires all JRN-010 functional slices and FS-01..FS-18 to pass on one commit under `journeys/jrn-010/all-slices`. Final `CLOSED_WITH_EVIDENCE` additionally requires independent Product Owner, QA/device/accessibility, Security/Finance boundary and Release/Production approvals.
