# JRN-011 — WLT Payment Projection Reconciliation

Status: `ACTIVE_CANONICAL`

## Scope

DSH reads an opaque WLT Payment Session and stores only a read-only projection on the order. This worker never debits, credits, refunds, settles, captures, cancels or expires a financial object.

## Runtime

- Worker: `orders.RunPaymentProjectionWorker`.
- Source: `GET /payment-sessions/{sessionId}` through the server-side WLT client and `WLT_DSH_SERVICE_TOKEN`.
- Queue: `dsh_order_payment_projection_reconciliation`.
- Lease: two minutes; stale processing rows are reclaimable.
- Batch: 50 rows.
- Unsupported WLT status fails closed and is retried.
- After 12 failed attempts the row becomes `paused` and produces `ORDER_PAYMENT_PROJECTION_PAUSED` through order-truth diagnostics.

## Projection mapping

| WLT method/status | DSH projection |
|---|---|
| COD + `initiated` or `reference_created` | `cash_due` |
| non-COD + `initiated` or `reference_created` | `pending` |
| `captured` | `confirmed` |
| `refunded` | `refunded` |
| `failed` | `failed` |
| `cancelled` | `cancelled` |
| `expired` | `expired` |

A WLT fact older than `payment_projection_source_updated_at` is ignored. An equal timestamp is accepted when the projection differs, because Checkout and WLT may persist in the same clock tick.

## Event behavior

A changed projection:

1. increments the order version;
2. updates `payment_projection_updated_at`, `payment_projection_source_updated_at` and `payment_projection_reconciled_at`;
3. appends `order.payment_projection_updated` to the order event stream;
4. enters the JRN-011 transactional outbox and then the canonical operational outbox bridge.

An unchanged projection updates reconciliation freshness without creating event noise.

## Alert response

### `ORDER_PAYMENT_PROJECTION_STALE`

1. Confirm DSH has `DSH_WLT_BASE_URL` and `WLT_DSH_SERVICE_TOKEN`.
2. Check WLT readiness and the referenced Payment Session.
3. Inspect due/retry/processing rows by tenant and order ID.
4. Verify lease expiry before manual recovery.
5. Do not edit `payment_status_projection` directly.

### `ORDER_PAYMENT_PROJECTION_PAUSED`

1. Open an incident and pin the exact DSH/WLT commits.
2. Inspect `last_error`, `attempt_count`, WLT session ID and order correlation ID.
3. Resolve authentication, schema, connectivity or unsupported-status failure.
4. Set the reconciliation row to `retry`, clear `lease_expires_at`, and set `next_attempt_at=NOW()` only after the root cause is corrected.
5. Verify the worker updates the same order and emits at most one event for the new order version.

## Rollback

- Stop `RunPaymentProjectionWorker` before changing reconciliation schema.
- Preserve the reconciliation table and source timestamps until every in-flight row is accounted for.
- The last verified DSH projection remains read-only and may be shown as stale; WLT remains the authoritative source.
- Never roll back by executing a financial mutation from DSH.
