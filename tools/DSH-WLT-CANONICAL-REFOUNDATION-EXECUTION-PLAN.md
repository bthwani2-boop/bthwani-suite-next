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

If execution is performed under the repository orchestrator, the orchestrator remains supreme. This file specializes the DSH/WLT campaign but does not weaken any repository-wide law.

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

Refound DSH and WLT from semantic ownership first principles so the final repository expresses the product/system truth directly.

Required final properties:

```text
ONE_CANONICAL_OWNER_PER_MATERIAL_RESPONSIBILITY
ONE_CANONICAL_MUTABLE_AUTHORITY_PER_BUSINESS_MEANING
ONE_REPRODUCIBLE_CONTRACT/GENERATION_LINEAGE
ONE_CANONICAL_RUNTIME/CONFIG_AUTHORITY_PER_ROLE
ONE_CANONICAL_APP_COMPOSITION/NAVIGATION_AUTHORITY_PER_DEPLOYABLE_APP
ZERO_KNOWN_PARALLEL_OR_SHADOW_TRUTH
ZERO_KNOWN_LOSING/LEGACY_CONTAINERS
ZERO_KNOWN_STALE_WRAPPERS/ALIASES/REEXPORTS
ZERO_KNOWN_MANUAL_DTO/ENUM/OPERATION_MIRRORS
ZERO_KNOWN_DUPLICATE_WRITERS
ZERO_KNOWN_BACKEND↔CONTRACT↔FRONTEND_SEMANTIC_DRIFT
ZERO_KNOWN_PARTIAL_CUTOVERS
ZERO_KNOWN_DSH/WLT_MATERIAL_FINDINGS
```

The goal is not to beautify inherited folders. Preserve required value, rebuild canonical ownership, migrate consumers, and delete the losing topology.

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

Never mutate from memory, an old chat, this plan's examples, local-only assumptions, or a previously observed path.

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
contracts/** shared contract primitives
core/** or packages/** when consumed by DSH/WLT
workspace/package/export/lockfile metadata
tools/** generators/guards/scripts
.github/** DSH/WLT assurance
runtime/env/docker/compose/deployment/config
```

Every structural unit must account for files, symbols, imports, exports, routes, manifests, generated outputs, tests, fixtures, mocks, DB schema, runtime registrations, workers, and external consumers in its complete affected cone.

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

## 5. Canonical service boundary

### 5.1 DSH

DSH owns operational commerce/delivery truth, including as applicable:

```text
catalog/store/assortment operational truth
cart
checkout orchestration
orders
pickup
delivery
dispatch
serviceability/addresses
operational client/partner/captain/field journeys
notifications/support/marketing operational semantics
```

### 5.2 WLT

WLT owns financial truth, including as applicable:

```text
wallet/balance authority
ledger/payment/refund
settlement/commission/payout
reconciliation
COD financial lifecycle
collateral
financial pricing/funding/eligibility when truly financial
financial provider/rail state
```

### 5.3 Cross-service rule

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

## 6. Canonical repository topology

The final topology is semantic-capability-oriented. Diagrams below are conceptual targets; create only containers that prove a real responsibility.

### 6.1 Deployable applications

```text
apps/
├── app-client/runtime/
├── app-partner/runtime/
├── app-captain/runtime/
├── app-field/runtime/
└── control-panel/runtime/
```

Each runtime owns only deployable-app concerns:

```text
route files / route hierarchy
navigation and deep links
application composition root
bootstrap/session wiring
native/platform adapters
Expo/Next configuration
assets that are truly app-owned
runtime observability/config
```

Feature/domain truth does not live here.

### 6.2 DSH

```text
services/dsh/
├── backend/
│   ├── cmd/
│   └── internal/
│       ├── runtime/
│       ├── transport/http/
│       ├── integrations/
│       └── <semantic-capabilities>/
├── contracts/
│   ├── dsh.openapi.yaml
│   ├── modules/
│   └── components/
├── clients/generated/
├── frontend/
│   └── <semantic-capabilities>/
└── database/
```

Prefer direct capability owners such as `catalog`, `cart`, `checkout`, `orders`, `delivery`, `dispatch`, `stores`, `notifications`, `support`, etc. Do not create umbrella folders such as `commerce` unless that folder itself owns real shared semantics rather than merely grouping children.

### 6.3 WLT

```text
services/wlt/
├── backend/
│   ├── cmd/wlt-api/
│   └── internal/
│       ├── runtime/
│       ├── transport/http/
│       ├── integrations/
│       ├── security/              # only if a distinct WLT security boundary is proven
│       └── <financial-capabilities>/
├── contracts/
│   ├── wlt.openapi.yaml
│   ├── modules/
│   └── components/
├── clients/generated/
├── frontend/
│   └── <financial-capabilities>/  # required where financial UI/presentation exists
└── database/
```

Do not collapse wallet, ledger, payment, refund, settlement, payout, and reconciliation into a generic `finance` package.

---

## 7. Frontend ownership law

### 7.1 Apps are shells, capabilities own features

The current DSH app-shaped feature containers are losing topology after value migration:

```text
services/dsh/frontend/app-client
services/dsh/frontend/app-partner
services/dsh/frontend/app-captain
services/dsh/frontend/app-field
services/dsh/frontend/control-panel
```

Required treatment:

```text
CENSUS_FEATURE_VALUE
→ MOVE_DOMAIN/PRESENTATION_VALUE_TO_CANONICAL_CAPABILITY
→ MOVE_NAVIGATION/COMPOSITION/PLATFORM_VALUE_TO_apps/*/runtime
→ UPDATE_ALL_IMPORTS/EXPORTS/ROUTES
→ DELETE_APP_SHAPED_FEATURE_CONTAINER
→ PROVE_OLD_PATH_REACHABILITY=0
```

Actor-specific presentation is allowed under the capability when behavior/UX genuinely differs:

```text
frontend/orders/presentation/client
frontend/orders/presentation/partner
frontend/orders/presentation/captain
frontend/orders/presentation/control-panel
```

Do not create actor copies when one presentation works for multiple surfaces.

### 7.2 Navigation/composition authority

App route paths, tab hierarchy, deep links, back behavior, Expo Router/Next routing, and composition belong to `apps/*/runtime`.

Capability code exposes semantic components/actions/callbacks. It does not call app route strings as business truth.

### 7.3 `account` is information architecture, not automatic ownership

Account/My Space may compose profile, addresses, identity, notifications, support, benefits, preferences, and financial surfaces. Those capabilities keep their real owners; the account page may remain only as shell/composition UI.

### 7.4 Current `frontend/shared` must be demolished as an umbrella

The existing DSH `frontend/shared` domain dump must not survive as a generic ownership refuge.

```text
REHOME_DOMAIN_VALUE_TO_REAL_CAPABILITY
REHOME_PRESENTATIONAL_PRIMITIVES_TO_EXISTING_UI_OWNER_WHEN_TRULY_SHARED
REHOME_RUNTIME_PLATFORM_CODE_TO_APP_RUNTIME_OR_REAL_RUNTIME_PACKAGE
DELETE_SHARED_BARRELS/OLD_PATHS
DELETE_CURRENT_SHARED_UMBRELLA_AFTER_CUTOVER
```

Do not recreate the same problem under another `shared/common/core` name.

### 7.5 Current `frontend/wlt-boundary` must not remain a WLT feature tree inside DSH

Financial feature value currently under DSH must move to WLT ownership:

```text
wallet/collateral/commission/payment/payout/ledger/refund/settlement/etc.
→ services/wlt/frontend/<capability>
```

DSH may retain only a thin, explicit orchestration/integration boundary where DSH-specific flow truly requires one. No second WLT frontend domain tree may remain inside DSH.

### 7.6 Platform/native code

Expo/React-Native/Next-specific implementations such as native file pickers, URI handling, push registration, secure storage, device adapters, and platform routing belong in app runtime or a proven cross-app runtime package. Domain frontend accepts interfaces/ports where needed.

### 7.7 Generic CSS declarations

Generic web TypeScript declarations such as `*.module.css` are not DSH domain truth. Rehome them to the web app/runtime or repository-wide TypeScript/web configuration according to actual scope.

### 7.8 Screen responsibility

Screens own presentation and transient interaction state only. They must not own authoritative business transitions, permissions, prices/fees, financial calculations, serviceability, statuses, allowed actions, or persistent validation.

---

## 8. Backend architecture law

### 8.1 Thin process entrypoints

`cmd/*/main.go` owns process startup only:

```text
load config
→ construct runtime
→ run
→ graceful shutdown
```

Move route registration, worker composition, DB/provider construction, and large config orchestration into `internal/runtime` or another explicitly justified composition owner.

### 8.2 Transport

HTTP transport owns:

```text
decode
syntactic validation
trusted context extraction
call canonical capability
encode response/error
```

No SQL, business policy, financial decision, state machine, or permission truth in transport handlers.

### 8.3 Integrations

External boundaries live under explicit integration ownership, for example:

```text
DSH: integrations/identity, workforce, platform, wlt, maps, media
WLT: integrations/dsh, financial-rails/providers
```

An integration package translates/protects a remote boundary; it does not become owner of remote or local domain truth.

### 8.4 Mechanisms are not domains

Saga, outbox, worker, cache, health, retry, and provider routing are mechanisms. They live under the domain/runtime/integration owner that needs them unless an independent lifecycle genuinely requires a separate boundary.

### 8.5 Go package shape

Do not mechanically create `domain/application/usecase/repository/services/helpers/utils/common` layers for every capability. Prefer cohesive Go packages and split only for real semantic/lifecycle boundaries.

Any hand-maintained file >400 logical LOC requires cohesion review; >700 is presumed noncanonical absent proof; >1000 blocks closure by default absent strong single-responsibility justification.

---

## 9. DSH backend high-priority structural targets

Resolve these current structural candidates as systemic roots where evidence confirms:

```text
centralcatalog + catalogapproval → one canonical Catalog ownership boundary
checkoutpaymentsaga / checkoutfinanceoutbox → checkout or explicit WLT integration mechanism
internal/http → transport/http
workforceclient/platformclient/mapproviders/WLT client → integrations/*
large multi-responsibility main.go → thin cmd + runtime composition
```

Do not preserve old package names through aliases/reexports after cutover.

---

## 10. WLT backend ownership law

### 10.1 Preserve real financial bounded contexts

Strong candidates to remain independent when semantics confirm:

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
promotion funding
penalty/adjustment if independently justified
commercial if it proves one coherent context
```

### 10.2 Technical top-level containers must be rehomed

Challenge and normally refound:

```text
http → transport/http
health → runtime/health
dshnotify + dshoutbox → integrations/dsh
provider → integrations/financial-rails/providers
shared → decompose to real owners, then delete
```

### 10.3 Reconciliation boundary

Explicitly disambiguate:

```text
payment-specific provider reconciliation helper
payout external-statement matching
system/financial reconciliation case/process
```

One semantic meaning gets one owner. Rename/move files so names reflect that meaning; delete misleading `canonical_*` or duplicate reconciliation files after migration.

### 10.4 Settlement / payout / reconciliation

```text
SETTLEMENT = what is owed and settlement lifecycle
PAYOUT = actual disbursement/destination/provider execution lifecycle
RECONCILIATION = proof/matching of internal vs external financial truth
```

Do not let one package silently own another's state machine.

### 10.5 COD / commission

COD owns reservation/collection/finalization financial flow. Commission owns commission policy/lifecycle/query/posting if it proves an independent responsibility. Commission code embedded in COD must migrate if it represents that separate meaning.

---

## 11. Contract architecture and generated lineage

### 11.1 One canonical contract ownership tree

Each service has one composition root:

```text
dsh.openapi.yaml
wlt.openapi.yaml
```

Each semantic capability has one canonical contract owner under `modules/`. A capability may use multiple physical files only when size/cohesion justifies it; those files must still form one owner and must not create parallel authorities.

Domain schemas stay with their capability. `components/` is limited to genuinely cross-capability protocol/transport primitives.

### 11.2 Generated artifacts

```text
CANONICAL_OPENAPI_SOURCE
→ ONE_REPRODUCIBLE_COMPOSITION/GENERATION_TOOLCHAIN
→ JUSTIFIED_GENERATED_OUTPUT_SET
→ CONSUMERS
```

Generated bundles/clients are derived artifacts, never manually edited truth. Deterministic generated files need not be tracked unless a real distribution/runtime requirement proves otherwise.

### 11.3 No manual synchronized contract registries

A module list, operation list, DTO list, or enum list must not be manually repeated across OpenAPI root, manifests, TypeScript maps, adapters, and frontend code.

If tooling requires a manifest, derive/generate it from the canonical source; do not maintain a second hand-synchronized module registry.

### 11.4 DSH capability/security metadata

Manual operation arrays in `capability-map.ts` and overlapping authorization-capability registries must not remain independent authorities.

Target:

```text
permission vocabulary → canonical Identity/Security owner
server enforcement → backend authority
operationId + declared security/capability metadata → canonical contract metadata
surface composition → app/capability consumption metadata derived from canonical owners
```

UI visibility may derive from permissions but must never be the enforcement authority.

`capabilities.ts`, `surface-map.ts`, `authorization-capabilities.json`, `backend-route-classification.json`, and similar files each re-earn existence. Empty or duplicative artifacts are deleted; required derived metadata is generated from canonical sources.

### 11.5 WLT contract refoundation

The current WLT contract topology must converge by financial capability. Resolve, migrate, then delete losing fragments such as:

```text
payment-session capability overlay + DSH checkout handoff overlay
→ payments canonical owner

settlement-operations + settlement part of settlements-commissions
→ settlements canonical owner

commission part of settlements-commissions
→ commissions canonical owner when independent

payout destinations + payout failure boundary
→ payouts canonical owner

commercial-summary + commercial
→ commercial owner if one coherent context

store-onboarding-fee
→ commercial or another proven fee-policy owner

special-request-quotes
→ pricing if WLT owns only financial quote semantics

workforce-finance
→ distribute to wallet/commission/payout/etc.; Workforce remains the actor/domain consumer

captain-collateral
→ collateral when actor-independent

dispatch-financial-eligibility
→ financial eligibility or the actual financial owner; Dispatch remains DSH consumer
```

`operation-state.json` must not remain a mixed contract/runtime/evidence authority. Salvage durable contract metadata into canonical contract metadata, keep verification evidence in tests/evidence systems, then delete it unless a unique live runtime responsibility is proven.

### 11.6 Common component consistency

All `$ref` targets must resolve from the canonical composition root. No contract may reference missing/renamed common response/schema symbols. Composition verification must fail closed on unresolved refs, duplicate operationIds, duplicate routes, or conflicting schemas.

---

## 12. Database ownership and migration law

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

One truth does not mean one table. Normalized tables are valid. What is forbidden is multiple mutable authorities for the same meaning.

Each service keeps one globally ordered canonical migration lane unless a real deployment boundary proves otherwise. Do not fragment migration ordering merely to mirror source-code capabilities.

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

Never weaken durable constraints to make migration easier.

---

## 13. WLT financial shadow-truth audit

`reference` packages, `*_status_refs`, duplicated balances, materialized status copies, and financial projections are high-risk until proven.

For every such structure determine:

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

Allowed outcomes only:

```text
REDUNDANT_MUTABLE_MIRROR → migrate consumers → delete
NECESSARY_DERIVED_PROJECTION → explicit one-way, non-authoritative, rebuildable
ACTUAL_CANONICAL_TRUTH_MISNAMED_AS_REFERENCE → rehome/rename to true owner
```

No ambiguous financial reference survives closure.

---

## 14. Heightened financial/security gate

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

## 15. Runtime/config/jobs/workers

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

## 16. Package/export/workspace law

Public package exports must express semantic capability ownership, not losing app-shaped feature topology.

After frontend cutover, app-shaped DSH exports such as:

```text
@bthwani/dsh/app-client
@bthwani/dsh/app-partner
@bthwani/dsh/app-captain
@bthwani/dsh/app-field
@bthwani/dsh/control-panel
@bthwani/dsh/wlt-boundary
```

must be removed unless an export represents a proven thin runtime-neutral boundary with unique value. Normal target exports are capability-oriented, for example:

```text
@bthwani/dsh/catalog
@bthwani/dsh/cart
@bthwani/dsh/checkout
@bthwani/dsh/orders
@bthwani/wlt/payment
@bthwani/wlt/wallet
...
```

Update package manifests, Nx targets, tsconfig includes/path mappings, Go imports, Docker contexts, scripts, CI filters, and tooling paths in the same affected cone. Old topology may not survive in configuration.

`package.json` and `project.json` are not duplicates by definition; each survives only if its package-manager/workspace role remains real.

---

## 17. Test and assurance law

Classify every materially affected test/fixture/mock/snapshot/helper:

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
MISSING_PREVENTION → add the smallest durable prevention proof
```

Prefer native compiler/typecheck/test/schema/runtime checks over custom guards when they prove the same claim. Add custom guards only for a unique admission hole, and remove campaign-only guards after closure.

---

## 18. Execution strategy — systemic roots first, then vertical capabilities

Do not execute the campaign as long layer-only waves (`all contracts`, then `all backend`, then `all frontend`). That creates prolonged half-migrations and semantic drift.

### Phase P0 — Recover exact state

```text
PIN h
RECONSTRUCT ACTIVE UNIT
RECONSTRUCT OPEN CUTOVERS
RECONSTRUCT LOSERS STILL REQUIRED FOR MIGRATION
```

### Phase P1 — Full DSH/WLT census and canonical model

Build an evidence-backed current map for:

```text
capabilities
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

Do not commit the census as a second permanent status authority.

### Phase P2 — Close only systemic enabling catastrophes

Examples of legitimate cross-capability systemic units:

```text
app runtime/composition ownership
contract composition/generator authority
service metadata/capability registry authority
backend runtime/transport/integration topology
WLT financial writer/reference authority map
```

Each systemic unit still requires full migration/cutover/deletion of its affected cone.

### Phase P3 — Vertical capability refoundation

After systemic prerequisites, close capabilities end-to-end. Select the highest-impact/root-tax capability dynamically from live evidence.

Canonical vertical unit:

```text
PRODUCT MEANING
→ DB TRUTH
→ DOMAIN WRITER/READER
→ TRANSPORT/EVENT
→ OPENAPI CONTRACT
→ GENERATED BINDING
→ FRONTEND CONTROLLER/VIEW
→ APP RUNTIME COMPOSITION/ROUTE
→ USER/SYSTEM MUTATION
→ PERSISTED READBACK
→ DELETE ALL LOSERS
→ NEGATIVE-SPACE VERIFY
```

Do not mark backend, contract, or frontend subparts separately closed while the capability chain remains split.

### Phase P4 — Cross-capability residue and assurance cleanup

Remove only residue not already deleted eagerly during units:

```text
stale dependencies
stale package exports
obsolete tsconfig/Nx entries
obsolete tests/fixtures
campaign-only tools/guards
stale docs/governance references
```

This phase is not a garbage queue: known loser residue must be deleted as soon as its last migration dependency ends.

### Phase P5 — Adversarial final re-census

Freshly re-enumerate DSH/WLT and the affected repository cone from exact `h`; search for structural, semantic, financial, runtime, contract, and experience gaps from zero assumptions.

---

## 19. Execution-unit template

Every active unit must reconstruct these fields from live state:

```text
UNIT_ID
EXACT_H_SHA
SOURCE_OF_DEFECT
REQUIRED_SOURCE_OF_FIX
WHY_THIS_IS_THE_HIGHEST_SAFE_EXECUTABLE_ROOT
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
FRONTEND/APP_MIGRATION
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

Material unknowns that can change ownership or deletion safety must be resolved before destructive closure of that cone.

Do not persist unit status into this plan.

---

## 20. Concurrency and writer safety

Parallel execution is allowed only for proven disjoint affected cones.

```text
ONE_ACTIVE_WRITER_AUTHORITY_PER_OVERLAPPING_CONE
RE_PIN_BEFORE_EACH_WRITE_SEQUENCE
NO_TWO_SESSIONS_MUTATE_SHARED_CONTRACT/DB/EXPORT/RUNTIME_AUTHORITY_UNCOORDINATED
HEAD_MOVEMENT_REQUIRES_RECONCILIATION
```

Shared roots such as contract composition, package exports, migration manifests, runtime composition, and cross-service financial boundaries serialize dependent work.

---

## 21. Cutover and deletion gate

A move/rename/merge is not closure. A loser survives only while an explicit migration dependency remains.

Required sequence:

```text
CANONICAL_WINNER_BUILT
→ REQUIRED_TRUTH_MIGRATED
→ WRITERS_CUT_OVER
→ READERS/CONSUMERS_CUT_OVER
→ ROUTES/EXPORTS/CONFIG/NAVIGATION_CUT_OVER
→ OLD_WRITES=0
→ OLD_READERS=0
→ DELETE_LOSER_AT_HIGHEST_SAFE_GRANULARITY
→ DELETE_ALIASES/REEXPORTS/BRIDGES
→ PRUNE_EMPTY/MEANINGLESS_PARENTS
→ VERIFY_NEGATIVE_SPACE
```

Internal compatibility wrappers are forbidden by default. A temporary compatibility boundary is allowed only for a proven external consumer that cannot cut over atomically, with explicit scope and removal condition.

---

## 22. Positive verification requirements

Use the highest material boundary affected by the unit. As applicable prove:

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

## 23. Negative-space and falsification gate

After each unit and globally at the end, search for:

```text
OLD_PATH_REFERENCES
LOSING_IMPORTS/EXPORTS
OLD_APP_FEATURE_EXPORTS
OLD_SHARED_DOMAIN_IMPORTS
OLD_WLT_BOUNDARY_FEATURE_IMPORTS
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

## 24. Per-capability closure gate

A capability is closed only when all applicable claims pass on exact current `h`:

```text
REQUIRED_PRODUCT_MEANING_ACCOUNTED_FOR
CANONICAL_OWNER_ACCOUNTED_FOR
CANONICAL_STORAGE/WRITER_ACCOUNTED_FOR
CANONICAL_BACKEND_ACCOUNTED_FOR
CANONICAL_TRANSPORT_ACCOUNTED_FOR
CANONICAL_CONTRACT_ACCOUNTED_FOR
GENERATED_LINEAGE_REPRODUCIBLE
ALL_REQUIRED_FRONTEND/SURFACE_CONSUMERS_ACCOUNTED_FOR
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

## 25. DSH structural exit gate

DSH cannot be structurally qualified while any known instance remains of:

```text
APP_SHAPED_FEATURE_OWNERSHIP_IN_services/dsh/frontend
CURRENT_FRONTEND_SHARED_UMBRELLA_AS_DOMAIN_OWNER
CURRENT_WLT_FEATURE_TREE_UNDER_DSH_FRONTEND
DUPLICATE_CAPABILITY_TREES
HTTP_MEGA_DOMAIN_AUTHORITY
TOP_LEVEL_SAGA/OUTBOX_PSEUDO_DOMAINS_WITHOUT_JUSTIFICATION
MANUAL_CONTRACT/DTO/ENUM/OPERATION_MIRRORS
DUPLICATE_CAPABILITY/AUTHORIZATION_REGISTRIES
APP_SHAPED_PACKAGE_EXPORTS_PRESERVING_OLD_TOPOLOGY
TSCONFIG/NX/WORKSPACE_REFERENCES_TO_DELETED_TOPOLOGY
GENERIC_WEB_TYPES_MISOWNED_BY_DSH_DOMAIN
BACKEND↔CONTRACT↔FRONTEND_PARITY_GAPS
```

---

## 26. WLT structural/financial exit gate

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
WLT_FEATURE_IMPLEMENTATION_STILL_OWNED_BY_DSH_FRONTEND
UNVERIFIED_FINANCIAL_INVARIANTS_OR_READBACK
```

---

## 27. Global Level-4 DSH/WLT fixed-point gate

Completion requires a fresh adversarial re-census on exact live `h` proving:

```text
KNOWN_MATERIAL_DSH_WLT_FINDINGS=0
KNOWN_MATERIAL_UNKNOWNS=0
KNOWN_MATERIAL_PARTIAL_CUTOVERS=0
KNOWN_MATERIAL_PARALLEL/SHADOW_TRUTH=0
KNOWN_MATERIAL_LOSING/LEGACY_CONTAINERS=0
KNOWN_MATERIAL_WRAPPERS/ALIASES/REEXPORTS=0
KNOWN_MATERIAL_DUPLICATE_CONTRACT_AUTHORITIES=0
KNOWN_MATERIAL_MANUAL_GENERATED_MIRRORS=0
KNOWN_MATERIAL_DUPLICATE_WRITERS=0
KNOWN_MATERIAL_RUNTIME_CONFIG_DRIFT=0
KNOWN_MATERIAL_STALE_TEST/TOOL/EXPORT/DEPENDENCY_RESIDUE=0
KNOWN_MATERIAL_BACKEND↔CONTRACT↔FRONTEND_MISMATCH=0
KNOWN_MATERIAL_SECURITY/FINANCIAL_GAPS=0
KNOWN_REQUIRED_CAPABILITIES_OR_JOURNEYS_LOST_DURING_REFOUNDATION=0
FRESH_FALSIFICATION=PASS
MATERIAL_BUILD/DB/RUNTIME/E2E_EVIDENCE=PASS
```

The first green build or empty local task list is not completion.

---

## 28. Mandatory self-deletion

Only after Section 27 passes:

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