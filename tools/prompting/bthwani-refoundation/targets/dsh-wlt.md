# Target — DSH and WLT

## 1. DSH ownership

DSH owns operational commerce/delivery truth when proven, including:

```text
catalog
store
assortment/inventory operational semantics
cart
checkout orchestration
order
pickup
delivery
dispatch
serviceability
address
support
marketing/promotion operational semantics
rating
special-request operational semantics
client/partner/captain/field operational journeys
```

Authentication/session, financial truth, generic provider management, notification delivery, and generic search are not automatically DSH responsibilities because DSH screens consume them.

## 2. WLT ownership

WLT is an independent shared financial bounded context and must remain reusable by DSH plus future services/apps.

WLT owns, when proven:

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
financial-provider/rail transaction state
```

WLT must not be a DSH submodule.

## 3. WLT frontend

Reusable WLT-owned UI/controller/view-model/data-access belongs under:

```text
services/wlt/frontend/<financial-capability>
```

Examples:

```text
wallet
payment
refund
settlement
commission
payout
reconciliation
collateral
```

WLT frontend consumes WLT contracts/generated bindings and remains host-neutral. It must not import DSH app routes, DSH private implementation, or a specific app host.

DSH Checkout may compose WLT Payment without becoming payment authority:

```text
DSH owns checkout orchestration
WLT owns payment state/rules/financial effects
APP owns route composition
```

## 4. DSH frontend refoundation

App-shaped DSH feature trees and `frontend/shared` are losing umbrellas after value extraction.

Actor-specific presentation is allowed under a real capability only where material differences exist:

```text
order/
  presentation/client
  presentation/partner
  presentation/captain
  presentation/control-panel
```

Do not duplicate one working presentation merely to mirror actor names.

`services/dsh/frontend/wlt-boundary` must not remain a WLT feature tree inside DSH. Move WLT-owned wallet/payment/refund/settlement/commission/payout/etc. value to WLT; retain only genuinely DSH-specific translation/orchestration under an explicit DSH integration boundary.

## 5. Capability naming

Prefer stable semantic nouns.

DSH examples:

```text
catalog store cart checkout order delivery dispatch pickup serviceability address support marketing promotion rating special-request
```

WLT examples:

```text
wallet ledger payment refund settlement commission payout reconciliation pricing collateral cod promotion-funding
```

Names presumed noncanonical absent independent proof:

```text
home-discovery
account
finance
truth
governance
boundary
shared
common
central
client-*
partner-*
captain-*
field-*
```

Mechanisms such as saga/outbox/worker/cache/retry/provider/handler/controller are not top-level business domains.

## 6. Backend topology

Conceptual target:

```text
backend/
├── cmd/
└── internal/
    ├── runtime/
    ├── transport/http/
    ├── integrations/
    └── <semantic-capabilities>/
```

`cmd/*/main.go` owns process startup only. HTTP transport decodes/extracts trusted context/calls capability/encodes; it must not own SQL, state machines, permission truth, or financial policy.

Avoid mechanical enterprise layers (`domain/application/usecase/repository/helpers/utils/common`) when cohesive Go packages suffice.

DSH high-priority structural candidates to resolve from live evidence:

```text
centralcatalog + catalogapproval           → catalog
checkoutpaymentsaga/checkoutfinanceoutbox  → checkout or WLT integration mechanism
internal/http                              → transport/http
workforceclient/platformclient/mapproviders/WLT client → integrations/*
large multi-responsibility main.go         → thin cmd + runtime composition
```

WLT technical containers to challenge:

```text
http                   → transport/http
health                 → runtime/health
dshnotify + dshoutbox  → integrations/dsh
provider               → integrations/payment-rails or precise financial integration owner
shared                 → decompose/delete
```

## 7. WLT semantic boundaries

```text
SETTLEMENT     = what is owed and settlement lifecycle
PAYOUT         = actual disbursement/destination/provider execution
RECONCILIATION = proof/matching internal vs external financial truth
COD            = reservation/collection/finalization financial flow
COMMISSION     = commission policy/lifecycle/posting/query when independently justified
```

Do not collapse these merely to reduce directories.

## 8. Contracts and generation

Each service has one canonical composition root:

```text
services/dsh/contracts/dsh.openapi.yaml
services/wlt/contracts/wlt.openapi.yaml
```

Each semantic capability has one canonical contract owner. Physical files may split for cohesion, but must not become parallel authorities.

```text
CANONICAL_OPENAPI_SOURCE
→ ONE_REPRODUCIBLE_COMPOSER
→ ONE_REPRODUCIBLE_GENERATOR_LINEAGE
→ JUSTIFIED_GENERATED_OUTPUTS
```

No manually synchronized module/operation/DTO/enum/status/action registries.

WLT contract consolidation must resolve inherited overlays/actor-shaped files into real financial owners such as payment, settlement, commission, payout, pricing, collateral, and financial eligibility.

Mixed runtime/evidence files such as operation-state style artifacts must re-earn a unique live responsibility; durable metadata belongs with canonical sources and proof belongs in tests/evidence.

All refs resolve; duplicate operationIds/routes/conflicting schemas fail closed.

## 9. Database law

For every persisted fact prove:

```text
FACT
SERVICE_OWNER
CAPABILITY_OWNER
CANONICAL_TABLE/COLUMNS
CANONICAL_WRITER
READBACK_PATH
CONSTRAINTS/INDEXES
IDEMPOTENCY/AUDIT
SECURITY/PII_CLASSIFICATION
FINANCIAL_CLASSIFICATION
DERIVED_PROJECTIONS
LOSING_STORAGE_AUTHORITIES
```

One truth does not mean one table. Multiple mutable authorities for the same meaning are forbidden.

Destructive schema change requires deterministic transform/backfill, roll-forward/cutover plan, reconciliation, reader/writer cutover, obsolete-schema deletion, and readback proof.

## 10. Financial shadow-truth and security gate

Treat financial references, duplicated balances, status refs, mutable copies, and projections as high-risk.

Allowed outcomes:

```text
REDUNDANT_MUTABLE_MIRROR → migrate/delete
NECESSARY_DERIVED_PROJECTION → explicit one-way non-authoritative rebuildable
CANONICAL_TRUTH_MISNAMED_AS_REFERENCE → rehome/rename
```

Before closing any material financial mutation prove:

```text
CANONICAL_FINANCIAL_OWNER
CANONICAL_LEDGER_WRITER
BALANCED_POSTING_WHERE_APPLICABLE
IDEMPOTENCY/EXACT_REPLAY
TRANSACTION_ATOMICITY
CONCURRENCY/LOCKING
OPERATOR_CONTEXT_ISOLATION
SERVER_AUTHORIZATION
AUDITABILITY
PROVIDER_RESULT_PROVENANCE
UNKNOWN_PROVIDER_RESULT_HANDLING
REFUND/REVERSAL_EFFECT
SETTLEMENT/PAYOUT_SEPARATION
RECONCILIATION_PATH
CANONICAL_READBACK
ZERO_PARALLEL_FINANCIAL_WRITERS
```

## 11. DSH/WLT exit gate

At closure prove zero known:

```text
DSH_APP_SHAPED_FEATURE_OWNERS
DSH_FRONTEND_SHARED_UMBRELLA
WLT_FEATURE_TREE_UNDER_DSH
APP_SHAPED_DSH_EXPORTS
DUPLICATE_OR_AMBIGUOUS_CAPABILITY_NAMES
HTTP_MEGA_DOMAIN_AUTHORITY
TOP_LEVEL_MECHANISM_PSEUDO_DOMAINS
MANUAL_CONTRACT/DTO/ENUM/OPERATION_MIRRORS
DUPLICATE_WRITERS
WLT_REFERENCE_SHADOW_TRUTH
WLT_FRONTEND_COUPLING_TO_DSH_OR_APP
UNVERIFIED_FINANCIAL_INVARIANTS
BACKEND↔CONTRACT↔FRONTEND↔APP_PARITY_GAPS
```
