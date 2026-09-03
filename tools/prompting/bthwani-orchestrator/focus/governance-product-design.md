# Focus — Product, End-to-End Design and Governance Truth

Status: ACTIVE_CANONICAL_ORCHESTRATOR_OWNER

## 1. Product/System truth is required value, not inherited implementation

Reconstruct required behavior from evidence:

```text
ACTORS
CAPABILITIES
JOURNEYS
STATES / TRANSITIONS / ALLOWED ACTIONS
OWNERSHIP / AUTHORIZATION
PERSISTED FACTS
FINANCIAL CONSEQUENCES
EXTERNAL INTEGRATIONS
OBSERVABLE OUTCOMES
```

Do not infer canonical Product/System truth solely from current routes, screens, docs, tables, packages or historical governance.

## 2. Complete end-to-end capability chain

For each material capability trace as applicable:

```text
PRODUCT MEANING
→ ACTOR / JOURNEY / STATE
→ DATA/STORAGE TRUTH
→ CANONICAL DOMAIN/BACKEND OWNER
→ API / EVENT / COMMAND
→ CANONICAL CONTRACT
→ GENERATED BINDING
→ FRONTEND QUERY/MUTATION/STORE
→ VIEW MODEL / COMPONENT
→ SCREEN / ROUTE
→ USER ACTION
→ MUTATION
→ PERSISTED READBACK
→ VISIBLE FINAL STATE
```

Any unjustified break is a parity gap. A UI-only, API-only, backend-only or database-only success is not closure when the capability crosses layers.

## 3. One business meaning, one authority

Search for duplicated meaning across:

```text
BACKEND SERVICES
FRONTEND STORES/HOOKS/VIEW MODELS
CONTROL PANEL
MOBILE APPS
SHARED/CORE LIBRARIES
CONFIG
DATABASE DEFAULTS/POLICIES
CONTRACTS/DTOs/ENUMs
DOCS/GOVERNANCE
TEST FIXTURES/MOCKS
```

Choose one canonical mutable authority and make other layers derived consumers/adapters.

Frontend may own presentation/navigation/transient editing state, but not a second mutable source for permissions, eligibility, serviceability, financial/order state, allowed actions, pricing, fees, workflow transitions or business validation.

## 4. Every screen/flow re-earns existence

For every material screen/route/flow ask:

```text
WHAT REQUIRED CAPABILITY DOES IT SERVE?
WHICH ACTOR/JOURNEY?
WHAT CANONICAL BACKEND/DATA/CONTRACT SUPPORTS IT?
WHAT QUERY/MUTATION/STORE DOES IT USE?
WHAT STATES/ACTIONS/READBACK DOES IT REPRESENT?
IS BUSINESS TRUTH HARDCODED LOCALLY?
IS A MOCK/FALLBACK HIDING A BACKEND GAP?
IS THIS RESPONSIBILITY DUPLICATED BY ANOTHER SCREEN UNDER ANOTHER NAME/PATH?
```

If no required journey exists, delete the flow. If duplicate, migrate navigation/consumers to the winner and delete the losing screen/route/files.

## 5. Actors and authorization

Actor identity, role, permission, scope and lifecycle require canonical ownership.

Do not allow applications, screens or local stores to invent role/permission truth independently.

Security-sensitive decisions require backend/persistence/contract/runtime proof where applicable, not UI hiding.

## 6. Journey completeness

For every required journey account for applicable:

```text
ENTRY
LOADING/PENDING
SUCCESS
EMPTY/MISSING
VALIDATION FAILURE
AUTH/AUTHZ FAILURE
BUSINESS REJECTION
CONFLICT/CONCURRENCY
OFFLINE/DEGRADED
RETRY/IDEMPOTENCY
CANCELLATION/REVERSAL
CANONICAL READBACK
CROSS-SURFACE CONSISTENCY
```

Do not add UX compensation for broken domain ownership; repair the higher root.

## 7. Durable truth vs mirrors

Material mutable Product truth must not live in synchronized mirrors.

Derived cache/read/frontend state must have explicit derivation/invalidation and cannot become a second writer.

Manual DTO/enum/status/error/business mappings that duplicate canonical contract/domain semantics are parallel-truth candidates and should be migrated/deleted when redundant.

## 8. Historical value salvage

Old branches/dead code/docs may contain lost required behavior. Recover only proven required meaning.

```text
SALVAGE MEANING
→ PLACE UNDER NEW CANONICAL OWNER
→ DO NOT RESURRECT OLD TOPOLOGY
```

## 9. Governance is not privileged

`governance/**` and governance-like docs are not automatically canonical because they describe process or Product intent.

For every governance artifact determine:

```text
DOES IT CONTAIN UNIQUE REQUIRED DURABLE TRUTH?
IS THAT TRUTH ALREADY OWNED EXECUTABLY ELSEWHERE?
DOES IT CONFLICT WITH LIVE PRODUCT/SYSTEM TRUTH?
DOES IT CREATE A SECOND EXECUTION/APPROVAL/ROUTING AUTHORITY?
WOULD EXTRACT→DELETE→MINIMAL-RECREATE BE CLEANER?
```

Delete stale, duplicative, obsolete or confusing governance. Preserve/recreate only unique truth that the canonical baseline actually needs.

Do not automate governance prose merely to make it look authoritative.

## 10. Documentation

Documentation survives only when it owns unique required explanatory/operational truth not better represented elsewhere.

Stale/contradictory docs must be corrected, absorbed or deleted. Historical prose cannot control execution.

## 11. Product fixed-point proof

At final closure prove for every material capability:

```text
REQUIRED CAPABILITY ACCOUNTED FOR
CANONICAL OWNER/WRITER ACCOUNTED FOR
DATA/PERSISTENCE ACCOUNTED FOR
API/CONTRACT/GENERATED LINEAGE ACCOUNTED FOR WHERE APPLICABLE
ALL MATERIAL SURFACES/SCREENS ACCOUNTED FOR
ACTION→MUTATION→READBACK ACCOUNTED FOR
NO FRONTEND/BACKEND SHADOW BUSINESS TRUTH
NO ORPHAN REQUIRED SCREEN/API/BINDING/DATA
NO PARALLEL PRODUCT TRUTH
NO ORPHAN JOURNEY
NO KNOWN REQUIRED CAPABILITY LOST DURING REFOUNDATION
```
