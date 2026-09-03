# BThwani Open-Source Reference Corpus and Adoption Policy

**Status:** Non-authoritative reference input
**Target repository:** `bthwani2-boop/bthwani-suite-next`
**Target placement:** `tools/prompting/BTHWANI-OSS-REFERENCE-CORPUS.md`
**Execution authority:** NONE
**Closure authority:** NONE
**Progress ledger:** FORBIDDEN
**Current-state authority:** FORBIDDEN

> This file is a curated external reference corpus and adoption policy. It must never become a second orchestrator, a second architecture authority, a campaign-state ledger, or a substitute for fresh evidence from live `h`.

The sole execution and closure constitution remains:

```text
tools/prompting/bthwani-orchestrator/00-ORCHESTRATOR.md
```

and the semantic owners/focus modules it requires.

If this file conflicts with the current orchestrator, refoundation target package, live code, or freshly verified repository evidence, the stronger/current authority wins.

---

## 1. Purpose

BThwani may use mature open-source projects to accelerate refoundation without replacing the project, changing its product identity, or forcing a new primary technology stack.

The main value of external projects is not “download and install the whole platform”.

The main value is:

```text
DISCOVER_MISSING_LOGIC
DISCOVER_MISSING_EDGE_CASES
DISCOVER_MISSING_STATE_MACHINES
DISCOVER_MISSING_SECURITY_RULES
DISCOVER_MISSING_FINANCIAL_INVARIANTS
DISCOVER_MISSING_FAILURE/RETRY/RECONCILIATION_BEHAVIOR
DISCOVER_MISSING_TEST_SCENARIOS
DISCOVER_BETTER_GENERIC_TECHNICAL_COMPONENTS
```

Then BThwani must implement the required truth inside its canonical owners using BThwani’s existing languages, bounded contexts, contracts, and deployment identities unless a small external component independently passes the adoption gate in this document.

---

## 2. Non-negotiable stack preservation

External-source research does **not** authorize a platform rewrite.

The default canonical technology direction remains:

```text
BACKEND
→ Go

DATABASE
→ PostgreSQL / PostGIS

MOBILE
→ TypeScript
→ React Native
→ Expo

CONTROL PANEL
→ TypeScript
→ React
→ Next.js

PRIMARY BUSINESS BOUNDED CONTEXTS
→ DSH
→ WLT
→ Identity
→ Workforce
→ other independently proven services only
```

Therefore, the following are forbidden by default:

```text
REPLACE_GO_BACKEND_WITH_NODE_PLATFORM
REPLACE_GO_BACKEND_WITH_PYTHON_PLATFORM
REPLACE_GO_BACKEND_WITH_RUBY_PLATFORM
REPLACE_POSTGRESQL_WITH_AN_UNRELATED_DATABASE
REPLACE_EXPO_APPS_WITH_AN_EXTERNAL_MARKETPLACE_FRONTEND
REPLACE_DSH/WLT_WITH_A_MONOLITHIC_EXTERNAL_PLATFORM
ADOPT_A_WHOLE_PLATFORM_ONLY_BECAUSE_IT_IS_OPEN_SOURCE
```

A technology change is allowed only when the normal orchestrator/root-cause process independently proves that the current technology itself is the root defect and that migration is safer and materially better than refounding inside the existing stack.

---

## 3. Canonical usage model

Every external project must be classified into exactly one of these modes:

### 3.1 REFERENCE_ONLY

Read architecture, state machines, APIs, tests, failure handling, product flows, database models, and invariants.

Do not copy or import code.

Use this mode by default for:

```text
whole marketplace platforms
whole logistics platforms
whole ERP/banking platforms
copyleft projects
projects in a materially different stack
projects with mixed/open-core licensing
```

### 3.2 SELECTIVE_LOGIC_REFERENCE

Extract a specific behavioral invariant or workflow, then implement it natively inside BThwani.

Example:

```text
EXTERNAL PROJECT
→ refund state machine is stronger than ours
→ identify invariant
→ map invariant to WLT owner
→ implement in Go/PostgreSQL/contracts/tests
→ no external platform dependency introduced
```

### 3.3 SMALL_COMPONENT_CANDIDATE

A focused library/tool may be adopted when it removes substantial custom plumbing and passes all gates.

Examples:

```text
Testcontainers-Go
sqlc
pgx
oapi-codegen
Watermill
OpenTelemetry-Go
```

None is automatically required.

### 3.4 COMPONENT/SERVICE_ADOPTION

A self-contained external engine may be integrated behind a semantic BThwani port only when it owns no BThwani business truth and can be replaced without rewriting the domain.

Examples that may be evaluated in the future:

```text
routing engine
GPS/telemetry engine
object-storage implementation
search engine
observability backend
```

The domain must depend on a semantic port, never directly on the vendor/project.

### 3.5 WHOLE_PLATFORM_REPLACEMENT

Forbidden by default.

This mode requires explicit proof that:

```text
CURRENT_BTHWANI_BOUNDARY_IS_A_PROVEN_LOSER
REPLACEMENT_MATCHES_REQUIRED_TRUTH
STACK_MIGRATION_COST_IS_ACCEPTABLE
ALL_FIVE_SURFACES_CAN_CUT_OVER
DSH/WLT/IDENTITY/WORKFORCE_BOUNDARIES_REMAIN_CORRECT
DATA_MIGRATION_IS_PROVEN
LICENSE_IS_ACCEPTABLE
LOCK_IN_IS_ACCEPTABLE
LEVEL_4_CLOSURE_GETS_FASTER_NOT_SLOWER
```

Absence of this proof means: do not replace.

---

## 4. Mandatory extraction workflow

Whenever a BThwani root touches an area covered by mature external systems:

```text
PIN_LIVE_h
→ IDENTIFY_CURRENT_BTHWANI_OWNER
→ IDENTIFY_REQUIRED_PRODUCT_TRUTH
→ SELECT_RELEVANT_EXTERNAL_REFERENCES
→ EXTRACT_BEHAVIORAL_INVARIANTS
→ EXTRACT_EDGE_CASES
→ EXTRACT_FAILURE_MODES
→ EXTRACT_SECURITY/FINANCIAL_RULES
→ EXTRACT_TEST_ORACLE_SCENARIOS
→ COMPARE_WITH_BTHWANI
→ CLASSIFY_EACH_FINDING
→ IMPLEMENT_ONLY_PROVEN_GAPS
→ VERIFY_WITH_BTHWANI_CONTRACTS/DATA/RUNTIME
→ PROVE_NO_NEW_SHADOW_AUTHORITY
```

Each finding must terminate in one of:

```text
PRESENT_AND_CANONICAL
PRESENT_BUT_DEFECTIVE
PRESENT_BUT_IN_WRONG_OWNER
MISSING_AND_REQUIRED
NOT_APPLICABLE
REFERENCE_COMPONENT_CANDIDATE
REJECTED
```

“Interesting” is not a terminal state.

---

## 5. What to extract from external projects

### Product/business logic

Look for:

```text
actors
roles
permissions
state machines
allowed actions
order lifecycle
seller lifecycle
captain lifecycle
dispatch lifecycle
checkout lifecycle
payment lifecycle
refund lifecycle
commission lifecycle
settlement lifecycle
payout lifecycle
reconciliation lifecycle
inventory effects
serviceability rules
cancellation rules
timeout behavior
failure recovery
idempotency
concurrency rules
```

### API/contracts

Look for:

```text
resource boundaries
operation semantics
request/response ownership
error models
idempotency keys
webhook semantics
pagination
filtering
authorization metadata
versioning
event schemas
```

Do not mirror an external API merely because it exists.

### Database/data integrity

Look for:

```text
canonical writer
uniqueness constraints
foreign-key semantics
transaction boundaries
ledger/posting rules
optimistic/pessimistic locking
outbox boundaries
reconciliation evidence
audit/provenance
derived projection rules
```

### UX/journeys

Look for:

```text
missing screens
missing journey states
recovery paths
empty states
error states
offline states
operator workflows
partner onboarding
captain workflow
refund/dispute visibility
financial status explainability
```

UX reference does not transfer business authority to the app.

### Testing

Look for:

```text
integration scenarios
race-condition tests
retry tests
replay tests
financial balance tests
double-submit tests
timeout/unknown-result tests
webhook replay tests
migration tests
real-database tests
cross-service contract tests
```

---

## 6. Primary reference corpus

Licenses and project terms can change. **Fresh verification of the exact repository/component license is mandatory immediately before direct code reuse or dependency adoption.**

### 6.1 Marketplace / Partner / Commerce

#### Mercur
Repository: https://github.com/mercurjs/mercur
Current observed license class: MIT
Primary mode: `SELECTIVE_LOGIC_REFERENCE`

Use to challenge BThwani for:

```text
seller/vendor onboarding
seller teams/membership
vendor catalog ownership
offers
multi-vendor order behavior
commission calculation
payout eligibility
refund allocation
seller/admin boundaries
marketplace operational workflows
```

High-value candidate invariants:

```text
SELLER_SCOPING
PARTNER_MEMBERSHIP
CATALOG_MUTATION_AUTHORITY
ORDER_SPLITTING
COMMISSION_CALCULATION
SETTLEMENT_ELIGIBILITY
PAYOUT_LIFECYCLE
REFUND_ALLOCATION
```

Do not replace the Go DSH backend with Mercur.

#### Medusa
Repository: https://github.com/medusajs/medusa
Primary mode: `REFERENCE_ONLY / SELECTIVE_LOGIC_REFERENCE`

Use for:

```text
commerce lifecycle
cart/checkout/order modeling
inventory
fulfillment
payment orchestration boundaries
promotions
returns/refunds
```

Do not adopt a whole Node/TypeScript commerce backend as a shortcut around BThwani refoundation.

#### Saleor
Repository: https://github.com/saleor/saleor
Primary mode: `REFERENCE_ONLY`

Use for:

```text
checkout semantics
order state
inventory
payment behavior
GraphQL contract ideas
permissions
operator workflows
```

Its Python/GraphQL stack is not a reason to change BThwani’s Go direction.

#### Spree
Repository: https://github.com/spree/spree
Primary mode: `REFERENCE_ONLY`

Use for mature commerce and admin workflow comparisons.

#### Vendure
Repository: https://github.com/vendure-ecommerce/vendure
Primary mode: `REFERENCE_ONLY`

Treat direct code reuse conservatively because license/commercial terms must be freshly verified for the exact version/component before use.

---

## 7. Logistics / Captain / Dispatch corpus

### Traccar
Repository: https://github.com/traccar/traccar
Current observed license class: Apache-2.0
Primary mode: `SELECTIVE_LOGIC_REFERENCE / COMPONENT_CANDIDATE`

Use to challenge Captain/dispatch/telemetry logic for:

```text
position timestamp
position accuracy
heading
speed
last-known-position
position freshness
stale-position classification
geofence entry/exit
offline behavior
reconnect behavior
device/session identity
telemetry provenance
```

BThwani must still own delivery/dispatch business truth.

### Fleetbase
Repository: https://github.com/fleetbase/fleetbase
Primary mode: `REFERENCE_ONLY`

Use for:

```text
fleet/dispatch concepts
driver/captain operations
order/route execution
fleet management
operator workflows
```

Do not import a whole logistics platform into DSH by default. Freshly verify the exact license of every component before any code reuse.

### Valhalla
Repository: https://github.com/valhalla/valhalla
Primary mode: `REFERENCE_ONLY / FUTURE_COMPONENT_CANDIDATE`

Use for routing-engine concepts if self-hosted routing ever becomes a proven requirement.

Google Maps already being used in development is not itself a reason to add another routing engine.

### VROOM
Repository: https://github.com/VROOM-Project/vroom
Primary mode: `REFERENCE_ONLY / FUTURE_COMPONENT_CANDIDATE`

Use for vehicle-route optimization concepts only when a proven route-optimization root exists.

---

## 8. WLT / financial corpus

Financial references are primarily **invariant oracles**, not automatic runtime replacements.

### Formance Ledger
Repository: https://github.com/formancehq/ledger
Primary mode: `SELECTIVE_LOGIC_REFERENCE`

Use to challenge:

```text
ledger account modeling
multi-posting transactions
atomic posting
financial transaction semantics
query/readback
idempotency
```

### Blnk
Repository: https://github.com/blnkfinance/blnk
Primary mode: `SELECTIVE_LOGIC_REFERENCE`

Use to challenge:

```text
transaction lineage
inflight transactions
refunds
bulk operations
queue/recovery behavior
reconciliation
```

### TigerBeetle
Repository: https://github.com/tigerbeetle/tigerbeetle
Primary mode: `REFERENCE_ONLY / INVARIANT_ORACLE`

Use to challenge:

```text
idempotent transfer identity
pending/post/void semantics
timeouts
replay behavior
balance correctness
concurrency
financial history
```

Do not replace PostgreSQL/WLT merely because TigerBeetle has stronger financial primitives.

### Cala
Repository: https://github.com/GaloyMoney/cala
Primary mode: `REFERENCE_ONLY`

Use for double-entry/ledger modeling comparisons if the repository remains applicable after fresh verification.

### Apache Fineract
Repository: https://github.com/apache/fineract
Primary mode: `REFERENCE_ONLY`

Use for mature financial/loan/account lifecycle concepts only. It is too broad to become the BThwani core by default.

### ERPNext
Repository: https://github.com/frappe/erpnext
Primary mode: `REFERENCE_ONLY`

Use for accounting/operations edge-case research only where relevant. It must not become a general replacement platform.

---

## 9. Go/PostgreSQL engineering candidates

These candidates are not part of the stack merely because they are good projects.

### Testcontainers-Go
Repository: https://github.com/testcontainers/testcontainers-go
Typical license class: MIT
Primary mode: `SMALL_COMPONENT_CANDIDATE`

High-value use:

```text
REAL_POSTGRESQL
→ RUN_MIGRATIONS
→ START_SERVICE
→ WRITE
→ READ_BACK
→ ASSERT_EVENT/FINANCIAL_EFFECT
→ DESTROY_ENVIRONMENT
```

Strong candidate when real-database integration verification is required.

### sqlc
Repository: https://github.com/sqlc-dev/sqlc
Typical license class: MIT
Primary mode: `SMALL_COMPONENT_CANDIDATE`

Use only if the current data-access/root refoundation proves that generated type-safe SQL access removes material hand-written duplication or drift.

Do not introduce it as cosmetic modernization.

### pgx
Repository: https://github.com/jackc/pgx
Typical license class: MIT
Primary mode: `SMALL_COMPONENT_CANDIDATE`

BThwani currently uses PostgreSQL and existing Go database access must not be migrated to pgx as an unrelated side project.

Adopt only if the DB access layer is already the proven root and the migration removes a material defect.

### oapi-codegen
Repository: https://github.com/oapi-codegen/oapi-codegen
Typical license class: Apache-2.0
Primary mode: `SMALL_COMPONENT_CANDIDATE`

Strong candidate if it helps achieve:

```text
ONE_CANONICAL_OPENAPI_SOURCE
→ ONE_REPRODUCIBLE_COMPOSER
→ ONE_GENERATOR_LINEAGE
→ NO_MANUAL_DTO/ENUM/OPERATION_MIRRORS
```

Do not introduce a second generator alongside another surviving generator lineage.

### Watermill
Repository: https://github.com/ThreeDotsLabs/watermill
Typical license class: MIT
Primary mode: `SMALL_COMPONENT_CANDIDATE`

Use only if event/outbox/messaging refoundation proves a genuine need.

Do not add an event framework merely for architectural sophistication.

### River
Repository: https://github.com/riverqueue/river
Typical license class: MPL-2.0
Primary mode: `REFERENCE_ONLY / CONDITIONAL_COMPONENT_CANDIDATE`

Free does not mean zero licensing consideration. Prefer simpler licensing when two technically adequate choices exist.

### OpenTelemetry-Go
Repository: https://github.com/open-telemetry/opentelemetry-go
Primary mode: `SMALL_COMPONENT_CANDIDATE`

Use for observability only when the runtime/observability root requires it. Observability must not become business authority.

### Casbin
Repository: https://github.com/casbin/casbin
Primary mode: `REFERENCE_ONLY / CONDITIONAL_COMPONENT_CANDIDATE`

Use only if authorization architecture proves a need. Identity/security remains canonical authority for BThwani permission semantics.

---

## 10. Adoption gate for any external dependency

No dependency may be added until all applicable questions are answered:

```text
1. WHAT_PROVEN_ROOT_REQUIRES_THIS?
2. WHAT_BTHWANI_TRUTH_DOES_IT_OWN?
3. SHOULD_IT_OWN_THAT_TRUTH?
4. DOES_IT_REPLACE_A_PROVEN_LOSER?
5. DOES_IT_REMOVE_SUBSTANTIAL_CUSTOM_PLUMBING?
6. CAN_THE_DOMAIN_DEPEND_ON_A_SEMANTIC_PORT_INSTEAD?
7. IS_THE_LICENSE_ACCEPTABLE_FOR_THE_EXACT_VERSION/COMPONENT?
8. IS_IT_FREE_TO_USE_IN_THE_REQUIRED_MODE?
9. CAN_LEVEL_4_BE_REPRODUCED_WITHOUT_A_PAID_SAAS_DEPENDENCY?
10. DOES_IT_PRESERVE_GO/POSTGRES/EXPO/NEXT_DIRECTION?
11. DOES_IT_CREATE_A_SECOND_SOURCE_OF_TRUTH?
12. DOES_IT_CREATE_A_SECOND_GENERATOR/REGISTRY/WRITER?
13. DOES_IT_ADD_RUNTIME/OPERATIONS_COMPLEXITY?
14. IS_MAINTENANCE_ACTIVE_ENOUGH?
15. CAN_IT_BE_REMOVED/REPLACED_WITHOUT_REWRITING_BUSINESS_LOGIC?
16. DOES_IT_MAKE_THE_CURRENT_ROOT_FASTER_TO_CLOSE?
```

Adoption is allowed only when the answer set proves a net reduction in canonical complexity.

---

## 11. Zero-cost rule

BThwani refoundation must not require buying source code or a commercial source license merely to achieve canonical closure.

Default preference order:

```text
1. EXISTING_BTHWANI_CODE_IF_CANONICAL
2. NATIVE_REFOUNDATION_IN_EXISTING_STACK
3. PERMISSIVE_FREE_OSS_COMPONENT
4. LOCAL_SIMULATOR / SELF_HOSTED_FREE_TOOL
5. FREE_EXTERNAL_SANDBOX WHEN USEFUL
6. COMPLEX_COPYLEFT_REFERENCE_ONLY
7. PAID_SOURCE_OR_REQUIRED_PAID_SAAS = NOT_A_DEFAULT_CLOSURE_DEPENDENCY
```

Free-tier availability is operational convenience, not architectural truth.

---

## 12. License handling

Before direct code reuse or dependency adoption:

```text
FETCH_CURRENT_LICENSE
→ VERIFY_EXACT_REPOSITORY
→ VERIFY_EXACT_COMPONENT
→ VERIFY_EXACT_VERSION/TAG
→ CHECK_NOTICE/ATTRIBUTION_REQUIREMENTS
→ CHECK_COPYLEFT/SOURCE_DISTRIBUTION_IMPLICATIONS
→ RECORD_DECISION_IN_NORMAL_DEPENDENCY_REVIEW_EVIDENCE
```

Default engineering policy:

```text
MIT / BSD / Apache-2.0
→ easiest direct-candidate class, still verify

MPL
→ conditional; inspect file-level obligations

GPL / AGPL / strong copyleft
→ reference-only by default unless explicitly approved after license review

mixed / open-core / commercial add-ons
→ reference-only by default; verify component boundaries before use

unknown / no license
→ no code reuse
```

This is an engineering risk policy, not legal advice.

---

## 13. Provider and SaaS rule

External providers must remain adapters behind semantic ports.

Examples:

```text
DSH
→ Geocoder
→ RoutePlanner

WLT
→ PaymentGateway
→ PayoutRail

Identity / Notification owner
→ SmsSender
→ EmailSender
→ PushSender

Media owner
→ ObjectStorage
```

Forbidden:

```text
GenericProvider.execute(...)
ProviderManager as a business god service
Vendor-specific domain models
Vendor-specific business truth
Provider credentials as general business records
Blind financial fallback
```

Development may use real sandboxes/free tiers where practical, but Level-4 closure must have a reproducible path that does not depend on buying access to a SaaS provider.

---

## 14. Mapping external knowledge to BThwani owners

```text
MARKETPLACE / SELLER / STORE / CATALOG / ORDER
→ DSH semantic capability owner

CHECKOUT ORCHESTRATION
→ DSH Checkout

PAYMENT / LEDGER / REFUND / COMMISSION / SETTLEMENT / PAYOUT / RECONCILIATION
→ WLT

AUTHENTICATION / SESSION / ACTOR / SECURITY-SENSITIVE AUTHORIZATION
→ Identity

PERSON / ENGAGEMENT / EMPLOYEE / OPERATIONAL WORKFORCE STATE
→ Workforce

ROUTE / APP SHELL / NAVIGATION / DEEP LINKS / NATIVE INTEGRATION
→ apps/*

DESIGN PRIMITIVES
→ proven design-system package

EXTERNAL REQUEST EXECUTION
→ adapter under the domain/service that understands the operation

CROSS-SERVICE WIRE LAW
→ sovereign service contract / proven root protocol owner
```

External project directory names must never determine BThwani ownership.

---

## 15. Required financial comparison checklist

Whenever WLT/payment/checkout-finance is touched, compare against mature financial references for:

```text
CANONICAL_FINANCIAL_OWNER
CANONICAL_LEDGER_WRITER
BALANCED_POSTING_WHERE_APPLICABLE
EXACT_IDEMPOTENCY
REPLAY_BEHAVIOR
TRANSACTION_ATOMICITY
CONCURRENCY/LOCKING
PENDING_STATE
UNKNOWN_PROVIDER_RESULT
REFUND
REVERSAL
SETTLEMENT
PAYOUT
RECONCILIATION
PROVIDER_PROVENANCE
AUDIT
CANONICAL_READBACK
ZERO_PARALLEL_WRITERS
```

External references may reveal missing rules, but BThwani’s WLT remains the owner.

---

## 16. Required Captain/dispatch comparison checklist

Whenever Captain/dispatch/location is touched, compare against mature logistics/telemetry references for:

```text
CAPTAIN_IDENTITY
ASSIGNMENT
ACCEPT/REJECT
ARRIVAL
PICKUP
DELIVERY
CANCELLATION
LOCATION_TIMESTAMP
LOCATION_ACCURACY
LOCATION_FRESHNESS
STALE_LOCATION
OFFLINE
RECONNECT
GEOFENCE
ROUTE_DEVIATION_WHERE_APPLICABLE
DUPLICATE_LOCATION_EVENT
OUT_OF_ORDER_LOCATION_EVENT
BATTERY/OS_BACKGROUND_LIMITATIONS_WHERE_MATERIAL
OPERATOR_OVERRIDE
AUDIT/PROVENANCE
```

Do not turn Traccar/Fleetbase into the DSH business owner.

---

## 17. Required Partner/marketplace comparison checklist

Whenever Partner/store/catalog/commission/payout is touched, compare against mature marketplace references for:

```text
PARTNER_ONBOARDING
PARTNER_MEMBERSHIP
STORE_OWNERSHIP
CATALOG_MUTATION_AUTHORITY
APPROVAL
AVAILABILITY
ORDER_PARTITIONING
FULFILLMENT_RESPONSIBILITY
COMMISSION_CALCULATION
REFUND_ALLOCATION
SETTLEMENT_ELIGIBILITY
PAYOUT_DESTINATION
PAYOUT_FAILURE
SUSPENSION
AUDIT
CONTROL_PANEL_OPERATOR_ACTIONS
```

---

## 18. Testing/reference oracle law

External projects are valuable as adversarial test oracles.

A missing external scenario should become a BThwani test only when the scenario is materially applicable to BThwani.

High-value test families:

```text
DOUBLE_SUBMIT
DUPLICATE_WEBHOOK
OUT_OF_ORDER_WEBHOOK
TIMEOUT_WITH_UNKNOWN_REMOTE_RESULT
RETRY_AFTER_UNKNOWN
CONCURRENT_BALANCE_MUTATION
REFUND_AFTER_PARTIAL_FULFILLMENT
REVERSAL_AFTER_FAILURE
SETTLEMENT_VS_PAYOUT_SEPARATION
CAPTAIN_OFFLINE/RECONNECT
STALE_GPS
PARTNER_SUSPENDED_DURING_ACTIVE_ORDER
CATALOG_MUTATION_WITHOUT_AUTHORITY
MIGRATION_FROM_OLD_SCHEMA
REAL_POSTGRES_READBACK
CONTRACT_GENERATION_REPRODUCIBILITY
```

---

## 19. AI-agent usage

Multiple AI agents may inspect external projects in parallel only as read-only evidence collectors/reviewers when allowed by the current orchestrator.

Recommended pattern:

```text
Gemini
→ product surfaces / Expo / UX / journey comparison

Claude
→ architecture / finance / security / data falsification

Codex
→ sole mutation authority when selected by the active execution session
```

Never allow external-reference research to create:

```text
THREE_COMPETING_ARCHITECTURES
THREE_NAMING_SYSTEMS
THREE_PARTIAL_CUTOVERS
THREE_MUTATORS_ON_h
```

The current orchestrator remains supreme.

---

## 20. Explicit prohibitions

```text
DO_NOT_COPY_AN_EXTERNAL_ARCHITECTURE_WHOLESALE
DO_NOT_CHANGE_LANGUAGE_TO_MATCH_A_REFERENCE_PROJECT
DO_NOT_CHANGE_DATABASE_TO_MATCH_A_REFERENCE_PROJECT
DO_NOT_CREATE_A_GENERIC_PROVIDERS_SERVICE
DO_NOT_CREATE_A_GENERIC_SHARED_DUMP
DO_NOT_ADD_A_BROKER_WITHOUT_A_PROVEN_ROOT
DO_NOT_ADD_SQLC/PGX/TESTCONTAINERS/OAPI_CODEGEN_ONLY_FOR_MODERNIZATION
DO_NOT_ADD_TWO_TOOLS_FOR_THE_SAME_GENERATION/AUTHORITY_ROLE
DO_NOT_IMPORT_COPYLEFT_CODE_WITHOUT_REVIEW
DO_NOT_ASSUME_GITHUB_PUBLIC == PERMISSIVE_LICENSE
DO_NOT_ASSUME_FREE_TIER == DURABLE_FREE_ARCHITECTURE
DO_NOT_MAKE_EXTERNAL_PROJECTS_CANONICAL_BTHWANI_AUTHORITIES
DO_NOT_PRESERVE_A_LOSER_JUST_TO_MATCH_AN_EXTERNAL_PATTERN
DO_NOT_TURN_THIS_FILE_INTO_A_PROGRESS_LEDGER
DO_NOT_PIN_LIVE_h_STATE_IN_THIS_FILE
```

---

## 21. Decision rule

For every external idea/component:

```text
IF BTHWANI_ALREADY_HAS_CORRECT_CANONICAL_TRUTH
→ KEEP BTHWANI

IF BTHWANI_HAS_REQUIRED_TRUTH_BUT_IMPLEMENTATION_IS_DEFECTIVE
→ REFOUND_BTHWANI

IF REQUIRED_LOGIC_IS_MISSING
→ IMPLEMENT_IT_IN_THE_CANONICAL_BTHWANI_OWNER

IF A_SMALL_FREE_COMPONENT_REMOVES_MATERIAL_GENERIC_PLUMBING
AND LICENSE/MAINTENANCE/OPERATIONS/OWNERSHIP_GATES_PASS
→ ADOPT_BEHIND_THE_CORRECT_BOUNDARY

IF A_WHOLE_EXTERNAL_PLATFORM_REQUIRES_STACK/DOMAIN_REPLACEMENT
→ REFERENCE_ONLY BY DEFAULT
```

---

## 22. Final principle

```text
OPEN_SOURCE_IS_AN_ACCELERATOR_AND_ADVERSARIAL_REFERENCE
NOT_THE_NEW_BTHWANI_ARCHITECTURE
```

BThwani keeps its product truth, languages, bounded contexts, deployment identities, and canonical ownership.

External projects are used to:

```text
FIND_WHAT_WE_MISSED
PROVE_WHAT_WE_IMPLEMENTED_WEAKLY
BORROW_MATURE_INVARIANTS
BORROW_EDGE_CASES
BORROW_TEST_IDEAS
ADOPT_SMALL_GENERIC_COMPONENTS_WHEN_PROVEN
```

The objective is faster and more complete Level-4 refoundation with **less** custom accidental complexity, not replacement of BThwani with someone else’s platform.
