# DSH + WLT Canonical Refoundation — Temporary Execution Plan

PLAN_CLASS: TEMPORARY_DESTRUCTIVE_REFOUNDATION_EXECUTION_PLAN
TARGET_REPOSITORY: bthwani2-boop/bthwani-suite-next
TARGET_BRANCH: h
TARGET_SERVICES: services/dsh + services/wlt
COMPLETION_TARGET: LEVEL_4_FIXED_POINT
TEMPORARY_ARTIFACT: YES
SELF_DELETE_AFTER_VERIFIED_CLOSURE: REQUIRED
PROGRESS_LEDGER: FORBIDDEN

---

## 0. Role, authority, and lifetime

This file is a temporary execution guide for the complete DSH/WLT refoundation. It is not a permanent architecture document, runtime dependency, contract authority, product specification, status ledger, or archive.

It must never become a second source of live repository state. Every execution decision is derived from exact live `h` and current evidence. Do not add checkboxes, mutable status fields, completed-file lists, or stale snapshots to this file.

If execution is performed under the repository orchestrator, the orchestrator remains supreme. This file specializes the DSH/WLT campaign but does not weaken repository-wide law.

After verified closure:

```text
VERIFY_LEVEL_4_DSH_WLT_FIXED_POINT
→ VERIFY_ZERO_LIVE_DEPENDENCIES_ON_THIS_FILE
→ DELETE_THIS_FILE
→ RE_PIN_LIVE_h
→ VERIFY_PATH_ABSENT
→ VERIFY_ZERO_REFERENCES_TO_PATH
```

Git history is the only archive for this plan.

---

## 1. Mission

Refound DSH and WLT from semantic ownership first principles so the final repository expresses product/system truth directly.

Required final properties:

```text
ONE_CANONICAL_OWNER_PER_MATERIAL_RESPONSIBILITY
ONE_CANONICAL_MUTABLE_AUTHORITY_PER_BUSINESS_MEANING
ONE_CANONICAL_CAPABILITY_VOCABULARY
ONE_REPRODUCIBLE_CONTRACT/GENERATION_LINEAGE
ONE_CANONICAL_RUNTIME/CONFIG_AUTHORITY_PER_ROLE
ONE_CANONICAL_APP_COMPOSITION/NAVIGATION_AUTHORITY_PER_DEPLOYABLE_APP
ONE_DIRECTIONAL_APP→SERVICE_DEPENDENCY
ZERO_SERVICE→APP_RUNTIME_DEPENDENCY
ZERO_KNOWN_PARALLEL_OR_SHADOW_TRUTH
ZERO_KNOWN_LOSING/LEGACY_CONTAINERS
ZERO_KNOWN_STALE_WRAPPERS/ALIASES/REEXPORTS
ZERO_KNOWN_MANUAL_DTO/ENUM/OPERATION_MIRRORS
ZERO_KNOWN_DUPLICATE_WRITERS
ZERO_KNOWN_BACKEND↔CONTRACT↔FRONTEND_SEMANTIC_DRIFT
ZERO_KNOWN_PARTIAL_CUTOVERS
ZERO_KNOWN_DSH/WLT_MATERIAL_FINDINGS
```

The goal is not to beautify inherited folders. Preserve required value, rebuild canonical ownership, migrate consumers, and delete losing topology.

---

## 2. Exact-live-state and recovery law

Every new or resumed execution begins with:

```text
PIN_EXACT_LIVE_h
→ INSPECT_CURRENT_DSH_WLT_TREE
→ INSPECT_RELEVANT_HISTORY_AND_DIFFS
→ RECONSTRUCT_ACTIVE_OPEN_UNIT_IF_ANY
→ RECONSTRUCT_MIGRATION/CUTOVER/DELETION_STATE
→ INVALIDATE_STALE_EVIDENCE
→ DERIVE_NEXT_REQUIRED_ACTION
```

Never mutate from memory, an old chat, this plan's examples, local-only assumptions, or previously observed paths.

If `h` moves during execution:

```text
STOP_WRITING_TO_STALE_HEAD
→ RE_PIN
→ COMPARE_MOVEMENT
→ RECONCILE_AFFECTED_CONE
→ CONTINUE_FROM_CURRENT_TRUTH
```

A commit is a recovery checkpoint, not closure.

---

## 3. Scope and affected-cone law

Primary scope:

```text
services/dsh/**
services/wlt/**
```

Mandatory affected-cone scope whenever DSH/WLT ownership reaches outside those roots:

```text
apps/**
contracts/** shared protocol primitives
core/** or shared/** when consumed by DSH/WLT
workspace/package/export/lockfile metadata
tools/** generators/guards/scripts
.github/** DSH/WLT assurance
runtime/env/docker/compose/deployment/config
```

Every unit must account for files, symbols, imports, exports, routes, manifests, generated outputs, tests, fixtures, mocks, DB schema, runtime registrations, workers, and external consumers in its complete affected cone.

---

## 4. Product truth before topology

Before destructive mutation reconstruct required meaning from evidence, not inherited folder names.

For each material capability determine:

```text
ACTORS
REQUIRED_JOURNEYS
STATES_AND_TRANSITIONS
ALLOWED_ACTIONS
AUTHENTICATION/AUTHORIZATION
PERSISTED_FACTS
FINANCIAL_EFFECTS
EXTERNAL_INTEGRATIONS
FAILURE/RETRY/REVERSAL_BEHAVIOR
VISIBLE_FINAL_OUTCOME
```

Preserve required behavior and approved experience value even when its current container is deleted.

```text
ARCHITECTURE_REFOUNDATION != VISUAL_REDESIGN
```

A screen/flow survives only if a required journey exists. A container survives only if it has a unique canonical responsibility.

---

## 5. Canonical bounded-context ownership

### 5.1 DSH

DSH owns operational commerce and delivery truth, including as applicable:

```text
catalog
store
assortment/inventory operational truth
cart
checkout orchestration
order
pickup
delivery
dispatch
serviceability
address
notification
support
marketing/promotion operational semantics
client/partner/captain/field operational journeys
```

### 5.2 WLT

WLT is an independent shared financial bounded context. It is not a DSH submodule and must remain reusable by future services and applications.

WLT owns financial truth, including as applicable:

```text
wallet/balance authority
ledger
payment
refund
settlement
commission
payout
reconciliation
COD financial lifecycle
collateral
financial pricing/funding/eligibility
provider/financial-rail state
```

### 5.3 Cross-service law

DSH may hold WLT identifiers and explicitly derived non-authoritative projections required for operational flow. It must not become a second financial writer or policy authority.

WLT may consume DSH evidence and references. It must not become owner of order, dispatch, workforce, store, or special-request product truth merely because those facts cause a financial effect.

For every cross-service fact prove:

```text
CANONICAL_OWNER
CANONICAL_WRITER
SOURCE_EVENT/API
MUTABILITY
PERSISTENCE_IF_ANY
AUTHORITATIVE_OR_DERIVED
CONSISTENCY/RETRY_MODEL
READBACK
```

---

## 6. Canonical app ↔ service architecture

### 6.1 Deployable apps are hosts/composition roots

Canonical deployable roots:

```text
apps/
├── app-client/runtime/
├── app-partner/runtime/
├── app-captain/runtime/
├── app-field/runtime/
└── control-panel/runtime/
```

These runtimes own only deployable-app concerns:

```text
Expo Router / Next route hierarchy
navigation and deep links
tabs/shell/application composition
bootstrap/session initialization
native/platform adapters
secure storage/device integration
push/deep-link platform wiring
app-specific assets
Expo/Next/build configuration
runtime observability/config
```

They do not own DSH or WLT business capability implementations.

### 6.2 Services own reusable capability implementations

Canonical dependency direction:

```text
apps/*/runtime
    ↓ imports public capability entrypoints
services/dsh/frontend/<capability>
services/wlt/frontend/<capability>
core/shared platform packages when genuinely cross-cutting
```

Forbidden reverse dependency:

```text
services/dsh/** → apps/*/runtime      FORBIDDEN
services/wlt/** → apps/*/runtime      FORBIDDEN
```

A service must never know which deployable app hosts it.

### 6.3 An app may compose multiple services

The app is not “owned by DSH”. It may compose DSH, WLT, Identity, Workforce, Platform Control, and future services as peer capability providers.

Example:

```text
apps/app-client/runtime
├── route: /stores      → DSH Store capability
├── route: /orders      → DSH Order capability
├── route: /wallet      → WLT Wallet capability
└── route: /profile     → Identity/Profile capability composition
```

The route is app-owned. The capability semantics and reusable screen/controller are service-owned.

### 6.4 Host-specific composition vs domain-owned UI

Use this decision law:

```text
REUSABLE DOMAIN/CAPABILITY UI
→ owning service frontend

APP ROUTE/TAB/SHELL/DEEP LINK
→ apps/*/runtime

CROSS-CAPABILITY PAGE COMPOSITION ONLY
→ apps/*/runtime

DOMAIN ORCHESTRATION / BUSINESS DECISION
→ owning backend service

DSH-SPECIFIC ADAPTATION OF WLT CAPABILITY
→ DSH capability integration boundary, only if real adaptation exists
```

Do not move business orchestration into the app merely because two services appear on one screen.

### 6.5 Current app-shaped DSH exports are transitional losers

Current shapes such as:

```text
@bthwani/dsh/app-client
@bthwani/dsh/app-partner
@bthwani/dsh/app-captain
@bthwani/dsh/app-field
@bthwani/dsh/control-panel
```

must be replaced by semantic capability exports. The runtime should assemble capabilities instead of importing a monolithic `Dsh*Application` that makes DSH appear to own the whole app.

Target style:

```text
@bthwani/dsh/catalog
@bthwani/dsh/store
@bthwani/dsh/cart
@bthwani/dsh/checkout
@bthwani/dsh/order
@bthwani/dsh/delivery
@bthwani/wlt/wallet
@bthwani/wlt/payment
@bthwani/wlt/payout
...
```

---

## 7. Canonical repository topology

### 7.1 DSH

```text
services/dsh/
├── backend/
│   ├── cmd/
│   └── internal/
│       ├── runtime/
│       ├── transport/http/
│       ├── integrations/
│       └── <semantic-capability>/
├── contracts/
│   ├── dsh.openapi.yaml
│   ├── modules/
│   └── components/
├── clients/generated/
├── frontend/
│   └── <semantic-capability>/
└── database/
```

### 7.2 WLT

```text
services/wlt/
├── backend/
│   ├── cmd/wlt-api/
│   └── internal/
│       ├── runtime/
│       ├── transport/http/
│       ├── integrations/
│       └── <financial-capability>/
├── contracts/
│   ├── wlt.openapi.yaml
│   ├── modules/
│   └── components/
├── clients/generated/
├── frontend/
│   └── <financial-capability>/
└── database/
```

`services/wlt/frontend` is the canonical location for reusable WLT-owned frontend behavior/presentation because WLT is a shared bounded context and `services/wlt` is already the WLT workspace/package boundary.

Do not create a second generic `packages/wlt-ui`, `shared/wlt`, or DSH-owned WLT feature tree unless a genuinely independent package lifecycle proves necessary.

---

## 8. Canonical capability naming law

Names are architecture. Every surviving capability/topic name must describe stable business meaning, not historical implementation or a particular screen.

### 8.1 Canonical naming grammar

Use stable English domain nouns.

Preferred canonical capability identifiers are singular or mass nouns:

```text
DSH
catalog
store
cart
checkout
order
delivery
dispatch
pickup
serviceability
address
notification
support
marketing
promotion
rating
special-request

WLT
wallet
ledger
payment
refund
settlement
commission
payout
reconciliation
pricing
collateral
cod
promotion-funding
commercial   # only if proven cohesive
```

Plural API resources are normal (`/orders`, `/payments`), but capability ownership names should remain stable domain concepts.

### 8.2 Multi-word naming

Canonical semantic ID / TypeScript / OpenAPI folder:

```text
special-request
promotion-funding
financial-eligibility
```

Go package/directory may use idiomatic lowercase without punctuation when required:

```text
specialrequest
promotionfunding
financialeligibility
```

These are language encodings of the same canonical semantic capability, not different topics.

### 8.3 Names that are not domain capabilities by default

The following are presumed noncanonical as semantic topic owners unless a unique responsibility is positively proven:

```text
home
home-discovery
account
hub
workspace
workboard
dashboard
governance
truth
closure
extensions
runtime-extensions
boundary
finance
operations
administration
common
shared
core
misc
central
canonical
new
legacy
v2/v3 without real version semantics
```

These words may describe UI composition or technical roles, but must not hide real domain ownership.

Examples:

```text
home-discovery
→ `home` is an app route; split actual meaning into store/discovery/marketing/etc.

account
→ app information architecture composing profile/address/identity/wallet/etc.

finance
→ too broad; replace with wallet/payment/settlement/payout/etc.

catalog-governance
→ if governance is merely catalog policy/approval, Catalog remains owner.

order-truth
→ Order is the owner; “truth” is not a second capability.

payout-failure-boundary
→ failure is a payout lifecycle state, not a domain.

workforce-finance
→ actor/consumer-shaped; distribute to actual WLT financial capabilities.
```

### 8.4 Actor names do not create capability ownership

Do not create separate topics merely because the actor differs:

```text
client-orders
partner-orders
captain-orders
field-orders
```

Prefer:

```text
order/
  presentation/client
  presentation/partner
  presentation/captain
```

only when actor-specific presentation is truly required.

### 8.5 Mechanisms do not create capability names

Do not create top-level semantic topics from:

```text
saga
outbox
worker
cache
retry
adapter
provider
handler
controller
repository
```

Place mechanisms under the capability/runtime/integration owner that needs them.

### 8.6 Naming admission gate

A new topic name is allowed only if all are proven:

```text
UNIQUE_STABLE_BUSINESS_MEANING
CLEAR_CANONICAL_OWNER
NOT_A_SCREEN_OR_ROUTE_NAME
NOT_AN_ACTOR_PREFIX
NOT_AN_IMPLEMENTATION_MECHANISM
NOT_A_LIFECYCLE_PHASE_ONLY
NOT_A_GENERIC_BUCKET
NOT_DUPLICATE_OF_EXISTING_CAPABILITY
NAME_MATCHES_BACKEND/CONTRACT/FRONTEND_TAXONOMY
```

---

## 9. Frontend ownership law

### 9.1 DSH app-shaped feature trees must disappear

Current losing containers after value migration:

```text
services/dsh/frontend/app-client
services/dsh/frontend/app-partner
services/dsh/frontend/app-captain
services/dsh/frontend/app-field
services/dsh/frontend/control-panel
```

Treatment:

```text
CENSUS_FEATURE_VALUE
→ MOVE_DOMAIN/PRESENTATION_VALUE_TO_DSH_CAPABILITY
→ MOVE_APP_COMPOSITION/NAVIGATION/PLATFORM_VALUE_TO_apps/*/runtime
→ UPDATE_IMPORTS/EXPORTS/ROUTES
→ DELETE_APP_SHAPED_FEATURE_CONTAINER
→ PROVE_OLD_PATH_REACHABILITY=0
```

### 9.2 `frontend/shared` must not survive as a domain dump

Rehome every child by semantic owner, then delete the umbrella and its barrels.

Do not recreate the same problem as `common`, `core`, `features`, or another generic bucket.

### 9.3 WLT frontend belongs to WLT

WLT-owned reusable UI/controller/view-model/data-access belongs under:

```text
services/wlt/frontend/<financial-capability>
```

Examples:

```text
services/wlt/frontend/wallet
services/wlt/frontend/payment
services/wlt/frontend/refund
services/wlt/frontend/settlement
services/wlt/frontend/commission
services/wlt/frontend/payout
services/wlt/frontend/collateral
```

The WLT frontend consumes WLT generated bindings and exposes host-neutral capability entrypoints.

It must not import DSH routes, DSH app navigation, DSH store/order implementation details, or app-runtime files.

### 9.4 DSH-specific WLT usage

If DSH Checkout uses WLT Payment:

```text
WLT owns payment state/contracts/reusable payment presentation
DSH owns checkout orchestration and order/cart semantics
APP owns route composition
```

A DSH-specific adapter may exist only when it translates DSH checkout context into the WLT public contract without duplicating WLT business truth.

### 9.5 Platform/native code

Expo/React-Native/Next-specific implementations such as file pickers, URI handling, push registration, secure storage, device adapters, and platform routing belong in app runtime or a proven cross-app runtime package. Capability frontend accepts ports/interfaces when needed.

### 9.6 Screen responsibility

Screens own presentation and transient interaction state only. They must not own authoritative transitions, permissions, prices/fees, financial calculations, serviceability, statuses, allowed actions, or persistent validation.

---

## 10. Backend architecture law

### 10.1 Thin process entrypoints

`cmd/*/main.go` owns process startup only:

```text
load config
→ construct runtime
→ run
→ graceful shutdown
```

Move route registration, worker composition, DB/provider construction, and large config orchestration into canonical runtime/composition ownership.

### 10.2 Transport

HTTP transport owns:

```text
decode
syntactic validation
trusted context extraction
call canonical capability
encode response/error
```

No SQL, business policy, financial decision, state machine, or permission truth in transport handlers.

### 10.3 Integrations

External boundaries live under explicit integration ownership:

```text
DSH: integrations/identity, workforce, platform, wlt, maps, media
WLT: integrations/dsh, financial-rails/providers
```

An integration translates/protects a remote boundary; it does not become owner of remote or local domain truth.

### 10.4 Mechanisms are not domains

Saga, outbox, worker, cache, health, retry, and provider routing live under the domain/runtime/integration owner that needs them unless an independent lifecycle genuinely requires a separate boundary.

### 10.5 Go package shape

Do not mechanically create `domain/application/usecase/repository/services/helpers/utils/common` layers for every capability. Prefer cohesive Go packages and split only for real semantic/lifecycle boundaries.

Any hand-maintained file >400 logical LOC requires cohesion review; >700 is presumed noncanonical absent proof; >1000 blocks closure by default absent strong single-responsibility justification.

---

## 11. DSH high-priority structural targets

Resolve from live evidence:

```text
centralcatalog + catalogapproval → catalog
checkoutpaymentsaga / checkoutfinanceoutbox → checkout or explicit WLT integration mechanism
internal/http → transport/http
workforceclient/platformclient/mapproviders/WLT client → integrations/*
large multi-responsibility main.go → thin cmd + runtime composition
frontend/app-* → semantic capabilities + app runtime composition
frontend/shared → real capability owners
frontend/wlt-boundary → WLT frontend or thin DSH integration only
```

No old package path survives through aliases/reexports after cutover.

---

## 12. WLT backend ownership law

Preserve real financial bounded contexts when semantics confirm:

```text
wallet
ledger
payment
refund
settlement
commission
payout
reconciliation
pricing
cod
collateral
promotion-funding
penalty/adjustment if independently justified
commercial if cohesive
```

Challenge/refound technical top-level containers:

```text
http → transport/http
health → runtime/health
dshnotify + dshoutbox → integrations/dsh
provider → integrations/financial-rails/providers
shared → decompose to real owners, then delete
```

Semantic boundaries:

```text
SETTLEMENT = what is owed and settlement lifecycle
PAYOUT = actual disbursement/destination/provider execution
RECONCILIATION = proof/matching of internal vs external financial truth
COD = reservation/collection/finalization financial flow
COMMISSION = commission policy/lifecycle/query/posting when independent
```

---

## 13. Contract architecture and generated lineage

Each service has one composition root:

```text
dsh.openapi.yaml
wlt.openapi.yaml
```

Each semantic capability has one canonical contract owner under `modules/`. Multiple physical files are allowed only when cohesion/size justify them and they remain one authority.

```text
CANONICAL_OPENAPI_SOURCE
→ ONE_REPRODUCIBLE_COMPOSITION/GENERATION_TOOLCHAIN
→ JUSTIFIED_GENERATED_OUTPUT_SET
→ CONSUMERS
```

Generated bundles/clients are derived artifacts, never manually edited truth.

No module list, operation list, DTO list, or enum list may be manually synchronized across OpenAPI root, manifests, TypeScript maps, adapters, and frontend code.

If tooling requires derived metadata, generate it from canonical sources.

---

## 14. DSH capability/security metadata cleanup

Manual operation arrays in capability maps and overlapping authorization-capability registries must not remain independent authorities.

Target:

```text
permission vocabulary → canonical Identity/Security owner
server enforcement → backend authority
operationId + declared security/capability metadata → canonical contract metadata
surface composition → derived consumer metadata
```

Files such as these re-earn existence individually:

```text
capabilities.ts
capability-map.ts
surface-map.ts
authorization-capabilities.json
backend-route-classification.json
service.manifest.ts
```

Delete empty/duplicative control artifacts. Generate derived metadata where needed.

---

## 15. WLT contract refoundation

Converge current WLT contract topology by financial capability:

```text
payment-session capabilities overlay + DSH checkout handoff overlay
→ payment

settlement-operations + settlement part of settlements-commissions
→ settlement

commission part of settlements-commissions
→ commission when independent

payout destinations + payout failure boundary
→ payout

commercial-summary + commercial
→ commercial if cohesive

store-onboarding-fee
→ commercial or proven fee-policy owner

special-request-quotes
→ pricing if WLT owns only financial quote semantics

workforce-finance
→ wallet/commission/payout/etc.

captain-collateral
→ collateral

dispatch-financial-eligibility
→ actual WLT financial owner
```

`operation-state.json` must not remain mixed contract/runtime/evidence authority. Salvage durable metadata, retain proof in verification/tests, then delete unless a unique live responsibility is proven.

All `$ref` targets must resolve. Composition verification must fail closed on unresolved refs, duplicate operationIds, duplicate routes, or conflicting schemas.

---

## 16. Database ownership and migration law

For every material persisted fact prove:

```text
FACT
SERVICE_OWNER
CAPABILITY_OWNER
CANONICAL_TABLE/COLUMNS
CANONICAL_WRITER
READBACK_PATH
CONSTRAINTS/INDEXES
IDEMPOTENCY/AUDIT_REQUIREMENTS
SECURITY/PII_CLASSIFICATION
FINANCIAL_CLASSIFICATION
DERIVED_PROJECTIONS
LOSING_STORAGE_AUTHORITIES
```

One truth does not mean one table. Normalized tables are valid. Multiple mutable authorities for the same meaning are forbidden.

Each service keeps one globally ordered canonical migration lane unless a real deployment boundary proves otherwise.

For destructive schema change:

```text
PROVE_REQUIRED_DURABLE_TRUTH
→ DESIGN_DETERMINISTIC_TRANSFORMATION/BACKFILL
→ PROVE_ROLL_FORWARD/CUTOVER_ORDER
→ EXECUTE
→ RECONCILE_COUNTS_AND_INVARIANTS
→ CUT_OVER_READERS/WRITERS
→ DELETE_OBSOLETE_SCHEMA_AUTHORITY
→ PROVE_READBACK
```

Never weaken durable constraints merely to ease migration.

---

## 17. WLT financial shadow-truth audit

Treat `reference` packages, `*_status_refs`, duplicated balances, materialized status copies, and financial projections as high-risk until proven.

For each determine:

```text
SOURCE_ENTITY
DERIVATION
WRITERS
MUTABILITY
REBUILDABILITY
CONSISTENCY_GUARANTEE
CONSUMERS
CAN_IT_DIVERGE
IS_IT_USED_FOR_MUTATION_DECISIONS
```

Allowed outcomes:

```text
REDUNDANT_MUTABLE_MIRROR → migrate consumers → delete
NECESSARY_DERIVED_PROJECTION → explicit one-way, non-authoritative, rebuildable
ACTUAL_CANONICAL_TRUTH_MISNAMED_AS_REFERENCE → rehome/rename
```

No ambiguous financial reference survives closure.

---

## 18. Heightened financial/security gate

Before closing any WLT financial mutation path prove all applicable claims:

```text
CANONICAL_FINANCIAL_OWNER
CANONICAL_LEDGER_WRITER
BALANCED_POSTING_WHERE_LEDGER_APPLIES
IDEMPOTENCY/EXACT_REPLAY
TRANSACTION_ATOMICITY
CONCURRENCY/LOCKING
OPERATOR_CONTEXT_ISOLATION
AUTHORIZED_PRINCIPAL_SERVER_ENFORCEMENT
AUDITABILITY
PROVIDER_RESULT_PROVENANCE
UNKNOWN_PROVIDER_RESULT_HANDLING
REFUND/REVERSAL_EFFECT
SETTLEMENT/PAYOUT_SEPARATION
RECONCILIATION_PATH
CANONICAL_READBACK
ZERO_PARALLEL_FINANCIAL_WRITERS
```

Never delete valid financial/security safeguards or tests merely to simplify topology.

---

## 19. Runtime/config/jobs/workers

Audit and canonicalize:

```text
env variables
runtime config
base URLs/ports
feature flags
Docker/compose/deployment
startup/bootstrap
health/readiness
workers/jobs/outboxes/sagas
secret references
observability/retry/backoff
```

Each role gets one canonical authority. Remove stale aliases, duplicate flags, old endpoints, dead worker registrations, and obsolete config after cutover.

---

## 20. Package/export/workspace law

`services/dsh` and `services/wlt` remain service workspace/package boundaries unless a stronger repository-wide decision changes that.

Public exports express semantic capabilities, not deployable apps.

After cutover remove app-shaped exports and old `wlt-boundary` exports.

WLT frontend exports should be host-neutral capability exports from the WLT package. If React/UI exports are added, declare their actual runtime/peer dependencies explicitly; do not hide frontend dependencies behind generated-client-only metadata.

Update in the same cone:

```text
package.json exports/dependencies/peerDependencies
project.json/Nx targets
tsconfig includes/paths
pnpm workspace/lockfile when affected
Go imports
Docker contexts
scripts/guards
CI path filters
```

`package.json` and `project.json` are not duplicates by definition; each survives only if its package-manager/workspace role remains real.

---

## 21. Test and assurance law

Classify every affected test/fixture/mock/snapshot/helper:

```text
VALID_CANONICAL_SPEC
OBSOLETE_BEHAVIOR
DUPLICATE_COVERAGE
WRONG_LAYER_SPEC
LOSING_TOPOLOGY_TEST
MISSING_PREVENTION
BROKEN_TEST_INFRA
```

Treatment:

```text
VALID_CANONICAL_SPEC → preserve/refound
OBSOLETE_BEHAVIOR → delete
DUPLICATE_COVERAGE → merge/delete
WRONG_LAYER_SPEC → rewrite/rehome
LOSING_TOPOLOGY_TEST → delete with loser
MISSING_PREVENTION → add smallest durable prevention proof
```

Prefer compiler/typecheck/test/schema/runtime checks over custom guards when they prove the same claim. Remove campaign-only guards after closure.

---

## 22. Execution strategy — systemic roots then vertical capabilities

Do not execute long layer-only waves such as all contracts, then all backend, then all frontend.

### P0 — Recover exact state

```text
PIN h
RECONSTRUCT ACTIVE UNIT
RECONSTRUCT OPEN CUTOVERS
RECONSTRUCT LOSERS STILL REQUIRED FOR MIGRATION
```

### P1 — Full DSH/WLT census and canonical model

Map:

```text
capabilities/names
owners
writers/readers
DB facts
routes/events
contracts/generation
frontend consumers
app composition/navigation
runtime/config/workers
tests/assurance
```

### P2 — Close systemic enabling catastrophes

Examples:

```text
app runtime/composition ownership
canonical capability vocabulary/naming
contract composition/generator authority
service metadata/capability registry authority
backend runtime/transport/integration topology
WLT financial writer/reference authority map
```

### P3 — Vertical capability refoundation

Canonical unit:

```text
PRODUCT MEANING
→ DB TRUTH
→ DOMAIN WRITER/READER
→ TRANSPORT/EVENT
→ OPENAPI CONTRACT
→ GENERATED BINDING
→ SERVICE FRONTEND CONTROLLER/VIEW
→ APP RUNTIME COMPOSITION/ROUTE
→ USER/SYSTEM MUTATION
→ PERSISTED READBACK
→ DELETE ALL LOSERS
→ NEGATIVE-SPACE VERIFY
```

Do not mark backend, contract, frontend, or app-runtime subparts separately closed while the capability chain remains split.

### P4 — Cross-capability residue cleanup

Remove only residue not already deleted eagerly:

```text
stale dependencies
stale exports
obsolete tsconfig/Nx entries
obsolete tests/fixtures
campaign-only tools/guards
stale docs/governance references
```

### P5 — Adversarial final re-census

Re-enumerate DSH/WLT and affected repository cone from exact `h` with zero inherited assumptions.

---

## 23. Execution-unit template

Every active unit reconstructs from live state:

```text
UNIT_ID
EXACT_H_SHA
CANONICAL_CAPABILITY_ID
CURRENT_NAMES_AND_ALIASES
SOURCE_OF_DEFECT
REQUIRED_SOURCE_OF_FIX
WHY_THIS_IS_HIGHEST_SAFE_EXECUTABLE_ROOT
REQUIRED_TRUTH
CURRENT_OWNERS/WRITERS/READERS
SERIOUS_ALTERNATIVES_CONSIDERED
RANKING_RELEVANT_UNKNOWNS
CANONICAL_TARGET
EXPECTED_LOSERS
COMPLETE_AFFECTED_CONE
DATA_MIGRATION
CODE_MIGRATION
CONTRACT/GENERATION_MIGRATION
SERVICE_FRONTEND_MIGRATION
APP_RUNTIME_MIGRATION
RUNTIME/CONFIG_MIGRATION
TEST/ASSURANCE_MIGRATION
CUTOVER_ORDER
DELETION_ORDER
PARENT_PRUNING
POSITIVE_VERIFICATION
NEGATIVE_SPACE/FALSIFICATION
ADMISSION_PREVENTION
FRESH_RE_CENSUS
```

Material unknowns that can change ownership or deletion safety must be resolved before destructive closure.

Do not persist unit status into this plan.

---

## 24. Concurrency and writer safety

Parallel execution is allowed only for proven disjoint affected cones.

```text
ONE_ACTIVE_WRITER_AUTHORITY_PER_OVERLAPPING_CONE
RE_PIN_BEFORE_EACH_WRITE_SEQUENCE
NO_TWO_SESSIONS_MUTATE_SHARED_CONTRACT/DB/EXPORT/RUNTIME_AUTHORITY_UNCOORDINATED
HEAD_MOVEMENT_REQUIRES_RECONCILIATION
```

Shared roots such as contract composition, package exports, migration manifests, runtime composition, canonical naming maps, and cross-service financial boundaries serialize dependent work.

---

## 25. Cutover and deletion gate

A move/rename/merge is not closure. A loser survives only while an explicit migration dependency remains.

```text
CANONICAL_WINNER_BUILT
→ REQUIRED_TRUTH_MIGRATED
→ WRITERS_CUT_OVER
→ READERS/CONSUMERS_CUT_OVER
→ SERVICE_FRONTEND_CUT_OVER
→ APP_ROUTES/COMPOSITION_CUT_OVER
→ EXPORTS/CONFIG_CUT_OVER
→ OLD_WRITES=0
→ OLD_READERS=0
→ DELETE_LOSER_AT_HIGHEST_SAFE_GRANULARITY
→ DELETE_ALIASES/REEXPORTS/BRIDGES
→ PRUNE_EMPTY/MEANINGLESS_PARENTS
→ VERIFY_NEGATIVE_SPACE
```

Internal compatibility wrappers are forbidden by default. A temporary compatibility boundary is allowed only for a proven external consumer that cannot cut over atomically, with explicit scope and removal condition.

---

## 26. Positive verification requirements

As applicable prove:

```text
Go build/test
TypeScript typecheck/build
OpenAPI composition/ref resolution/operation uniqueness
client regeneration determinism
DB migration/reset/upgrade behavior
schema constraints/indexes
runtime startup/health/readiness
worker/outbox/retry behavior
API request/response/error semantics
authorization rejection/acceptance
mobile/web route composition
real rendered/device behavior when materially changed
mutation→persisted readback
financial invariants
```

Green output proves only the claim it actually exercises.

---

## 27. Negative-space and falsification gate

After each unit and globally search for:

```text
OLD_PATH_REFERENCES
LOSING_IMPORTS/EXPORTS
OLD_APP_SHAPED_DSH_EXPORTS
OLD_Dsh*Application_MONOLITHIC_COMPOSITION
OLD_SHARED_DOMAIN_IMPORTS
OLD_WLT_BOUNDARY_FEATURE_IMPORTS
SERVICE→APP_RUNTIME_IMPORTS
DUPLICATE_CAPABILITY_NAMES_FOR_SAME_MEANING
SCREEN/ACTOR/MECHANISM_SHAPED_TOPIC_NAMES
LOSING_ROUTE_REGISTRATIONS
LOSING_OPENAPI_MODULE_REFS
LOSING_GENERATOR_INPUTS
MANUAL_DTO/ENUM/STATUS/ACTION_MIRRORS
MANUAL_OPERATION_REGISTRIES
DUPLICATE_API_CLIENTS
DUPLICATE_MUTABLE_WRITERS
SHADOW_FINANCIAL_AUTHORITIES
STALE_TSCONFIG/NX/WORKSPACE_PATHS
STALE_RUNTIME_CONFIG/FLAGS/WORKERS
STALE_TESTS/FIXTURES/MOCKS
WRAPPERS/ALIASES/REEXPORTS
EMPTY/MEANINGLESS_PARENTS
MISLEADING_FILENAMES/DIRECTORIES
UNJUSTIFIED_OVERSIZED/MULTI_RESPONSIBILITY_FILES
UNUSED_DEPENDENCIES
UNRESOLVED_OR_CONFLICTING_OPENAPI_REFS
ORPHAN_SCREENS/APIS/BINDINGS/DATA
```

Positive proof of the new path is insufficient while a losing path remains reachable.

---

## 28. Per-capability closure gate

A capability is closed only when all applicable claims pass on exact current `h`:

```text
CANONICAL_CAPABILITY_NAME_PROVEN
REQUIRED_PRODUCT_MEANING_ACCOUNTED_FOR
CANONICAL_OWNER_ACCOUNTED_FOR
CANONICAL_STORAGE/WRITER_ACCOUNTED_FOR
CANONICAL_BACKEND_ACCOUNTED_FOR
CANONICAL_TRANSPORT_ACCOUNTED_FOR
CANONICAL_CONTRACT_ACCOUNTED_FOR
GENERATED_LINEAGE_REPRODUCIBLE
CANONICAL_SERVICE_FRONTEND_ACCOUNTED_FOR_WHEN_UI_EXISTS
ALL_REQUIRED_APP/SURFACE_CONSUMERS_ACCOUNTED_FOR
APP_RUNTIME_COMPOSITION_ACCOUNTED_FOR
SECURITY_ACCOUNTED_FOR
FINANCIAL_INVARIANTS_ACCOUNTED_FOR_WHEN_APPLICABLE
MIGRATION/CUTOVER_COMPLETE
OLD_WRITES=0
OLD_READERS/CONSUMERS=0
LOSERS_DELETED
CONFIG/EXPORT/TEST_RESIDUE=0
NEGATIVE_SPACE_PASS
RUNTIME/E2E_READBACK_PASS
ADMISSION_HOLE_CLOSED
FRESH_RE_CENSUS_PASS
```

---

## 29. DSH structural exit gate

DSH cannot be structurally qualified while any known instance remains of:

```text
APP_SHAPED_FEATURE_OWNERSHIP_IN_services/dsh/frontend
CURRENT_FRONTEND_SHARED_UMBRELLA_AS_DOMAIN_OWNER
CURRENT_WLT_FEATURE_TREE_UNDER_DSH_FRONTEND
MONOLITHIC_DSH_APPLICATION_EXPORT_OWNING_APP_COMPOSITION
DUPLICATE_OR_NONSTANDARD_CAPABILITY_NAMES
DUPLICATE_CAPABILITY_TREES
HTTP_MEGA_DOMAIN_AUTHORITY
TOP_LEVEL_SAGA/OUTBOX_PSEUDO_DOMAINS_WITHOUT_JUSTIFICATION
MANUAL_CONTRACT/DTO/ENUM/OPERATION_MIRRORS
DUPLICATE_CAPABILITY/AUTHORIZATION_REGISTRIES
APP_SHAPED_PACKAGE_EXPORTS_PRESERVING_OLD_TOPOLOGY
TSCONFIG/NX/WORKSPACE_REFERENCES_TO_DELETED_TOPOLOGY
BACKEND↔CONTRACT↔FRONTEND↔APP_PARITY_GAPS
```

---

## 30. WLT structural/financial exit gate

WLT cannot be qualified while any known instance remains of:

```text
GENERIC_SHARED_DOMAIN_CONTAINER
HTTP_MEGA_DOMAIN_AUTHORITY
DSHNOTIFY/DSHOUTBOX_AS_PSEUDO_DOMAINS
PAYMENT/SETTLEMENT/PAYOUT/RECONCILIATION_OWNERSHIP_AMBIGUITY
FINANCIAL_REFERENCE_SHADOW_TRUTH
ACTOR/CONSUMER_SHAPED_FINANCIAL_CONTRACT_AUTHORITY
PERMANENT_SCHEMA_OVERLAYS_FOR_NORMAL_PAYMENT_TRUTH
DUPLICATE_SETTLEMENT/PAYOUT_CONTRACT_FRAGMENTATION
MANUAL_FINANCIAL_DTO/ENUM/API_MIRRORS
PARALLEL_LEDGER/BALANCE/FINANCIAL_WRITERS
WLT_FEATURE_IMPLEMENTATION_OWNED_BY_DSH_FRONTEND
WLT_FRONTEND_COUPLED_TO_DSH_OR_SPECIFIC_APP_RUNTIME
UNVERIFIED_FINANCIAL_INVARIANTS_OR_READBACK
```

---

## 31. Global Level-4 DSH/WLT fixed-point gate

Completion requires a fresh adversarial re-census on exact live `h` proving:

```text
KNOWN_MATERIAL_DSH_WLT_FINDINGS=0
KNOWN_MATERIAL_UNKNOWNS=0
KNOWN_MATERIAL_PARTIAL_CUTOVERS=0
KNOWN_MATERIAL_PARALLEL/SHADOW_TRUTH=0
KNOWN_MATERIAL_LOSING/LEGACY_CONTAINERS=0
KNOWN_MATERIAL_WRAPPERS/ALIASES/REEXPORTS=0
KNOWN_MATERIAL_DUPLICATE_OR_AMBIGUOUS_CAPABILITY_NAMES=0
KNOWN_MATERIAL_DUPLICATE_CONTRACT_AUTHORITIES=0
KNOWN_MATERIAL_MANUAL_GENERATED_MIRRORS=0
KNOWN_MATERIAL_DUPLICATE_WRITERS=0
KNOWN_MATERIAL_RUNTIME_CONFIG_DRIFT=0
KNOWN_MATERIAL_STALE_TEST/TOOL/EXPORT/DEPENDENCY_RESIDUE=0
KNOWN_MATERIAL_BACKEND↔CONTRACT↔FRONTEND↔APP_MISMATCH=0
KNOWN_MATERIAL_SECURITY/FINANCIAL_GAPS=0
KNOWN_REQUIRED_CAPABILITIES_OR_JOURNEYS_LOST_DURING_REFOUNDATION=0
APP→SERVICE_DEPENDENCY_DIRECTION=PASS
WLT_MULTI_CONSUMER_INDEPENDENCE=PASS
FRESH_FALSIFICATION=PASS
MATERIAL_BUILD/DB/RUNTIME/E2E_EVIDENCE=PASS
```

The first green build or empty local task list is not completion.

---

## 32. Mandatory self-deletion

Only after Section 31 passes:

```text
VERIFY_NO_SCRIPT_READS_THIS_FILE
VERIFY_NO_CI_WORKFLOW_READS_THIS_FILE
VERIFY_NO_BUILD/RUNTIME/GENERATOR_READS_THIS_FILE
VERIFY_NO_TEST/GOVERNANCE/PROMPT_ROUTING_REQUIRES_THIS_FILE
VERIFY_NO_OPEN_UNIT_DEPENDS_ON_THIS_FILE
```

Then:

```text
DELETE tools/DSH-WLT-CANONICAL-REFOUNDATION-EXECUTION-PLAN.md
→ RE_PIN_LIVE_h
→ VERIFY_PATH_ABSENT
→ VERIFY_ZERO_REFERENCES_TO_PATH
→ FINAL_DSH_WLT_FIXED_POINT_CONFIRMATION
```

The final canonical repository must not retain this campaign plan.
