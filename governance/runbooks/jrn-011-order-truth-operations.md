# JRN-011 — Order Truth Operations Runbook

Status: `ACTIVE_CANONICAL`

## Service objectives

| Signal | Target | Alert |
|---|---:|---:|
| Order creation availability | ≥ 99.9% per 30 days | < 99.5% for 10 minutes |
| p95 order creation latency | ≤ 1.5 seconds | > 2.5 seconds for 10 minutes |
| p95 actor-scoped read latency | ≤ 500 ms | > 1 second for 10 minutes |
| Duplicate orders per Checkout Intent | 0 | any occurrence |
| Incomplete idempotency attempt age | < 2 minutes | any attempt older than 2 minutes |
| Order event publication lag | < 60 seconds | oldest unpublished event > 2 minutes |
| Dead-letter outbox rows | 0 | any row |
| Unknown/stale payment projection | < 0.5% active orders | any sustained increase for 10 minutes |
| Snapshot protection failures | 0 | any occurrence |

## Diagnostic endpoint

`GET /dsh/operator/order-truth/diagnostics`

Requires `control-panel`, role `operator`, permission `operations.read`. The response is tenant-scoped and excludes client identity, address, tokens, idempotency keys and payment-provider payloads.

## Alert codes

- `ORDER_CREATE_ATTEMPT_STUCK`: an idempotency attempt has no bound order after two minutes.
- `ORDER_EVENT_OUTBOX_RETRYING`: at least one event is retrying publication.
- `ORDER_EVENT_OUTBOX_DEAD_LETTER`: publication exhausted twelve attempts.
- `ORDER_SNAPSHOT_TAMPER_ATTEMPT`: an immutable order field update was blocked.
- `ORDER_PAYMENT_PROJECTION_STALE`: the last verified WLT projection is older than two minutes or absent.

## Triage sequence

1. Pin the exact DSH commit, tenant, order ID/order number and correlation ID.
2. Read the diagnostic endpoint and compare creation, stuck attempt, outbox and projection counts.
3. Query `dsh_order_create_idempotency` by tenant/client and correlation; never expose the raw idempotency key outside restricted database access.
4. Query `dsh_orders`, `dsh_order_status_events`, `dsh_order_event_outbox` and `dsh_order_truth_audit` by tenant and correlation ID.
5. Confirm that one Checkout Intent maps to one order and that the event version matches the order version.
6. For payment projection lag, verify WLT independently. Do not mutate wallet, refund or settlement state from DSH.
7. For outbox retry, fix the downstream dependency and allow the worker to retry. Do not manually insert a second event.
8. For a dead letter, record an incident, inspect the redacted payload, correct the consumer failure and requeue the same outbox row with its original event ID.

## Safe recovery

- A client retry must reuse the persisted attempt and is expected to receive `200` with `Idempotent-Replay: true` after the order exists.
- A stuck attempt may be investigated only after verifying no order exists for the tenant Checkout Intent. Do not delete the row while a request is active.
- Never change item, address, pricing, correlation or Checkout Intent snapshot fields after creation.
- Never bypass `allowedActions` or update status directly to resolve an interface issue.

## Rollback

1. Disable the new `/order-truth` surface bindings while preserving legacy read compatibility.
2. Stop the outbox publisher before rolling back event schema changes.
3. Do not drop `dsh_order_event_outbox`, audit or idempotency tables until all rows are reconciled and archived.
4. Roll back application code before schema removal; additive columns may remain safely while verification continues.
5. Validate one-order-per-checkout, event continuity and WLT projection integrity after rollback.

## Required incident evidence

- Exact commit and migration version.
- Tenant, order ID/order number and correlation ID.
- Redacted diagnostic response.
- Relevant audit event IDs and outbox IDs.
- Root cause, customer impact, corrective action and proof of non-duplication.
