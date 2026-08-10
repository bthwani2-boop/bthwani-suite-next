# Engineering Policy

Status: ACTIVE_CANONICAL

## 1. Scope

This policy governs architecture, service boundaries, contracts, data, runtime, frontend/shared code, integrations, testing, observability, performance, and technical cleanup for the entire repository.

## 2. Architecture

- One authoritative owner exists for every durable fact and mutation.
- Cross-domain access uses explicit contracts, not direct table coupling or copied business logic.
- A projection/cache/read model never becomes a parallel source of truth.
- Reusable logic belongs at the smallest stable shared owner; surface code owns presentation and interaction, not duplicated business state.
- Prefer vertical full-stack closure of one outcome over horizontal frontend/backend/database batching that leaves the outcome unproven.
- Do not add new abstractions, services, files, dependencies, or registries without a proven ownership or reuse need.

## 3. Contracts and API binding

- OpenAPI/service contracts are the canonical external interface for registered bounded contexts.
- Generated clients must be reproducible from canonical composed contracts and must not be hand-maintained as parallel truth.
- Backend route registration, generated-client operation IDs, consumers, and compatibility policy must stay aligned.
- Breaking changes require an explicit compatibility/migration plan; silent contract drift is a defect.
- Client-controlled values may express intent but never trusted authorization context.

## 4. Data and PostgreSQL

- Each service owns exactly one schema/migration history; cross-service schema mutation is forbidden.
- Schema changes are forward, reviewable, deterministic, ordered, and tested against the supported upgrade path. Applied migration history is immutable; change it only through a new forward migration.
- Migration ledgers/checksums, where used by the runtime, are enforcement records and may not be bypassed or rewritten to hide drift.
- Constraints, foreign keys, unique indexes, checks, locking/versioning, idempotency, and transaction boundaries encode durable invariants close to the data when appropriate.
- DDL that lacks native `IF NOT EXISTS` semantics must use an explicit deterministic existence guard when repeat execution is a supported failure/recovery case.
- Destructive or narrowing change requires proven consumers/data impact, retention requirements, a forward-safe rollout/rollback or roll-forward path, and database evidence on a representative upgrade path—not only a fresh empty database.
- A migration must not silently discard balances, ledger rows, payouts, settlements, refunds, commissions, audit facts, or other regulated/business-critical data. Conflicting financial records are reconciled under WLT ownership; deletion is not a reconciliation strategy.
- Before an authorized destructive data transformation, quantify affected rows, preserve the required audit/recovery record, define the reconciliation/rollback behavior, and obtain every protected approval required by Delivery/Security/Finance policy.
- Non-trivially reversible migrations document their recovery/roll-forward strategy in the migration itself or its canonical release artifact.
- Seeds and fixtures are development support only and never commercial or production truth.

## 5. Concurrency, idempotency, events and jobs

- Retriable mutations use stable idempotency identity where duplicate effects are possible.
- Optimistic concurrency or locking protects state that can be overwritten by stale actors.
- Unknown external outcomes remain reconcilable and do not create a second mutation with a new identity until authoritative status is known.
- State mutation plus required outbox/event/audit effects follow one transactional discipline where consistency requires it.
- Event consumers are idempotent and reject contradictory reuse of an event identity.
- Retry, backoff, dead-letter, lease, and reconciliation behavior is explicit and observable.

## 6. DSH/WLT boundary

- DSH owns operational commerce/fulfillment truth and only bounded WLT-backed references/projections allowed by current contracts.
- WLT exclusively owns authoritative financial mutation and truth: wallet, ledger, payment, refund, settlement, payout, commission, and reconciliation.
- No DSH/frontend calculation or database write may substitute for WLT financial truth.
- Provider financial operations remain behind WLT and server-side service authentication.

## 7. Frontend and shared code

- Every required surface consumes canonical contracts and shared coordination where reuse is real.
- Do not create surface-local arrays, stores, mocks, fallback truth, or copied state machines for live business behavior.
- UI state distinguishes applicable loading, empty, offline, forbidden, conflict, partial, error, recovery, and success states.
- Successful mutation requires canonical readback when the product outcome depends on persisted state.
- Shared UI primitives/design tokens remain presentation infrastructure and cannot own domain truth.
- Navigation, RTL, localization, accessibility, focus/keyboard, large-text, and weak-network behavior are part of affected implementation quality.

## 8. Runtime and configuration

- Runtime configuration is explicit, environment-scoped, and validated; it may not redefine product/domain ownership.
- Required configuration fails closed rather than silently selecting insecure/mock defaults.
- Secrets stay in approved secret/runtime stores and never in source, governance text, client-visible environment variables, or logs.
- Local simulators/mocks are bounded development tools and cannot be represented as provider, release, or production evidence.
- Runtime ports, service dependencies, and health/readiness behavior follow current repository manifests/scripts.

## 9. External providers

- Every provider integration has an owner, capability boundary, authentication method, timeout/retry/idempotency model, error mapping, observability, and recovery path.
- Provider “configured” is not provider “healthy”. Runtime/provider evidence is required for health claims.
- Webhooks require signature/replay protection, schema validation, event identity, and trusted scope.
- A provider outage may degrade only as explicitly permitted by the owning Product Truth; mutations requiring authoritative success fail closed.

## 10. Testing and verification

Use the smallest sufficient affected verification and expand by proven risk:

1. targeted unit/domain tests;
2. type/lint/static checks;
3. contract/generated-client/binding checks;
4. migration/database integration checks;
5. cross-service/integration tests;
6. targeted runtime smoke/readback;
7. visual/device/accessibility/performance evidence when claimed;
8. full workspace/runtime only when impact requires it.

Verification runs after the final relevant edit. Evidence from an earlier candidate becomes stale when a later mutation can affect the claim.

## 11. Observability and performance

- Log/trace/metric fields use stable correlation identities and avoid secrets/PII.
- Operational alerts and SLOs come from active configuration/observability contracts, not copied numbers in documentation.
- Performance budgets are measured for affected API, bundle, render, database, or job paths appropriate to the change.
- Diagnostics are read-only unless the tool is explicitly a governed repair operation.

## 12. Cleanup and repository quality

- Prefer reuse, consolidation, and deletion of proven obsolete code over adding compatibility layers indefinitely.
- Before move/delete/merge, prove references, consumers, generated outputs, CI/runtime dependencies, and retained-data implications.
- Git history is the default archive; do not create duplicate archive/backup trees without a contractual retention need.
- Generated diagnostics, logs, screenshots, and temporary task artifacts remain untracked by default.
- Task/process terminology must not leak into product code identifiers or runtime architecture.
