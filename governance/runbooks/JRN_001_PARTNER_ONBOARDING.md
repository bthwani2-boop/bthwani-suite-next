# JRN-001 Partner Onboarding Runbook

## Service objectives

- Draft create/update p95: 750 ms inside DSH, excluding media transfer.
- Canonical readback after mutation p95: 1,000 ms.
- Submission or activation transition p95: 1,500 ms when WLT is healthy.
- Error budget: 99.5% successful governed requests per rolling 30 days.

## Signals

The route wrapper emits `partner_onboarding_operation` with:

- `journey_id`, `operation`, `outcome`, `http_status`, `duration_ms`.
- `actor_surface`, `partner_id`, and `correlation_id`.
- No raw bank account, IBAN, payout mobile, legal identity, or phone values.

## Alerts

- Server-error ratio above 2% for 10 minutes.
- p95 latency above the relevant objective for 15 minutes.
- Version-conflict ratio above 5% for 10 minutes.
- WLT-unavailable responses above 1% for 10 minutes.
- Repeated partial-readback failures for the same partner reference.

## Diagnosis

1. Search by correlation ID and partner reference.
2. Confirm actor surface and authorization decision.
3. Inspect partner audit events and outbox state.
4. For payout failures, inspect WLT by payout destination reference only.
5. Re-run canonical GET readback before manual intervention.

## Recovery

- Network or 5xx: retry with the same idempotency key.
- Conflict: reload and issue a new mutation using the current version.
- Partial readback: reconcile mutation audit evidence against canonical partner GET.
- WLT unavailable: keep DSH non-published and retry the WLT handoff.
- Never persist or copy raw payout data into DSH during recovery.
