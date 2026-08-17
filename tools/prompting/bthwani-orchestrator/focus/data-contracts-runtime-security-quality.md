# Focus — Data, Contracts, Runtime, Security, Finance and Quality

## 1. Purpose

Use this module when the starting focus or proven blast radius includes data/database, contracts/API/events, runtime/infrastructure, security/auth, finance, testing/quality or operations.

These concerns are grouped because correctness often depends on their cross-boundary consistency. Keep the file cohesive; do not split merely to create more headings.

## 2. Data and database

Inspect materially applicable:

- canonical data ownership and writers;
- schema/model consistency;
- constraints and invariants;
- migrations on fresh and non-empty states;
- forward migration safety and applied-history integrity;
- backfill/switch/contract sequences where needed;
- idempotency, concurrency and transaction boundaries;
- drift, duplicates, orphans and stale fields;
- indexes/locks/batching/performance when relevant;
- restart/readback/roll-forward/rollback behavior.

A successful migration command alone does not prove correct product state.

## 3. Contracts and APIs

Verify across:

`canonical schema/OpenAPI/event → generated/manual client → caller/request → auth/authz → route/handler → domain logic → persistence/event/provider → response/readback → consumers`.

Look for request/response/schema/enum/nullable/error/permission drift, unused endpoints, shadow endpoints, duplicated contract definitions and consumers bypassing canonical clients.

A public contract change is not closed until required consumers and compatibility implications are reconciled.

## 4. Runtime and infrastructure

Inspect current live/declared runtime as materially applicable:

- service startup/readiness/health;
- configuration/environment ownership;
- Docker/container/network/provider bindings;
- observability sufficient to prove the claim;
- failure/recovery/restart behavior;
- jobs/events/outbox/queues/providers;
- mobile/control-panel runtime boundaries;
- hosted/CI enforcement only when claimed.

Discover current canonical commands/configuration from the live repository rather than hard-coding historical commands here.

## 5. Security and isolation

Treat security as an always-on impact lens and deepen when relevant:

`authentication | authorization | role/object/tenant/scope isolation | sessions/tokens | secrets | PII/privacy | input/output validation | injection | SSRF/path/file risks | replay/idempotency | IDOR | rate/abuse controls | auditability`.

UI visibility never substitutes for server-side authorization.

## 6. Finance/WLT

For financial effects prove current canonical financial authority live; do not rely on the name `WLT` alone to infer a specific current implementation.

Where applicable verify:

`idempotency | correlation | canonical ledger/fact | unknown-result handling | provider timeout | compensation/reversal | reconciliation | readback | duplicate/replay | authorization | audit`.

Financial correctness requires stronger evidence than a static type/build pass.

## 7. Compatibility

Evaluate compatibility only when a real mixed-version/rollout dependency exists, including mobile/backend and generated contracts.

Compatibility must have one semantic authority and a justified removal condition. Do not preserve indefinite compatibility merely because deleting it is inconvenient.

## 8. Testing and quality

Tests are evidence. Select checks proportional to the claim and affected risk.

Use, where relevant:

- focused unit/domain tests;
- integration/contract/database tests;
- cross-surface/journey tests;
- runtime/smoke/readback tests;
- security/isolation tests;
- regression tests for the proven root;
- adversarial scenarios.

Do not create redundant test matrices when one focused test can prove the claim; do not use focused tests to claim broad closure they cannot prove.

## 9. Failure and recovery are product behavior

For material operations cover applicable:

`invalid | denied | wrong scope/role | forbidden state | not found | conflict/stale | duplicate/replay | race | partial failure | dependency/provider failure | timeout/unknown result | retry/backoff | offline/reconnect | restart | compensation | reconciliation`.

A happy-path-only implementation is incomplete where these states are material.

## 10. Quality and performance

Inspect quality/performance where they affect correctness, operability or maintainability: duplicated calls, coupling, inefficient queries, unbounded data flows, flaky/non-deterministic checks, configuration drift, unused dependencies, observability gaps and operationally unsafe retries.

Avoid cosmetic quality work while a higher product/root cause is unresolved unless it is independent and non-blocking.

## 11. Closure for this focus

Close only when the canonical data/contract/runtime/security/finance truth is consistent through required writers/readers/consumers, required failure/recovery behavior is proven, and verification strength matches the claim/risk.