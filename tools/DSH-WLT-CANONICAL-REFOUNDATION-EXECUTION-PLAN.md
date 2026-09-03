# DSH + WLT Canonical Refoundation — Temporary Execution Plan

PLAN_CLASS: TEMPORARY_DESTRUCTIVE_REFOUNDATION_EXECUTION_PLAN
TARGET_REPOSITORY: bthwani2-boop/bthwani-suite-next
TARGET_BRANCH: h
TARGET_SERVICES: services/dsh + services/wlt
COMPLETION_TARGET: LEVEL_4_FIXED_POINT
TEMPORARY_ARTIFACT: YES
SELF_DELETE_AFTER_VERIFIED_CLOSURE: REQUIRED

---

## 0. Purpose and temporary-life law

This file exists only to drive the complete canonical refoundation of `services/dsh` and `services/wlt` as one coherent product/system campaign.

It is intentionally located under `tools/` and is **not** an orchestrator module, semantic owner, permanent governance document, runtime dependency, product contract, or long-lived repository authority.

The file must be deleted from live `h` after all DSH/WLT refoundation closure gates in this plan pass and a final fresh re-census proves that no runtime, build, CI, contract, test, tool, documentation, or developer workflow depends on it.

```text
PLAN_CREATED
→ EXECUTE_DSH_WLT_REFOUNDATION
→ VERIFY_FULL_CLOSURE
→ VERIFY_PLAN_HAS_ZERO_LIVE_DEPENDENTS
→ DELETE_THIS_FILE
→ VERIFY_DELETION
```

The plan must never be preserved as archive/history/residue after completion. Git history is sufficient forensic archive.

---

## 1. Mission

Refound DSH and WLT from the highest correct semantic/product/system granularity down to files and symbols so that the final live branch contains:

```text
ONE_CANONICAL_OWNER_PER_MATERIAL_RESPONSIBILITY
ONE_CANONICAL_PERSISTED_TRUTH_PER_BUSINESS_MEANING
ONE_CANONICAL_CONTRACT_LINEAGE
ONE_CANONICAL_BACKEND_IMPLEMENTATION_PATH
ONE_CANONICAL_FRONTEND_CAPABILITY_PATH
ONE_CANONICAL_RUNTIME/CONFIG_PATH_PER_ROLE
ZERO_KNOWN_PARALLEL_OR_SHADOW_TRUTH
ZERO_KNOWN_LEGACY/LOSING_CONTAINERS
ZERO_KNOWN_STALE_WRAPPERS/ALIASES/REEXPORTS
ZERO_KNOWN_DUPLICATE_DTO/ENUM/API_AUTHORITIES
ZERO_KNOWN_BACKEND↔CONTRACT↔FRONTEND_SEMANTIC_DRIFT
ZERO_KNOWN_UNTREATED_DSH/WLT_STRUCTURAL_FINDINGS
```

The objective is not to make the current topology prettier. The objective is to preserve required product/system truth while rebuilding the minimum necessary canonical structure.

---

## 2. Non-negotiable execution laws

### 2.1 Live-state law

Every execution or resumed session starts from exact live `h`, not memory, old plan state, local assumptions, screenshots, or prior chat conclusions.

```text
PIN_LIVE_h
→ INSPECT_CURRENT_TREE
→ INSPECT_RELEVANT_HISTORY/DIFFS
→ RECONSTRUCT_CURRENT_DSH_WLT_STATE
→ IDENTIFY_OPEN_UNIT_OR_NEXT_FRONTIER
→ EXECUTE
```

Any path/file listed in this plan is a **candidate or target concept**, not permission to mutate stale paths blindly. The executor must verify the current exact tree before mutation.

### 2.2 Hostile inheritance law

```text
CURRENT_EXISTENCE != RIGHT_TO_EXIST
CURRENT_USAGE != CANONICAL
BUILD_GREEN != CANONICAL
TEST_GREEN != CANONICAL
HAS_CALLERS != DESERVES_TO_SURVIVE
```

Required truth embedded in a losing structure must be salvaged and migrated; the losing structure itself must not survive merely because it contains useful behavior.

### 2.3 No patch-campaign law

Do not chase isolated errors file-by-file when the error is caused by a higher structural root.

Prefer:

```text
CENSUS
→ IDENTIFY_HIGHER_ROOT
→ DESIGN_CANONICAL_TARGET
→ MIGRATE_REQUIRED_TRUTH
→ CUT_OVER_ALL_CONSUMERS
→ DELETE_LOSERS
→ VERIFY_NEGATIVE_SPACE
```

### 2.4 Complete cutover law

A move/rename/merge is not closure.

Closure requires:

```text
WINNER_EXISTS
ALL_REQUIRED_TRUTH_MIGRATED
ALL_REQUIRED_CONSUMERS_CUT_OVER
LOSER_REACHABILITY=0
LOSER_DELETED
STALE_PARENT_PRUNED
STALE_EXPORTS/CONFIG/TESTS/CONTRACTS_REMOVED
RUNTIME_READBACK_PROVEN
```

### 2.5 No permanent campaign residue

Do not create permanent `legacy`, `archive`, `old`, `_unused`, compatibility wrappers, re-export bridges, duplicate facades, or migration-only container trees unless a real external compatibility requirement is proven and bounded.

---

## 3. Full scope

The campaign covers **all material DSH/WLT ownership and parity surfaces**, including at minimum:

```text
services/dsh/**
services/wlt/**
apps/** when consuming DSH/WLT capabilities
contracts/** when shared contract components affect DSH/WLT
core/** when DSH/WLT boundaries depend on it
tools/** when DSH/WLT tooling/verification/generation depends on it
.github/** when DSH/WLT assurance depends on it
workspace/package/export/tsconfig/build metadata affecting DSH/WLT
runtime/config/env/docker/compose/ports/health/readiness/jobs/workers
```

Within the services, census must include:

```text
backend/cmd
backend/internal
frontend
database
contracts
clients/generated
package.json
project.json
service.manifest.ts
tsconfig*.json
Docker/runtime config
tests/fixtures/mocks/helpers
scripts/guards/verifiers
```

---

## 4. Required truth inventory before destructive mutation

Before deleting a candidate root, reconstruct the required truth it may contain.

### 4.1 DSH required truth classes

At minimum audit:

```text
ACTORS
client
partner
captain
field
operator/admin

PRODUCT/CAPABILITY TRUTH
stores
catalog
assortment/inventory/pricing where DSH-owned
cart
checkout orchestration
orders
cancellation
pickup
delivery
dispatch
serviceability/service areas
addresses
client profile
partner operations
fleet/team where genuinely distinct
field assignment/readiness
notifications
marketing/promotions presentation/eligibility where DSH-owned
support/incidents
ratings
special requests
home/discovery
administration/operations/analytics where genuinely required

REQUIRED EXPERIENCE VALUE
approved screen designs
navigation/journey intent
RTL/localization/accessibility
required assets and interaction behavior

REQUIRED OPERATIONAL VALUE
idempotency
state transitions
retry/recovery
outbox/saga behavior
privacy/retention
health/readiness
```

### 4.2 WLT required truth classes

At minimum audit:

```text
wallet
ledger
payment sessions/payment operations
refunds
settlements
commissions
payouts
reconciliation
COD financial lifecycle
collateral
pricing/financial quotes
promotion funding
financial eligibility where genuinely WLT-owned
commercial products/subscriptions/loyalty where genuinely required
provider/financial-rail integration
financial audit/idempotency/replay
operator-context isolation
```

### 4.3 Preserve value, not inherited topology

Existing good UI/behavior may be preserved while its old app/shared/container ownership is demolished.

```text
ARCHITECTURE_REFOUNDATION != VISUAL_REDESIGN
```

A screen is deleted only if the product journey itself fails existence proof, not because the file currently lives under a losing folder.

---

## 5. Canonical DSH/WLT service boundary

### 5.1 DSH owns operational commerce truth

DSH owns product/operational meaning such as:

```text
catalog/store/cart/checkout orchestration
orders/delivery/dispatch/pickup
serviceability
operational partner/captain/field flows
customer operational experience
```

### 5.2 WLT owns financial truth

WLT owns financial meaning such as:

```text
wallet/balance authority
ledger
payment state/provider outcome
refund financial state
settlement
commission
payout
reconciliation
financial pricing/funding where assigned to WLT
```

### 5.3 Cross-service prohibition

DSH may store opaque WLT references/projections required for its operational flow, but must not become a second financial authority.

WLT may consume DSH evidence/references, but must not become owner of order/dispatch/workforce/store/special-request product truth merely because those domains trigger a financial effect.

For every cross-service datum prove:

```text
OWNER
SOURCE
MUTABILITY
TRANSPORT
PERSISTENCE_IF_ANY
DERIVED_OR_AUTHORITATIVE
READBACK
FAILURE/RETRY_BEHAVIOR
```

---

## 6. Canonical capability ownership matrix

Build and maintain a live execution matrix during the campaign. Every material capability must map to exactly one semantic owner per layer.

Required columns:

| Capability | Product owner | DB owner | Go owner | HTTP owner | Contract owner | Generated binding | Frontend owner | External integration | Status |
|---|---|---|---|---|---|---|---|---|---|

Seed target examples, subject to live semantic proof:

| Capability | Service | Target semantic owner |
|---|---|---|
| Catalog | DSH | `backend/internal/catalog` + `contracts/modules/catalog.openapi.yaml` + `frontend/catalog` |
| Cart | DSH | `backend/internal/cart` + `contracts/modules/cart.openapi.yaml` + `frontend/cart` |
| Checkout | DSH | `backend/internal/checkout` + `contracts/modules/checkout.openapi.yaml` + `frontend/checkout` |
| Orders | DSH | `backend/internal/orders` + `contracts/modules/orders.openapi.yaml` + `frontend/orders` |
| Payments | WLT | `backend/internal/payment` + `contracts/modules/payments.openapi.yaml` |
| Ledger | WLT | `backend/internal/ledger` + exposed contract only where required |
| Refunds | WLT | `backend/internal/refund` + `contracts/modules/refunds.openapi.yaml` |
| Settlements | WLT | `backend/internal/settlement` + `contracts/modules/settlements.openapi.yaml` |
| Commissions | WLT | `backend/internal/commission` when independent + `contracts/modules/commissions.openapi.yaml` |
| Payouts | WLT | `backend/internal/payout` + `contracts/modules/payouts.openapi.yaml` |
| Reconciliation | WLT | `backend/internal/reconciliation` + `contracts/modules/reconciliation.openapi.yaml` |

Do not force these target names if the live census proves a better semantic boundary. What is mandatory is one justified owner and zero shadow owners.

---

## 7. End-to-end truth-lineage law

No material capability is closed until the applicable chain is proven end-to-end:

```text
PERSISTED_TRUTH
→ CANONICAL_WRITER
→ DOMAIN_SEMANTICS
→ HTTP/EVENT_TRANSPORT
→ CANONICAL_CONTRACT
→ GENERATED_BINDING
→ REQUIRED_CONSUMER
→ USER/SYSTEM_ACTION
→ MUTATION
→ PERSISTED_READBACK
→ PRESENTED_RESULT
```

For every exposed operation build a parity record containing:

```text
operationId/event
capability owner
backend handler
backend domain call
storage effect/read source
OpenAPI definition
request schema
response schema
error semantics
security requirements
generated client symbol
frontend/controller consumer
runtime verification result
```

If any link disagrees semantically, the unit remains open.

---

## 8. DSH target topology

The conceptual target is capability-oriented DSH ownership with technical infrastructure separated from semantic domains.

```text
services/dsh/
├── backend/
│   ├── cmd/
│   │   ├── dsh-api/
│   │   └── independent-job-entrypoints-only-if-proven/
│   └── internal/
│       ├── runtime/
│       ├── transport/http/
│       ├── integrations/
│       │   ├── identity/
│       │   ├── workforce/
│       │   ├── platform/
│       │   ├── wlt/
│       │   ├── maps/
│       │   └── media/
│       ├── catalog/
│       ├── cart/
│       ├── checkout/
│       ├── orders/
│       ├── stores/
│       ├── dispatch/
│       ├── delivery/
│       ├── notifications/
│       ├── addresses/
│       ├── profile/
│       ├── support/
│       └── ...only proven capabilities
├── contracts/
│   ├── dsh.openapi.yaml
│   ├── modules/
│   └── components/
├── clients/generated/
├── frontend/
│   ├── catalog/
│   ├── cart/
│   ├── checkout/
│   ├── orders/
│   ├── delivery/
│   ├── dispatch/
│   ├── stores/
│   ├── notifications/
│   ├── profile/
│   ├── addresses/
│   ├── support/
│   └── ...only proven capabilities
└── database/
```

Do not create empty scaffolding merely to match this diagram.

---

## 9. DSH frontend refoundation law

### 9.1 Apps are surfaces, not domain owners

Legacy candidate roots such as:

```text
frontend/app-client
frontend/app-partner
frontend/app-captain
frontend/app-field
frontend/control-panel
```

must not remain semantic feature owners merely because a feature appears on one application surface.

Actor-specific presentation may exist under the capability when genuinely different, while application runtime owns composition/navigation/bootstrap/deep links/native/platform wiring.

### 9.2 Generic `shared` is presumed noncanonical until proven

`frontend/shared` must be decomposed by semantic ownership. Do not move old app trees into `shared` and call that consolidation.

### 9.3 Account is not automatically a domain

UI groupings such as Account/My Space may compose profile, addresses, identity, notifications, support, benefits, preferences, finance, etc. The UI grouping does not create backend/storage authority.

### 9.4 Screen responsibility

Screen files own:

```text
layout
presentation
visual formatting
loading/empty/error presentation
local selection/modal/form interaction state
accessibility/RTL/animation
calling semantic actions
```

Screens do **not** own:

```text
business transitions
permission truth
financial calculations
serviceability authority
persistent business validation
canonical statuses/enums
allowed-action truth
SQL
```

### 9.5 Frontend capability layer

Capability frontend code may own:

```text
API invocation through generated binding
query/cache orchestration
mutations
transient editing state
view models/presentation derivation
UX validation that is explicitly non-authoritative
```

Manual DTO/enum/status/action maps duplicating backend/contract truth are shadow-authority candidates.

---

## 10. DSH backend refoundation law

### 10.1 `cmd`

`cmd/*/main.go` is process entry only.

Target:

```text
main
→ load config
→ construct runtime
→ run
→ graceful shutdown
```

Business route registration, worker topology, provider construction, DB orchestration, and config parsing should move to justified runtime/composition ownership when currently concentrated in `main.go`.

### 10.2 HTTP

`internal/http` mega-package is a whole-subtree refoundation candidate.

HTTP responsibility:

```text
decode request
→ syntactic validation
→ trusted context extraction
→ call canonical capability
→ encode canonical response/error
```

No SQL/business policy/financial decision/state-machine authority in handlers.

### 10.3 Integrations

External-service client packages should be named by the external boundary and must not masquerade as local domains.

Candidate normalization:

```text
workforceclient → integrations/workforce
platformclient  → integrations/platform
wlt             → integrations/wlt where it is only WLT client/boundary
mapproviders    → integrations/maps
```

Exact treatment requires live responsibility census.

### 10.4 Sagas/outboxes/workers

Saga/outbox/worker is an implementation mechanism, not automatically a top-level domain.

Classify each by the business process/event owner, then absorb under the canonical owner or a justified integration boundary.

Candidate examples:

```text
checkoutpaymentsaga → checkout
checkoutfinanceoutbox → checkout/WLT integration after owner proof
promotionfundingoutbox → promotion-funding owner
wltoutbox → integrations/wlt when appropriate
```

Delete top-level pseudo-domain containers after complete cutover.

---

## 11. DSH contract refoundation law

### 11.1 One semantic module per capability

Eliminate mixed parallel composition such as simultaneous topic `paths/*.yaml`, `components/schemas/*.yaml`, and separate journey/extension/truth OpenAPI files that describe overlapping capability truth.

Target principle:

```text
ONE_SEMANTIC_CAPABILITY
→ ONE_CANONICAL_OPENAPI_MODULE
```

### 11.2 Root contract

`dsh.openapi.yaml` should become the thin canonical composition root, not a second business-domain mega-file.

### 11.3 Generated lineage

```text
OpenAPI source
→ deterministic bundle
→ generated TypeScript binding
→ consumers
```

Generated bundle/client are artifacts, not hand-edited truth.

### 11.4 Manual adapters/mirrors

Inventory and eliminate manual typed adapters that duplicate contract DTOs, enums, URLs, operation names, allowed actions, or response structures.

Adapters may survive only when they add a proven non-duplicative boundary responsibility.

---

## 12. DSH service-root metadata refoundation

Audit together:

```text
capabilities.ts
capability-map.ts
surface-map.ts
service.manifest.ts
package.json
project.json
tsconfig.json
tsconfig.*.json
```

Target rules:

```text
ONE_CAPABILITY_VOCABULARY
ZERO_DUPLICATE_MANUAL_OPERATION_REGISTRIES
SURFACE_MAP_DERIVED_OR_MINIMAL
SERVICE_MANIFEST_MINIMAL
PACKAGE_EXPORTS_MATCH_CANONICAL_TOPOLOGY
TSCONFIG_DOES_NOT_PRESERVE_LOSING_APP/SHARED_TREES
SPECIAL_COMPILER_ISLANDS_REQUIRE_REAL_BOUNDARY
```

Strong candidates after live proof:

```text
capabilities.ts → absorb/delete if only wrapper over capability-map
capability-map.ts → refound/remove manual operation lists if OpenAPI metadata can own lineage
surface-map.ts → derive/absorb if duplicate
special tsconfig files → delete when no independent build boundary remains
```

Do not merge `package.json` and `project.json` merely because both contain scripts/targets; package-manager and Nx/workspace roles may remain distinct when justified.

---

## 13. WLT target topology

WLT must preserve strong financial capability boundaries while removing technical and actor/journey-shaped pseudo-domains.

```text
services/wlt/
├── backend/
│   ├── cmd/wlt-api/
│   └── internal/
│       ├── runtime/
│       ├── transport/http/
│       ├── integrations/
│       │   ├── dsh/
│       │   └── financial-rails-or-providers/
│       ├── security/
│       ├── wallet/
│       ├── ledger/
│       ├── payment/
│       ├── refund/
│       ├── settlement/
│       ├── commission/          # only if independently proven
│       ├── payout/
│       ├── reconciliation/
│       ├── pricing/
│       ├── cod/
│       ├── collateral/
│       ├── promotionfunding/
│       └── ...only proven financial capabilities
├── contracts/
│   ├── wlt.openapi.yaml
│   ├── modules/
│   └── components/
├── clients/generated/
└── database/
```

Do **not** collapse ledger, wallet, payment, refund, settlement, payout, and reconciliation into one giant `finance` package.

---

## 14. WLT backend disposition rules

### 14.1 Strong capability candidates to preserve/refound

```text
ledger
wallet
payment
refund
settlement
payout
reconciliation
pricing
collateral
cod
penalty when independently justified
promotionfunding when financial funding truth is WLT-owned
```

### 14.2 Technical top-level containers to challenge

```text
http
shared
health
dshnotify
dshoutbox
provider
```

Likely target classes:

```text
http → transport/http
health → runtime/health
dshnotify + dshoutbox → integrations/dsh
provider → integrations/financial-rails or another proven provider boundary
shared → eliminate by rehoming each responsibility
```

### 14.3 `shared` demolition target

Current generic responsibilities such as operator context, service auth, reference auth, response encoding, mutation receipt must be assigned to real owners such as:

```text
security/
idempotency/ or owning financial capability
transport/http/
```

Then delete `internal/shared`.

### 14.4 Reconciliation ownership audit

Explicitly resolve overlap among:

```text
internal/reconciliation
payment/*reconciliation*
payout/*reconciliation*
```

Define canonical meanings:

```text
PAYMENT reconciliation-specific operation/helper
vs
SYSTEM/FINANCIAL reconciliation case/process
vs
PAYOUT external statement matching
```

Use semantic ownership, not filenames. Remove misleading `canonical_*` files from losing owners after migration.

### 14.5 Settlement / payout boundary

Target semantic separation:

```text
SETTLEMENT = what is owed / settlement calculation and lifecycle
PAYOUT     = actual disbursement destination/execution/provider lifecycle
RECONCILIATION = proof/matching of internal and external financial truth
```

Move files according to meaning; do not preserve historical placement.

### 14.6 COD / commission boundary

Audit whether commission logic currently embedded in COD is independent financial responsibility. If yes:

```text
cod → reservation/collection/finalization financial flow
commission → commission policy/lifecycle/posting/query
```

Delete duplicate/parallel commission paths afterward.

---

## 15. WLT financial-reference shadow-truth audit

Treat generic `reference` structures and `*_status_refs` storage as high-risk until proven.

For every reference table/model/API prove:

```text
canonical source entity
derivation mechanism
writer count
mutability
consistency guarantee
rebuildability
consumer list
whether it can disagree with source
whether any mutation reads it as authority
```

Allowed outcomes:

```text
A) redundant mutable mirror → migrate consumers → delete mirror/table/code
B) necessary derived projection → explicit non-authoritative projection with one-way derivation and rebuild semantics
C) canonical truth incorrectly named as reference → rehome/rename to real owner
```

No financial `*_ref` may remain ambiguous.

---

## 16. WLT contract refoundation law

### 16.1 Canonical target modules

Conceptual target:

```text
contracts/
├── wlt.openapi.yaml
├── modules/
│   ├── wallet.openapi.yaml
│   ├── ledger.openapi.yaml           # only exposed operations
│   ├── payments.openapi.yaml
│   ├── refunds.openapi.yaml
│   ├── settlements.openapi.yaml
│   ├── commissions.openapi.yaml      # if separate capability
│   ├── payouts.openapi.yaml
│   ├── reconciliation.openapi.yaml
│   ├── pricing.openapi.yaml
│   ├── cod.openapi.yaml
│   ├── collateral.openapi.yaml
│   ├── commercial.openapi.yaml       # if retained as one real context
│   ├── promotion-funding.openapi.yaml
│   └── financial-eligibility.openapi.yaml # only if independent
└── components/
    └── common.openapi.yaml
```

### 16.2 Generated bundle

`contracts/generated/wlt.bundle.openapi.yaml` is generated-only and must never be edited as source. It may exist locally transiently but is not live canonical source.

### 16.3 Manifest duplication

If both `wlt.openapi.yaml` and `contract.manifest.yaml` maintain the same manual module registry, reduce to one source. Generate/delete the second representation according to tooling needs.

### 16.4 Operation-state residue

`operation-state.json` must not remain a mixed contract/runtime/evidence authority. Move durable contract metadata into OpenAPI and runtime proof into verification/tests, then delete the file if no unique required responsibility remains.

### 16.5 Overlay elimination

Canonical business schema truth must not require permanent overlays for normal behavior.

Strong merge candidates:

```text
wlt.payment-session-capabilities.overlay.yaml
→ payments.openapi.yaml

wlt.dsh-checkout-handoff.overlay.yaml
→ canonical payment contract/boundary schemas
```

Delete overlays after composition/consumer cutover.

### 16.6 Known fragmentation candidates

Resolve by semantic owner, then delete losing files:

```text
settlements-commissions + settlement-operations
→ settlements + commissions

payouts-destinations + payout-failure-boundary
→ payouts

commercial-summary + commercial
→ commercial if one context

store-onboarding-fee
→ commercial if it is truly commercial fee policy

special-request-quotes
→ pricing if WLT only owns financial quote semantics

workforce-finance
→ distribute to wallet/commission/payout/etc.; Workforce is a consumer/actor domain

captain-collateral
→ collateral if actor-independent financial capability

dispatch-financial-eligibility
→ financial eligibility or owning WLT capability; Dispatch is a DSH consumer
```

---

## 17. Contract and generated-client closure gate

For DSH and WLT independently prove:

```text
ONE_COMPOSITION_ROOT
ONE_MODULE_PER_SEMANTIC_CAPABILITY
ONE_COMMON_COMPONENT_OWNER
ZERO_PERMANENT_SCHEMA_PATCH_OVERLAYS_FOR_NORMAL_TRUTH
ZERO_MANUAL_DUPLICATE_OPERATION_REGISTRIES
ZERO_MANUAL_DTO_MIRRORS
ZERO_MANUAL_ENUM_MIRRORS
ZERO_STALE_GENERATED_OUTPUT
GENERATED_CLIENT_REGENERATES_DETERMINISTICALLY
ALL_REQUIRED_CONSUMERS_USE_CANONICAL_BINDING_OR_PROVEN_BOUNDARY_ADAPTER
BACKEND_ROUTE↔OPENAPI_OPERATION_PARITY=PASS
```

---

## 18. Database ownership and schema gate

For every material persisted fact record:

```text
FACT_NAME
SERVICE_OWNER
CAPABILITY_OWNER
CANONICAL_TABLE/COLUMNS
CANONICAL_WRITER
READBACK_PATH
CONSTRAINTS
INDEXES
IDEMPOTENCY/AUDIT REQUIREMENTS
SECURITY/PII CLASSIFICATION
FINANCIAL CLASSIFICATION
DERIVED PROJECTIONS
LOSING STORAGE AUTHORITIES
```

Reject:

```text
multiple mutable stores for same business meaning
second financial balance authority
second ledger writer
status mirror used as mutation authority
compatibility columns with no live requirement
stale tables kept only for old code
```

When destructive DB change is required:

```text
prove required data
→ design deterministic migration/backfill/reconciliation
→ execute
→ validate counts/invariants/readback
→ cut over writers/readers
→ delete obsolete schema authority
```

Do not weaken durable constraints merely to ease migration.

---

## 19. WLT heightened financial-safety gate

Before closing any financial refoundation unit prove all materially applicable claims:

```text
CANONICAL_MONEY_OWNER
CANONICAL_LEDGER_WRITER
BALANCED_DOUBLE_ENTRY
IDEMPOTENCY/EXACT_REPLAY
TRANSACTION_ATOMICITY
CONCURRENCY/LOCKING
OPERATOR_CONTEXT_ISOLATION
AUTHORIZED_PRINCIPAL_AUTHORITY
AUDITABILITY
PROVIDER_RESULT_PROVENANCE
UNKNOWN_PROVIDER_RESULT_HANDLING
REFUND/REVERSAL_EFFECT
SETTLEMENT/PAYOUT_SEPARATION
RECONCILIATION_PATH
CANONICAL_READBACK
NO_PARALLEL_FINANCIAL_WRITER
```

Structural cleanup is not allowed to discard valid financial safeguards or tests.

---

## 20. Runtime, config, jobs, and workers

Audit both services for:

```text
env variables
runtime config
ports/base URLs
feature flags
Docker/compose/deployment
startup/bootstrap
health/readiness
workers/jobs/outboxes/sagas
secret references
observability/retry/backoff
```

For each role require one canonical authority and remove stale aliases/config paths after cutover.

Entry points should be thin. Worker ownership must follow the process/domain that creates the durable work, with integration-specific delivery owned at the integration boundary where appropriate.

---

## 21. Package/workspace/export/config cleanup

After each topology cutover update and verify:

```text
package exports
workspace references
Nx project targets
TypeScript include/exclude/path mappings
Go imports/module paths
Docker build contexts
scripts/guards
test imports
CI path filters
Graphify/tooling paths
```

Old topology must not survive as configuration residue.

---

## 22. Test treatment law

Inherited tests are consumers/evidence, not automatic truth.

Classify every materially affected test/helper/fixture/mock/snapshot:

```text
VALID_CANONICAL_SPEC
OBSOLETE_BEHAVIOR
DUPLICATE_COVERAGE
WRONG_LAYER_SPEC
LOSING_TOPOLOGY_TEST
MISSING_PREVENTION
BROKEN_TEST_INFRA
```

Actions:

```text
VALID_CANONICAL_SPEC → preserve/refound
OBSOLETE_BEHAVIOR → delete
DUPLICATE_COVERAGE → merge/delete
WRONG_LAYER_SPEC → rewrite/rehome
LOSING_TOPOLOGY_TEST → delete with loser
MISSING_PREVENTION → add targeted proof
```

Particularly preserve or rebuild valid WLT invariants for ledger conservation, idempotency, isolation, reconciliation, financial replay, and irreversible effects.

---

## 23. Execution-unit template

Every destructive/refoundation unit must record and satisfy the following before closure:

```text
UNIT_ID
LIVE_HEAD_AT_START
CAPABILITY/ROOT
WHY_THIS_IS_THE_CURRENT_HIGHEST_EXECUTABLE_ROOT
CURRENT_STRUCTURAL_CENSUS
CURRENT_SEMANTIC_RESPONSIBILITIES
REQUIRED_TRUTH
CURRENT_OWNERS
PARALLEL/SHADOW_OWNERS
CANONICAL_WINNER
LOSERS
UNKNOWN_ITEMS
AFFECTED_CONE
TARGET_TOPOLOGY
DATA_MIGRATION_PLAN
CODE_MIGRATION_PLAN
CONTRACT_MIGRATION_PLAN
FRONTEND_MIGRATION_PLAN
RUNTIME/CONFIG_MIGRATION_PLAN
TEST_MIGRATION_PLAN
CUTOVER_ORDER
DELETION_ORDER
NEGATIVE_SPACE_QUERIES
STATIC_VERIFICATION
DB_VERIFICATION
RUNTIME_VERIFICATION
E2E_READBACK
RE_CENSUS_RESULT
CLOSURE_STATUS
```

Unknown material ownership blocks destructive closure of the affected cone until resolved.

---

## 24. Preferred campaign sequence

This sequence is a starting strategy, not a stale task queue. Re-rank after each significant cutover.

```text
R0  RECOVERY / EXACT LIVE-h STATE RECONSTRUCTION

R1  FULL DSH+WLT CAPABILITY / OWNERSHIP / CONTRACT / STORAGE CENSUS

R2  CONTRACT + GENERATED-LINEAGE REFOUNDATION
    - DSH composition/modules/manual mirrors
    - WLT composition/modules/overlays/manual mirrors

R3  SERVICE-ROOT METADATA CONTROL-PLANE CLEANUP
    - capability maps
    - surface maps
    - manifests
    - package exports
    - project/tsconfig islands

R4  DSH BACKEND TOPOLOGY REFOUNDATION
    - cmd/runtime
    - transport/http
    - integrations
    - semantic capabilities
    - saga/outbox absorption

R5  DSH FRONTEND CAPABILITY REFOUNDATION
    - preserve approved UI value
    - move feature ownership out of app/shared trees
    - generated contract consumption
    - delete losing app/shared feature containers

R6  WLT FINANCIAL AUTHORITY RECONSTRUCTION
    - ledger/wallet/payment/refund
    - settlement/commission/payout/reconciliation
    - COD/collateral/pricing/funding
    - reference shadow-truth elimination

R7  WLT TECHNICAL-CONTAINER REFOUNDATION
    - cmd/runtime
    - http
    - shared
    - dsh integration
    - provider integration

R8  DSH↔WLT CROSS-SERVICE CONTRACT + RUNTIME CUTOVER

R9  DB↔BACKEND↔CONTRACT↔GENERATED↔FRONTEND PARITY RE-CENSUS

R10 TEST/TOOL/CONFIG/EXPORT/CI RESIDUE CLEANUP

R11 ADVERSARIAL FULL DSH/WLT NEGATIVE-SPACE RE-CENSUS

R12 LEVEL-4 FIXED POINT + DELETE THIS PLAN
```

If live evidence proves a higher systemic root during execution, preempt this order and treat the higher root first.

---

## 25. Negative-space closure gate

For every closed unit and again globally at the end, prove zero known occurrences of materially relevant losing space:

```text
OLD_PATH_REFERENCES=0
LOSING_IMPORTS=0
LOSING_PACKAGE_EXPORTS=0
LOSING_ROUTE_REGISTRATIONS=0
LOSING_OPENAPI_MODULE_REFERENCES=0
LOSING_GENERATOR_INPUTS=0
MANUAL_DTO_MIRRORS=0
MANUAL_ENUM_MIRRORS=0
MANUAL_ALLOWED_ACTION_MIRRORS=0
DUPLICATE_API_CLIENTS=0
DUPLICATE_MUTABLE_WRITERS=0
SHADOW_FINANCIAL_AUTHORITIES=0
STALE_TSCONFIG_INCLUDES=0
STALE_NX_TARGETS=0
STALE_TEST_HELPERS/FIXTURES=0
STALE_RUNTIME_CONFIG=0
STALE_WORKERS/JOBS=0
STALE_WRAPPERS/ALIASES/REEXPORTS=0
KNOWN_EMPTY/DEAD_CONTROL_ARTIFACTS=0
```

Positive proof that the new path works is insufficient if the losing path still survives.

---

## 26. Per-capability closure gate

A capability may be marked `CLOSED` only when all applicable checks pass:

```text
PRODUCT_MEANING_PROVEN
CANONICAL_OWNER_PROVEN
CANONICAL_STORAGE_PROVEN
CANONICAL_WRITER_PROVEN
CANONICAL_BACKEND_PROVEN
CANONICAL_TRANSPORT_PROVEN
CANONICAL_CONTRACT_PROVEN
GENERATED_BINDING_PROVEN
REQUIRED_FRONTEND_CONSUMERS_PROVEN
SECURITY_PROVEN
FINANCIAL_INVARIANTS_PROVEN_WHEN_APPLICABLE
MIGRATION/CUTOVER_COMPLETE
LOSERS_DELETED
NEGATIVE_SPACE_PASS
STATIC/BUILD_PASS
DB_PASS
RUNTIME_PASS
MATERIAL_E2E_READBACK_PASS
FRESH_RE_CENSUS_PASS
```

---

## 27. DSH Stage-A exit gate

DSH structural baseline is not qualified until a fresh exact-head re-census proves at minimum:

```text
NO_KNOWN_APP_SHAPED_FEATURE_OWNERSHIP_WHERE_TOPIC_OWNER_REQUIRED
NO_KNOWN_GENERIC_SHARED_DOMAIN_DUMPING
NO_KNOWN_PARALLEL_CATALOG/ORDER/etc_FEATURE_TREES
NO_KNOWN_HTTP_MEGA_DOMAIN_AUTHORITY
NO_KNOWN_TOP_LEVEL_IMPLEMENTATION_MECHANISM_PSEUDO_DOMAINS
NO_KNOWN_MANUAL_CONTRACT_MIRRORS
NO_KNOWN_DUPLICATE_CAPABILITY/OPERATION_AUTHORITIES
NO_KNOWN_STALE_PACKAGE/TS/NX_TOPOLOGY
BACKEND↔CONTRACT↔FRONTEND_PARITY_PROVEN_FOR_MATERIAL_CAPABILITIES
```

---

## 28. WLT Stage-A exit gate

WLT structural/financial baseline is not qualified until a fresh exact-head re-census proves at minimum:

```text
NO_KNOWN_GENERIC_SHARED_CONTAINER
NO_KNOWN_HTTP_MEGA_DOMAIN_AUTHORITY
NO_KNOWN_DSHNOTIFY/DSHOUTBOX_PSEUDO_DOMAINS
NO_KNOWN_PAYMENT/SETTLEMENT/PAYOUT/RECONCILIATION_OWNERSHIP_AMBIGUITY
NO_KNOWN_FINANCIAL_REFERENCE_SHADOW_TRUTH
NO_KNOWN_ACTOR_OR_CONSUMER_SHAPED_FINANCIAL_CONTRACT_AUTHORITY
NO_KNOWN_PERMANENT_PAYMENT_SCHEMA_OVERLAYS
NO_KNOWN_DUPLICATE_SETTLEMENT/PAYOUT_CONTRACT_FRAGMENTATION
NO_KNOWN_MANUAL_FINANCIAL_DTO/ENUM/API_MIRRORS
NO_KNOWN_PARALLEL_LEDGER/BALANCE/FINANCIAL_WRITERS
FINANCIAL_INVARIANTS_AND_READBACK_PROVEN
```

---

## 29. Global DSH/WLT Level-4 fixed-point gate

The campaign is complete only when a **fresh final re-census on exact live `h`** proves:

```text
KNOWN_MATERIAL_DSH_WLT_FINDINGS=0
KNOWN_MATERIAL_PARALLEL_TRUTH=0
KNOWN_MATERIAL_SHADOW_TRUTH=0
KNOWN_MATERIAL_LOSING_CONTAINERS=0
KNOWN_MATERIAL_LEGACY_RESIDUE=0
KNOWN_MATERIAL_WRAPPERS/ALIASES=0
KNOWN_MATERIAL_DUPLICATE_CONTRACT_AUTHORITIES=0
KNOWN_MATERIAL_DUPLICATE_GENERATED/MANUAL_TYPES=0
KNOWN_MATERIAL_DUPLICATE_WRITERS=0
KNOWN_MATERIAL_RUNTIME_CONFIG_DRIFT=0
KNOWN_MATERIAL_STALE_TESTS/TOOLS/EXPORTS=0
KNOWN_MATERIAL_BACKEND↔CONTRACT↔FRONTEND_MISMATCH=0
KNOWN_MATERIAL_UNVERIFIED_FINANCIAL_INVARIANTS=0
```

Then run the final material verification suite for affected boundaries and prove no outstanding DSH/WLT unit remains open.

---

## 30. Mandatory self-deletion gate for this plan

After Section 29 passes, this file becomes residue and **must be deleted**.

Before deleting it prove:

```text
NO_SCRIPT_READS_THIS_FILE
NO_CI_WORKFLOW_READS_THIS_FILE
NO_BUILD_TARGET_READS_THIS_FILE
NO_RUNTIME_READS_THIS_FILE
NO_GENERATOR_READS_THIS_FILE
NO_TEST_REQUIRES_THIS_FILE
NO_GOVERNANCE/PROMPT_ROUTING_REQUIRES_THIS_FILE
NO_OPEN_EXECUTION_UNIT_DEPENDS_ON_THIS_FILE
```

Then:

```text
DELETE tools/DSH-WLT-CANONICAL-REFOUNDATION-EXECUTION-PLAN.md
→ RE_PIN_LIVE_h
→ VERIFY_PATH_ABSENT
→ VERIFY_NO_REFERENCES_TO_PATH
→ FINAL_FIXED_POINT_CONFIRMATION
```

The final canonical repository must not retain this campaign plan.
