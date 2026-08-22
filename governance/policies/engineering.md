# Engineering Policy

Status: ACTIVE_CANONICAL

## Architecture and ownership

- Every durable fact and mutation has one authoritative owner.
- Cross-domain access uses explicit contracts; no direct cross-service table mutation or copied business logic.
- Projections, caches, read models, mocks, and surface-local state never become parallel truth.
- Reusable logic lives at the smallest stable shared owner.
- Prefer vertical end-to-end closure of one outcome over horizontal layer-by-layer work that leaves the outcome incomplete.
- Do not add abstractions, services, files, dependencies, registries, or wrappers without a proven need.

## Contracts and APIs

- OpenAPI/service contracts are the canonical external interface for bounded contexts that expose them.
- Generated clients are reproducible artifacts from canonical contracts, never hand-maintained parallel truth.
- Backend routes, operation IDs, generated clients, and consumers must remain aligned.
- Breaking changes require explicit consumer migration/cutover.
- Client-controlled values may express intent but never trusted authorization context.

## Data and migrations

- Each service owns one migration history and its data mutations.
- Migration order/checksums are deterministic and immutable after apply; corrections use an explicit forward-safe path.
- Constraints, idempotency, concurrency control, transactions, outbox/event rules, and ownership should encode durable invariants close to the data where appropriate.
- Destructive or narrowing changes require proven consumer/data impact and a safe rollout/recovery path.
- Financial/audit/business-critical records are reconciled by their owner; deletion is not reconciliation.
- Seeds and fixtures are development support only.

## DSH/WLT

- DSH owns operational commerce/fulfillment truth.
- WLT exclusively owns wallet, ledger, payment, refund, settlement, payout, commission, and financial reconciliation truth.
- DSH/frontends may hold only contract-permitted references/projections and must not reproduce WLT calculations or writes.

## Frontend and shared code

- Surfaces consume canonical contracts/controllers and shared coordination where reuse is real.
- No live business behavior may depend on local mock/fallback arrays or duplicated state machines.
- Persisted outcomes require canonical readback when product behavior depends on them.
- Loading, empty, offline, forbidden, conflict, error, recovery, accessibility, localization/RTL, and weak-network behavior are implemented when applicable to the affected surface.

## Runtime and providers

- Runtime configuration is explicit, environment-scoped, and fail-closed when required values are missing.
- Secrets never live in source, client-visible config, or logs.
- Provider integrations define owner, auth, timeout/retry/idempotency, error mapping, observability, and recovery.
- Provider configuration is not proof of provider health; runtime/provider claims need runtime evidence.

## Verification

Use the smallest check that proves the affected invariant, then expand only by evidence/risk:

1. targeted unit/domain tests;
2. type/lint/static checks;
3. contract/generated-client/binding checks;
4. migration/database integration checks;
5. cross-service/integration tests;
6. runtime/readback;
7. visual/accessibility/performance when affected;
8. full workspace/runtime only when closure or broad shared impact requires it.

Do not create meta-guards, guard registries, workflow registries, or duplicate diagnostics to validate the existence/text of other checks.

## Cleanup

- Prefer deletion/consolidation of proven obsolete code over compatibility layers.
- Before move/delete/merge, prove consumers and runtime/generated dependencies.
- Git history is the archive; temporary diagnostics, logs, screenshots, reports, caches, and task artifacts stay untracked.
- Task/process terminology must not leak into product/runtime architecture.
