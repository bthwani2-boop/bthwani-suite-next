# Focus — Governance, Product and End-to-End Design

Status: ACTIVE_CANONICAL_ORCHESTRATOR_OWNER

## 1. Product/System truth is required value, not inherited implementation

Reconstruct the capability model from actual required behavior:

```text
ACTORS
CAPABILITIES
JOURNEYS
STATES/TRANSITIONS
OWNERSHIP/AUTHORIZATION
PERSISTED FACTS
FINANCIAL CONSEQUENCES
EXTERNAL INTEGRATIONS
OBSERVABLE OUTCOMES
```

Do not infer canonical Product/System truth solely from current routes, screens, tables or package names.

## 2. End-to-end capability reconciliation

For each material capability, trace as applicable:

```text
HUMAN/EXTERNAL INTENT
→ ENTRY SURFACE
→ INPUT/VALIDATION
→ AUTH/AUTHZ
→ CONTRACT
→ DOMAIN OWNER
→ PERSISTENCE/INTEGRATION/EVENT
→ CANONICAL READBACK
→ ALL MATERIAL CONSUMING SURFACES
```

A UI-only or endpoint-only success is not closure when persisted/cross-surface truth is required.

## 3. One business meaning, one authority

Search for duplicated business meaning across:

```text
BACKEND SERVICES
FRONTEND STORES/HOOKS
CONTROL PANEL
MOBILE APPS
SHARED LIBRARIES
CONFIG
DATABASE DEFAULTS/POLICIES
DOCS
TEST FIXTURES
```

Choose one canonical authority for mutable business semantics and make other layers consumers/adapters.

## 4. Actors and authorization

Actor identity, role, permission, scope and lifecycle must have canonical ownership.

Do not allow each application to invent role/permission truth independently.

Security-sensitive Product decisions require explicit persisted/contract/runtime proof, not UI hiding.

## 5. Journey completeness

For every canonical journey, account for:

```text
ENTRY
SUCCESS
VALIDATION FAILURE
AUTH FAILURE
BUSINESS REJECTION
EMPTY STATE
LOADING/PENDING
RETRY/IDEMPOTENCY WHEN APPLICABLE
CANCELLATION/REVERSAL WHEN APPLICABLE
CANONICAL READBACK
CROSS-SURFACE CONSISTENCY
```

Do not add UX states as compensation for broken domain ownership; fix the higher root first.

## 6. Durable truth vs convenience mirrors

Material mutable Product truth must not live in synchronized mirrors.

If a frontend/cache/read model is derived, its derivation and invalidation must be explicit. It may not become a second writer.

## 7. Historical value salvage

Old branches or dead code may contain Product value missing from `h`. Salvage only when evidence proves the capability is still required.

Recover the meaning into the new canonical design; do not resurrect obsolete topology to recover it.

## 8. Documentation

Documentation is authoritative only when the repository explicitly depends on it for durable Product/System truth.

Stale or contradictory authoritative docs must be reconciled or deleted. Non-authoritative historical prose must not control execution.

## 9. Product fixed-point proof

At final closure prove, for every material capability:

```text
REQUIRED CAPABILITY ACCOUNTED FOR
CANONICAL OWNER ACCOUNTED FOR
CANONICAL WRITER ACCOUNTED FOR
PERSISTENCE/CONTRACT ACCOUNTED FOR
ALL MATERIAL SURFACES ACCOUNTED FOR
NO PARALLEL PRODUCT TRUTH
NO ORPHANED JOURNEY
NO KNOWN REQUIRED CAPABILITY LOST DURING REFOUNDATION
```
