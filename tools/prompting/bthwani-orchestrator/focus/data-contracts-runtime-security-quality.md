# Focus — Data, Contracts, Runtime, Security, Finance and Quality

## 1. Purpose

Use this module when the starting focus or proven blast radius includes data/database, contracts/API/events, runtime/infrastructure, security/auth, finance, testing/quality or operations.

These concerns are grouped because correctness often depends on their cross-boundary consistency. Do not split them into independent pseudo-projects when one root spans them.

## 2. Data ownership and database truth

Inspect materially applicable:

- canonical owner for authoritative data;
- allowed writers/readers/projections;
- schema/model consistency;
- constraints/invariants;
- transaction boundaries;
- uniqueness/FKs/checks/indexes;
- fresh install and representative non-empty upgrade states;
- migration ordering and applied-history integrity;
- expand/backfill/switch/contract sequences where required;
- idempotency/concurrency/locking/batching;
- drift, duplicates, orphans and stale fields;
- restart/readback/roll-forward/rollback behavior;
- old-writer elimination after cutover.

A successful migration command alone does not prove correct product state.

## 3. Migration law

Use forward corrective migrations. Do not rewrite applied migration history simply to make the past look clean.

When a change affects persisted authority, prove as applicable:

```text
current owner
→ target owner/schema
→ forward migration
→ backfill/transform
→ compatibility window if real
→ switch writers
→ switch readers
→ canonical readback
→ zero old authoritative writer
→ cleanup/contract phase
```

A database cleanup is not complete if runtime still writes through the old model.

## 4. Contracts and APIs

Verify the full chain:

`canonical schema/OpenAPI/event → generated/manual client → caller/request → auth/authz → route/handler → domain command/query → persistence/event/provider → response/error semantics → persisted readback → all consumers`.

Look for:

- request/response/schema/enum/nullable/error drift;
- ambiguous IDs or scopes;
- generated-client provenance mismatch;
- shadow/duplicate endpoints;
- consumers bypassing canonical clients/contracts;
- server authorization missing despite UI restrictions;
- stale clients after contract change;
- idempotency/concurrency semantics not encoded where required;
- compatibility requirements lacking a bounded removal condition.

A public contract change is not closed until every required consumer and real compatibility implication is reconciled.

## 5. Events, jobs and providers

For material asynchronous/external paths prove:

```text
sender/receiver responsibility
message/event identity
schema/version
outbox/durability when required
callback/provider authenticity
ordering
idempotency/replay
retry/backoff/lease
DLQ/terminal handling
timeout/unknown result
restart
reconciliation
compensation
observability/correlation
```

A provider timeout after a possible commit is not equivalent to failure. Unknown-result paths require reconciliation before creating a second financial/business mutation identity.

## 6. Runtime and infrastructure

Inspect current declared/live runtime as materially applicable:

- service startup/readiness/health truthfulness;
- configuration/environment ownership;
- ports/endpoints/networking;
- Docker/container/process bindings;
- provider bindings;
- startup validation;
- no hidden localhost/legacy fallback;
- jobs/events/outbox/queues/providers;
- mobile/control-panel runtime boundaries;
- observability sufficient to prove the claim;
- failure/recovery/restart behavior;
- release/rollback only when actually in scope.

Discover current canonical project commands/configuration live; do not hard-code historical commands into this package.

## 7. Runtime freshness

Before trusting runtime proof, establish enough evidence that the observed process represents the intended candidate:

`source/candidate identity | artifact/image/bundle provenance | service/process/container freshness | schema version | runtime profile/config | endpoint/network target | fixture/seed provenance | persisted readback`.

No stale dev server/container/process may silently prove a changed candidate.

## 8. Security and isolation

Treat security as an always-on impact lens and deepen when materially relevant:

`authentication | authorization | role/object/tenant/store/partner/actor scope | sessions/tokens | secrets | PII/privacy | input/output validation | injection | SSRF/path/file/upload risks | replay/idempotency | IDOR | rate/abuse controls | provider signature | service identity | auditability`.

UI visibility never substitutes for server-side authorization.

For negative security proof include materially applicable wrong-role, wrong-scope, cross-actor/store/partner/tenant, object enumeration and replay paths.

Never expose raw secrets/credentials/PII merely to preserve evidence; retain the proof while redacting sensitive values.

## 9. Finance and WLT

For financial effects prove the current canonical financial authority live; do not infer implementation merely from a familiar name.

Where applicable verify:

```text
canonical ledger/fact owner
allowed financial writers
server-derived amount/identity where required
idempotency + correlation
state constraints
provider outcome binding
unknown-result reconciliation
compensation/reversal
restart/replay safety
canonical persisted readback
authorization / maker-checker / step-up where governed
audit provenance
```

Forbidden final states include:

- caller/UI-authored authoritative money when canonical owner must derive it;
- parallel financial truth;
- best-effort required financial mutation;
- fake success before persisted readback;
- retry with a new financial identity before reconciling unknown result.

Mock/local success never proves real provider/financial outcome.

## 10. Compatibility

Evaluate compatibility only when a real mixed-version/rollout dependency exists, including mobile/backend, generated clients, events and data migrations.

Compatibility must have:

`one semantic authority | explicit consumer scope | bounded behavior | observability | owner | expiry/removal trigger | negative tests where material`.

Do not preserve indefinite compatibility merely because deletion is inconvenient.

## 11. Security/privacy and irreversible actions

Before production-sensitive operations involving secrets, PII, financial providers, destructive backfills or irreversible infrastructure, apply the explicit authority gate in `01-SCOPE-AUTHORITY-RULES.md`.

No broad “execute everything” request silently authorizes destructive external effects.

## 12. Testing and quality

Tests are evidence. Select checks proportional to the claim and affected risk.

Use, where relevant:

- focused unit/domain regression tests;
- integration/contract/database tests;
- generated-client consistency checks;
- cross-surface/journey tests;
- runtime/smoke/readback checks;
- security/isolation tests;
- migration fresh/upgrade scenarios;
- duplicate/replay/concurrency/restart scenarios;
- adversarial scenarios.

Do not create redundant matrices when one focused check proves the claim. Do not use focused checks to claim broad closure they cannot prove.

Project CI/workflows/scanners may be used as project evidence when relevant. They are **not** orchestration self-validation and must never be introduced merely to run/check this command package.

## 13. Failure and recovery are product behavior

For material operations cover applicable:

`invalid | denied | wrong role/scope | forbidden state | not found | conflict/stale | duplicate/replay | race | partial failure | dependency/provider/database/network failure | timeout/unknown result | retry/backoff | offline/reconnect | restart | compensation | reconciliation`.

A happy-path-only implementation is incomplete where these states materially affect truth or user/operator outcome.

## 14. Mobile and control-panel runtime concerns

When Mobile is affected inspect as applicable:

`native permissions | deep links | push | maps/location | SecureStore/session | offline/reconnect | build/OTA/EAS/env/runtime transport | physical-device/emulator proof limit`.

When Control Panel is affected inspect as applicable:

`route/object authorization | trusted scope | server/client boundary | search isolation | bulk operations | audit/session/error/readback | responsive/RTL/localization/accessibility`.

## 15. Quality and performance

Inspect when they affect correctness, operability or maintainability:

`duplicated calls | excessive coupling | inefficient/unbounded queries | missing pagination/cache semantics | flaky/non-deterministic checks | config drift | unused dependencies | unsafe retries | observability gaps | hidden fallback | resource leaks`.

Avoid cosmetic quality work while a higher semantic/root cause remains unresolved unless independent and non-blocking.

## 16. Supply-chain/project automation evidence

When dependencies or project automation materially change, inspect as applicable:

`lockfile integrity | unsupported/duplicate dependency | vulnerability/licensing policy when governed | secret leakage | action/tool pinning | build/release references | removed-path references`.

Do not silence a scanner or weaken a project check simply to obtain green. Prove false positives or fix the real root.

This section concerns the target project only. No tool, workflow, guard or scanner is required or permitted for orchestrator self-certification.

## 17. Closure for this focus

Close only when canonical data/contract/runtime/security/finance truth is consistent through every materially affected writer/reader/consumer, required migration/cutover and failure/recovery behavior is proven, runtime provenance is sufficient for the claim, obsolete authority is removed, and verification strength matches the risk.