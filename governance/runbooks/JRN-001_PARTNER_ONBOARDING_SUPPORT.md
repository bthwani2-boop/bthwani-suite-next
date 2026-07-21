# JRN-001 — Partner onboarding support runbook

Status: ACTIVE
Owner: DSH partner onboarding

## Triage keys

Always capture `partnerId`, actor surface, HTTP operation, status code, `correlationId`, idempotency key presence, expected version, and the latest activation status. Never request or paste raw bank account, IBAN, payout mobile, credentials, tokens, or document bytes into an incident.

## First response

1. Confirm DSH health/readiness and database availability.
2. Read the partner, readiness, linked store, documents, field visits, and activation audit using the affected actor scope or an authorized operator scope.
3. For `409 VERSION_CONFLICT`, reload committed state; do not replay with a stale version.
4. For `409 IDEMPOTENCY_KEY_REUSED`, do not generate a new payload under the old key. Compare the original correlation and retry identity.
5. For `422 PARTNER_READINESS_GATES_FAILED`, surface the exact missing readiness items; do not override the gate.
6. For WLT `502/503`, verify that DSH contains only the payout reference and masked display fields. Retry the same governed attempt after WLT recovery.
7. For publication problems, verify every store gate: active, visible, serviceable, partner-ready, catalog-approved, and marketing-visible.

## Outbox recovery

Inspect pending/retry/dead-letter partner-WLT outbox rows ordered by `next_attempt_at`. A stalled oldest row over five minutes is a high-severity incident. Reconciliation must preserve correlation, request hash, and retry identity. Never manually create a financial ledger entry in DSH.

## Security and privacy escalation

Immediately escalate as critical when a client can read onboarding-private data, a field actor accesses another actor's draft, a store ownership changes through the generic link operation, a publication gate is bypassed, or raw payout identifiers appear in DSH after a WLT reference is bound.

## Rollback

Prefer disabling the affected mutation or publication transition while preserving reads and audit. Database rollback must not delete activation events, document reviews, field visits, or outbox evidence. Any schema rollback requires a forward repair plan for rows already written under the newer contract.

## Closure evidence

Attach the exact commit SHA, workflow run, relevant sanitized request/response metadata, audit event IDs, outbox state, and the post-recovery committed readback. Do not mark the incident closed from a surface toast alone.
