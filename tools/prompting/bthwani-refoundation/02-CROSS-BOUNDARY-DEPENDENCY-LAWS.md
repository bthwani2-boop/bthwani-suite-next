# Cross-Boundary Dependency and Ownership Laws

This temporary module does not own the general architecture/data/product laws it summarizes. Durable general-law authority remains with the applicable `tools/prompting/bthwani-orchestrator/focus/*` semantic owner.

The sections below are target-package specialization and repository-refoundation consequences only.

```text
GENERAL_LAW → DURABLE_ORCHESTRATOR_FOCUS_OWNER
TARGET_SPECIFIC_CONSEQUENCE → THIS_TEMPORARY_PACKAGE
CONFLICT_OR_SCOPE_AMBIGUITY → DURABLE_OWNER_WINS
```

Do not strengthen a general rule only here. Promote the durable owner first, then keep only the target-specific consequence needed by this package.

## 1. Dependency direction

Canonical high-level dependency direction:

```text
apps
  ↓ compose/host
services
  ↓ use technical libraries
packages

services
  ↔ peer services only through explicit contracts/events/clients/integrations

services
  → root contracts protocol primitives only when genuinely cross-service

infra
  → starts/binds deployables and infrastructure
  !→ owns business semantics
```

Forbidden:

```text
services → apps
packages → services business internals
packages → apps
root contracts → business implementation
infra → domain/business implementation
service A importing service B private internals
```

## 2. Ownership chain

For every material responsibility prove:

```text
PRODUCT/SYSTEM MEANING
→ CANONICAL OWNER
→ CANONICAL WRITER
→ CANONICAL STORAGE IF DURABLE
→ CANONICAL CONTRACT/EVENT
→ DERIVED CLIENT/BINDING
→ REQUIRED CONSUMERS
→ USER/SYSTEM ACTION
→ PERSISTED/OBSERVABLE READBACK
```

Different route, actor, language, file path, or framework does not create a second owner.

## 3. App versus service law

App roots own deployable-host concerns:

```text
route hierarchy
navigation/deep links
tabs/shell
cross-capability page composition
bootstrap/session binding
native/OS adapters
app-specific assets
Expo/Next/build configuration
host observability/config wiring
```

Services own reusable capability semantics, business rules, durable truth, contracts, generated clients, and capability UI when UI is reusable and service-owned.

```text
WHERE_IT_APPEARS != WHO_OWNS_IT
```

Account, Home, Settings, dashboards, and aggregate Search are normally host information architecture/composition, not business domains.

## 4. Cross-service facts

For every cross-service fact/reference/projection prove:

```text
CANONICAL_SOURCE_OWNER
CANONICAL_WRITER
SOURCE_EVENT/API
MUTABILITY
PERSISTENCE
AUTHORITATIVE_OR_DERIVED
REBUILDABILITY_IF_DERIVED
CONSISTENCY/RETRY_MODEL
READBACK
CAN_IT_DIVERGE
IS_IT_USED_FOR_MUTATION_DECISIONS
```

Multiple mutable authorities for the same meaning are forbidden.

Derived projections must be explicit, one-way, non-authoritative for source-domain decisions, and rebuildable when feasible.

## 5. Contract law

Each service owns its business/API contract composition root. Root protocol definitions may be referenced only for stable cross-service wire semantics.

Generated outputs are derived:

```text
CANONICAL_SOURCE
→ DETERMINISTIC_COMPOSITION
→ DETERMINISTIC_GENERATION
→ JUSTIFIED_OUTPUT_SET
→ CONSUMERS
```

No hand-synchronized DTO/enum/status/action/operation registries may compete with canonical contract/domain sources.

## 6. External integration law

A domain expresses the capability it needs, not a generic vendor abstraction.

Prefer ports such as:

```text
Geocoder
RoutePlanner
PaymentGateway
PayoutRail
SmsSender
EmailSender
PushSender
ObjectStorage
FraudSignalProvider
```

Forbidden default abstraction:

```text
Provider.execute(anything)
```

Vendor adapters implement semantic ports under the service that understands the operation.

Provider configuration control-plane concerns are separate from request execution/data-plane concerns.

## 7. Secrets and configuration law

Business/config databases may store identifiers and secret references, not provider secret material by default.

```text
DB/GIT/CLIENT STATE
  → provider code, non-secret parameters, secret_ref, version, activation state

SECRET STORE / PROTECTED DEPLOYMENT BINDING
  → API keys, private keys, signing secrets, client secrets, tokens
```

Never expose secret values through contract, frontend state, logs, audit payloads, generated clients, `.env.example`, or Git.

## 8. Reliability law

Reliability policy is operation-specific.

```text
READ/LOOKUP PROVIDERS
→ bounded retry/fallback may be safe

MESSAGE PROVIDERS
→ dedupe/idempotency + delivery state before fallback

FINANCIAL PROVIDERS
→ never blind-fallback on timeout/unknown outcome
→ preserve provider provenance
→ query/reconcile unknown result
→ prove absent/failed before alternate execution
```

Timeout, retry, backoff, jitter, circuit breaking, concurrency limits, and failure classification are mechanisms. Their policy belongs with the integration/operation owner.

## 9. Naming admission law

A new semantic owner/package/topic is admitted only if:

```text
UNIQUE_STABLE_RESPONSIBILITY
CLEAR_OWNER
NOT_A_PAGE_OR_ROUTE
NOT_AN_ACTOR_PREFIX
NOT_A_VENDOR_NAME_UNLESS_ADAPTER
NOT_AN_IMPLEMENTATION_MECHANISM
NOT_A_GENERIC_BUCKET
NOT_DUPLICATE_OF_EXISTING_OWNER
NAME_MATCHES_CONTRACT/BACKEND/FRONTEND MEANING
```

## 10. Governance, documentation and tooling boundary law

Knowledge and automation surfaces must not compete with executable owners:

```text
governance = durable meaning / policy / ownership intent
docs       = human guidance
tools      = automation / derivation / evidence

governance != runtime state
docs != Product Truth
tools != architecture authority
tools != product capability registry
```

When implementation-specific traceability is useful, prefer deterministic derivation from canonical executable sources over a hand-maintained mirror. A manual tool configuration may exist only for a genuine tool-specific setting that cannot be derived and must not redefine Product/System ownership.

Durable governance may point to executable owners but must not copy endpoint/table/component inventories as independent truth. Runbooks must resolve current commands/routes/config from live canonical sources when material.

## 11. Cross-boundary exit gate

At closure prove:

```text
SERVICE→APP_DEPENDENCIES=0
PRIVATE_CROSS_SERVICE_IMPORTS=0
BUSINESS_TRUTH_IN_PACKAGES=0
GENERIC_PROVIDER_EXECUTION_AUTHORITY=0
PLAIN_SECRET_MATERIAL_IN_PROVIDER_DB=0
MANUAL_CONTRACT_MIRRORS=0
UNCLASSIFIED_CROSS_SERVICE_PROJECTIONS=0
BLIND_FINANCIAL_PROVIDER_FALLBACK=0
OLD_PATH_ALIASES=0
GOVERNANCE↔EXECUTABLE_AUTHORITY_CONFLICTS=0
DOCS_AS_PARALLEL_PRODUCT/CONTRACT_TRUTH=0
TOOLS_AS_MANUAL_ARCHITECTURE/OWNERSHIP_AUTHORITY=0
```
