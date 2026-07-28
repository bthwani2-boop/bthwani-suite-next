# JRN-002 Identity Operations Runbook

Status: `ACTIVE_CANONICAL`

## Service objectives

- Availability objective for login, activation, session read and refresh: 99.9% per rolling 30 days once production monitoring is enabled.
- Readiness must fail when PostgreSQL is unavailable.
- P95 target: session read under 300 ms; login/activation/refresh under 800 ms excluding external OTP delivery.
- Error budget alerts are operational targets, not fabricated production measurements.

## Signals

Required structured dimensions:

- `operationId`
- `resultCode`
- `httpStatus`
- `durationMs`
- `correlationId`
- `surface`
- `actorRole` when resolved
- `tenantId` when resolved

Never record passwords, activation codes, bearer tokens, refresh tokens, hashes, or full request bodies.

## Alerts

1. Readiness failure for two consecutive probes.
2. `LOGIN_RATE_LIMITED` or `ACTIVATION_RATE_LIMITED` increases beyond the configured baseline.
3. Refresh failures exceed 5% for five minutes.
4. Account-deletion outbox has pending rows past `next_attempt_at` for more than 15 minutes.
5. Any `CORS_ORIGIN_FORBIDDEN` burst from one origin.
6. PostgreSQL constraint violations on JRN-002 tables.

## Diagnostic sequence

1. Capture the exact commit and `X-Correlation-ID`.
2. Check `/identity/health` then `/identity/readiness`.
3. Check PostgreSQL connectivity and migration `identity-005`/`identity-006` presence.
4. Determine whether failure is login, activation, refresh, session ownership, service authentication, CORS, or outbox delivery.
5. Reproduce only with sanitized actor IDs and masked phones.
6. Verify the same token cannot be reused after refresh, logout, session revocation, deactivation or deletion.

## Support responses

- Expired or revoked session: require sign-in/activation; never restore a token manually.
- Locked activation: issue a new typed challenge after policy allows it; never reset attempts in place.
- Wrong role/surface: correct the sovereign actor assignment through Workforce; never patch the client state.
- Duplicate phone: resolve the existing sovereign actor; never create a second actor.
- Outbox backlog: retry by stable `event_key`; do not duplicate downstream deletion.

## Rollback

- Application rollback: deploy the last commit whose `journeys/jrn-002/runtime-proof` and targeted verification statuses both succeeded.
- Database rollback: migrations `identity-005` and `identity-006` add compatible constraints, columns and indexes; rollback requires an approved forward migration, never destructive manual DDL.
- Security rollback is forbidden when it would re-enable wildcard CORS, token reuse, cross-actor access, plaintext secrets, or unbound support sessions.

## Evidence

Permanent gates:

- `.github/workflows/jrn-002-identity-runtime.yml`
- `.github/workflows/jrn-001-010-sambassam-verify.yml`
- `core/identity/tests/jrn-002-fullstack-slices.test.mjs`
