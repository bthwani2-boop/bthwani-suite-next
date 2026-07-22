# JRN-034 Payment Sessions Runbook

## Authority and ownership

- WLT owns provider state, payment-session state, reconciliation and ledger truth.
- DSH owns checkout orchestration and operational projection only.
- Frontends call DSH. They never receive WLT service credentials or provider secrets.
- Final financial, security, product and production acceptance must be issued independently of the implementing engineer.

## Required configuration

| Variable | Owner | Failure mode |
| --- | --- | --- |
| `WLT_MUTATIONS_ENABLED=true` | WLT runtime/release | All financial mutations fail closed when absent or false. |
| `WLT_DSH_SERVICE_TOKEN` | WLT + DSH secrets | Internal reads and mutations reject callers when missing or mismatched. |
| `WLT_FINANCIAL_PROVIDER_MODE` | WLT runtime/release | Required. Only `sandbox` or an explicitly authorized local `mock` is accepted; `production` remains blocked. |
| `WLT_FINANCIAL_PROVIDER_BASE_URL` and provider credentials | WLT runtime | Required for sandbox. Authorize, capture and status refresh fail without a configured provider endpoint. |
| `WLT_ALLOW_MOCK_PROVIDER=true` | local development only | Required in addition to `mode=mock`; absence prevents synthetic payment success even when compose supplies a mock mode default. Never set in an approved release environment. |
| `WLT_PROVIDER_WEBHOOK_SECRET` | WLT + provider | Webhook returns `WEBHOOK_NOT_CONFIGURED`; unsigned events are never accepted. |
| `EXPO_PUBLIC_WLT_PROVIDER_PAYMENTS_ENABLED=true` | approved app-client release only | Official provider payment stays hidden/disabled by default. |
| `NEXT_PUBLIC_WLT_PROVIDER_PAYMENTS_ENABLED=true` | approved web release only | Same fail-closed behavior for web surfaces. |

Do not place provider credentials or `WLT_DSH_SERVICE_TOKEN` in any `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*` variable. `WLT_ALLOW_MOCK_PROVIDER` is a local simulation switch, not a release feature flag.

## Provider webhook contract

Endpoint: `POST /wlt/provider/webhooks/payment`

Required headers:

- `X-WLT-Provider-Timestamp`: Unix seconds.
- `X-WLT-Provider-Signature`: `sha256=<hex>`.

Canonical signed bytes:

```text
<timestamp>.<raw-request-body>
```

The signature is HMAC-SHA256 with `WLT_PROVIDER_WEBHOOK_SECRET`. WLT rejects a timestamp outside five minutes, an invalid signature, a body above 64 KiB, an unknown field, a type/status mismatch, or a replayed event identity with a different payload hash.

Secret rotation must use an approved overlap procedure at the provider edge. The current application accepts one secret only; therefore coordinate provider and WLT cutover within one maintenance action and verify a signed non-financial test event before restoring traffic.

## Safe operation rules

1. Every `authorize`, `capture` and provider-status refresh carries tenant, correlation and idempotency identities.
2. Never retry an `in_progress`, `authorization_pending`, `capture_pending` or `provider_result_unknown` financial mutation with a new idempotency key.
3. On ambiguous timeout, read the payment timeline or call `refresh-provider-status`; do not call `authorize` or `capture` again.
4. A `captured` session is valid only when `capture_ledger_transaction_id` points to one balanced `payment_captured` ledger transaction.
5. COD collection always uses the COD record flow; the payment-session COD collection route intentionally returns `USE_COD_RECORD_FLOW`.
6. DSH projection delay does not change WLT truth. Replay the WLT outbox, not the provider charge.
7. A local mock provider is never evidence of financial correctness, provider readiness, release readiness or production acceptance.

## Operator workflow for unknown provider result

1. Open `/dsh/finance/payment-sessions` in the control panel.
2. Enter the tenant and payment-session identifiers.
3. Inspect operation receipts, provider events, ledger reference and open reconciliation cases.
4. Use **تحديث حالة المزود** once. The client generates a stable idempotency identity for that refresh request.
5. When the provider confirms `authorized`, `captured`, `failed` or `expired`, WLT applies the legal transition and resolves the open reconciliation case.
6. If the provider cannot return authoritative evidence, assign the reconciliation case and keep it open. Do not use manual adjustment to invent provider success.

## Diagnostic queries

Captured sessions missing a ledger cross-reference:

```sql
SELECT id, tenant_id, provider_reference, captured_at
FROM wlt_payment_sessions
WHERE status = 'captured'
  AND capture_ledger_transaction_id IS NULL;
```

Ledger transaction mismatch:

```sql
SELECT ps.id, ps.capture_ledger_transaction_id, lt.source_type, lt.source_id, lt.transaction_type
FROM wlt_payment_sessions ps
LEFT JOIN wlt_ledger_transactions lt ON lt.id = ps.capture_ledger_transaction_id
WHERE ps.status = 'captured'
  AND (lt.id IS NULL OR lt.source_type <> 'payment_session' OR lt.source_id <> ps.id OR lt.transaction_type <> 'payment_captured');
```

Stuck operation receipts:

```sql
SELECT id, tenant_id, payment_session_id, operation, idempotency_key, correlation_id, updated_at
FROM wlt_payment_operation_receipts
WHERE state = 'in_progress'
  AND updated_at < now() - interval '10 minutes'
ORDER BY updated_at;
```

Unresolved ambiguous results:

```sql
SELECT rc.id, rc.payment_session_id, rc.operation, rc.trigger_reason, rc.created_at
FROM wlt_reconciliation_cases rc
WHERE rc.status = 'open'
ORDER BY rc.created_at;
```

Webhook conflicts:

```sql
SELECT provider_event_id, tenant_id, payment_session_id, processing_result, received_at
FROM wlt_payment_provider_events
WHERE processing_state = 'conflict'
ORDER BY received_at DESC;
```

## Alerts and service objectives

Page financial operations immediately for any of:

- duplicate provider authorization or capture evidence;
- accepted webhook signature failures greater than zero (accepted count must always be zero);
- captured session without ledger cross-reference;
- unbalanced or missing payment ledger transaction;
- provider event replay conflict;
- cross-tenant payment access;
- `provider_result_unknown` older than 15 minutes;
- `in_progress` operation receipt older than 10 minutes;
- WLT outbox event not projected to DSH within five minutes.

Target objectives for an approved provider sandbox/production environment:

- 100% of captured sessions have exactly one balanced ledger transaction.
- 100% of terminal provider events are deduplicated and auditable.
- 99% of provider webhooks apply within 60 seconds.
- 95% of ambiguous results resolve within 15 minutes.

These targets require runtime telemetry evidence before production approval.

## Rollback and containment

1. Set `WLT_MUTATIONS_ENABLED=false` to stop new financial mutations while keeping reads available.
2. Disable `EXPO_PUBLIC_WLT_PROVIDER_PAYMENTS_ENABLED` and `NEXT_PUBLIC_WLT_PROVIDER_PAYMENTS_ENABLED` in the next approved surface release.
3. Remove `WLT_ALLOW_MOCK_PROVIDER` from any environment where it was used for local simulation.
4. Preserve payment sessions, receipts, events, reconciliation, ledger and outbox rows. Never delete or rewrite financial evidence during rollback.
5. Revert application code only after stopping mutations. Do not roll back an applied additive migration by dropping the new tables or columns.
6. Reconcile every operation that was `in_progress` or `provider_result_unknown` at containment time using provider status evidence.
7. Resume mutations only after financial control, security and release owners approve the recovery evidence.

## Verification before release

- Product-truth schema and journey structural guard pass.
- WLT payment and provider packages plus DSH boundary tests pass on the exact candidate SHA.
- WLT, DSH and control-panel TypeScript checks pass on the exact candidate SHA.
- Migration applies to an empty database and an upgraded database; the migration ledger probe recognizes `wlt-036`.
- Provider sandbox proves authorize, capture, exact replay, ambiguous timeout, status refresh, signed webhook, stale/invalid signature rejection and event replay conflict.
- Database evidence proves atomic captured state + balanced ledger + DSH outbox.
- App-client and control-panel visual evidence covers RTL, loading, offline, forbidden, conflict, unknown, failed, expired and captured states.
- Independent product, financial, security and release decisions are attached. Production activation remains prohibited until those decisions exist.
