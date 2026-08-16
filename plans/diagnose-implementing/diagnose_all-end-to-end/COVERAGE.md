# Operational Coverage — diagnose_all-end-to-end

This matrix is the merged coverage contract. A root fix cannot be closed after only backend, only UI, only migration, or only one domain passes.

## 1. Authority/domain coverage

| Area | Mandatory proof |
|---|---|
| Identity | trusted actor/principal/session propagation; no money/fleet authority leak; correct role/surface isolation |
| Workforce | person/provider lifecycle, non-financial readiness, accreditation, suspension/absence, work windows/scopes; zero authoritative money |
| DSH Order/Fulfillment | exact order/fulfillment/store/real-branch context; canonical tender/payment reference; actor provenance |
| DSH Fleet | exclusive primary BTHWANI/PARTNER affiliation; explicit store memberships; membership->actor resolution; audited transfer |
| DSH Dispatch | one eligibility semantic; ephemeral presence only; candidate/capacity/assign/reassign/accept use the same composed authority |
| WLT | wallet/ledger, restricted captain collateral, PaymentAllocation effects, exposure, custody, debt, penalties, settlement/payout/refund/reversal |
| Store/Partner | canonical store/branch/membership; store-owned compensation/optional guarantee semantics; no BTHWANI payroll/collateral leakage |
| Events/outbox/jobs | durable obligation, actor/correlation/idempotency/source-version, retry/reconciliation |
| DB/migrations | forward-only canonical structures, constraints/FKs/arithmetic/exclusivity, fresh + upgrade proof |
| Contracts/generated | OpenAPI/Go/TS/events/generated clients share one semantic model and no stale old authority |
| Governance | one authority registry; Product Truth/docs reconciled; historical plans classified as non-runtime authority |

## 2. Operational journeys

### J01 — BTHWANI captain onboarding/activation

Identity/provider ready → Workforce non-financial readiness → WLT collateral funded to baseline → BTHWANI primary affiliation active → canonical eligibility readback on app-captain/control-panel.

Negatives: insufficient collateral, pending identity/readiness, WLT unavailable, duplicate funding, stale projection, wrong affiliation.

### J02 — BTHWANI captain excess release

Request release → WLT recomputes protected minimum/effective collateral/reservations/open custody/debt/holds → approve/reject → ledger movement → updated financial eligibility/readback.

Negatives: would breach floor, overdue custody, unresolved debt/hold, concurrent new cash reservation.

### J03 — Customer wallet top-up from official provider

Choose provider → funding intent → authoritative provider verification/callback/reconciliation → idempotent WLT internal-wallet credit → readback.

Prove the provider is not a fourth checkout tender authority.

### J04 — Captain wallet/collateral funding from official provider

Provider funding → WLT credit/funding classification → governed movement/funding into eligible restricted position according to policy → protected/releasable readback.

No provider-specific dispatch authority.

### J05 — Checkout COD

Persist `{wallet=0,cash=total}` → create/order/payment state → delivery choice → exact cash exposure reservation for BTHWANI captain → collection opens custody → settlement/reconciliation.

### J06 — Checkout BTHWANI Wallet

Persist `{wallet=total,cash=0}` → wallet authorization/capture → zero COD reservation → failure rollback/reconciliation → refund to immutable wallet lineage.

### J07 — Checkout Mixed

Persist `{wallet>0,cash>0}` → authorize/capture wallet leg → reserve exact cash leg only → actual cash collection opens custody → refund each leg by original lineage.

Negative: Mixed must never bypass COD safety because the method label is not literal COD.

### J08 — BTHWANI candidate discovery/capacity

Evaluate affiliation, Workforce active/accredited/scoped/work-window truth, service area, DSH presence/conflicts/capacity and WLT financial gate.

Wrong-area/wrong-affiliation/suspended/financially-ineligible actors are not counted as capacity.

### J09 — Manual/automatic assignment

Use the same eligibility semantics as discovery; current authority checks for the governed write; idempotent assignment and exact cash reservation.

### J10 — Reassignment

Release/retarget prior obligations exactly once → evaluate new actor under the same primitive → no reservation/custody leakage or duplicate exposure.

### J11 — Captain inbox/offer/acceptance

Offer visibility must not contradict creation eligibility. Accept revalidates current critical authorities and exact cash exposure.

### J12 — COD collection and rolling custody

Collection evidence opens/increases custody → effective collateral/exposure availability updates → settlement deadline/shift/day closure enforced → new cash work blocked if unsafe/overdue.

### J13 — Store delivery checkout

Customer sees the same three choices; allocation semantics are identical; financial counterparty is store settlement, not BTHWANI captain finance.

### J14 — Store courier assignment

app-partner selects canonical provider/membership → DSH membership resolves actor → platform baseline and store-added requirements evaluated → assignment/task persisted with explicit IDs.

No free-text courier-person authority.

### J15 — Store courier cash collection

Courier recorded as store sub-custodian evidence → store remains settlement counterparty → no BTHWANI captain collateral/commission/debt/payout/earning side effect.

### J16 — Store courier monthly salary

Store employee in salary mode completes delivery → customer delivery fee remains store economics → no per-delivery BTHWANI entitlement emitted.

### J17 — Store alternative compensation configuration

Store may record its store-owned compensation arrangement where supported → prove no BTHWANI payroll/earning liability or WLT payroll writer is created under current product authority.

### J18 — Store-specific courier guarantee requirement/evidence

Store may require its own collateral/evidence → platform may manage status/evidence → prove no BTHWANI WLT asset/liability/custody is created.

### J19 — BTHWANI penalty

Incident/evidence → Operations selects WLT policy/version → WLT derives amount → ledger debit or receivable/debt → optional policy-authorized setoff → audit/readback/reversal.

Caller arbitrary amount must be rejected.

### J20 — Refund COD

Collected cash defaults to BTHWANI Wallet refund unless a real evidenced cash-refund transition occurs. No mutable caller source override.

### J21 — Refund Mixed

Exact reversal by original wallet/cash lineage; partial refunds bounded by captured/collected original amounts; retry cannot over-refund/double-post.

### J22 — Partner/store settlement

WLT derives/verifies store gross/fees from immutable order/quote/tender/contract evidence; caller cannot choose authoritative gross. Store-delivery fee included per commercial contract; courier compensation remains separate store expense.

### J23 — Distributed financial failure

Inject WLT timeout/failure after operational intent → system remains explicit pending/retry/reconcile, never silently completed → replay idempotent → no duplicate ledger posting.

### J24 — Actor provenance

Every governed order-event writer with trusted actor persists actor provenance; historical unknown remains unknown; authorized operator readback works; client/partner redaction holds.

### J25 — Fleet transfer

BTHWANI ↔ PARTNER transfer checks active assignments, exposure, custody, debt/holds/obligations → resolves conflicts → records audit → maintains exclusive primary affiliation.

### J26 — Suspension/presence semantics

Workforce suspension while DSH presence is online → composite eligibility false without rewriting DSH presence as a second suspension truth. Reinstatement restores eligibility only if every other gate passes.

### J27 — Canonical branch semantics

Store/partner workflows use real `branchId` linked to `storeId`; location/service-area/inventory/fleet relations point to the canonical branch. No store/scope-as-branch fallback remains.

### J28 — Accreditation authority

Workforce accreditation change → every candidate/capacity/assignment/accept consumer reflects the same decision; DSH cannot independently override the general accreditation truth.

### J29 — Legacy store courier identity removal

Canonical Workforce person + DSH membership are read/written → old courierName/courierPhone/duplicate active-state settings are unreachable/non-authoritative/deleted after migration.

### J30 — Legacy store courier pricing removal

Canonical store-delivery pricing drives quote/order/settlement → old `pricingSource`/parallel pricing branch cannot affect runtime → contracts/UI/tests cleaned.

### J31 — WALLET full E2E failure/recovery

Wallet authorization → order confirmation/capture → timeout/unknown-result/retry → rollback/reconciliation/readback. No order and wallet state diverge silently.

### J32 — MIXED full E2E failure/recovery

Wallet leg and cash leg both remain individually accountable through authorization, cash exposure/custody, failure, cancellation, reassignment, refund and reconciliation.

## 3. Surface coverage

| Surface | Mandatory outcomes |
|---|---|
| app-client | exactly 3 checkout choices; provider top-up under wallet funding; exact Mixed UX; canonical payment/refund status; no client money authority |
| app-captain | canonical BTHWANI/PARTNER mode; collateral/protected/excess/reserved/custody/debt/settlement/eligibility clarity; governed assignment/accept flows |
| app-partner | courier membership/readiness/coverage/assignment/performance; store-owned requirement/evidence/comp config; custody/settlement visibility; no free-text identity |
| app-field where intersecting | person/provider creation, scopes/activation inputs consistent with Workforce canonical ownership; no money authority |
| control-panel Platform | versioned collateral/penalty/global policy governance |
| control-panel Operations | assignment/incident/policy selection and non-financial operational actions; no arbitrary authoritative amount |
| control-panel Finance | WLT ledger/settlement/reconciliation/debt/payout/refund/exception readback and governed controls |
| control-panel Partner | store/courier/membership/branch/store-owned policy visibility without BTHWANI financial leakage |
| backend APIs | typed IDs, one eligibility contract, canonical allocation/evidence, no caller money authority |
| DB | canonical tables/FKs/checks/exclusivity/arithmetic/provenance/forward migrations |
| events/outbox | actor/correlation/idempotency/source version and durable financial obligations |
| generated clients | no stale checkout enum, old financial field, ambiguous ID or obsolete route |

## 4. Failure/recovery coverage

Every critical journey must test:

- required dependency unavailable;
- stale source version/expired decision;
- duplicate request/retry;
- concurrent accept/reassign/release/reservation;
- partial provider callback;
- unknown provider result;
- insufficient spendable balance/collateral;
- overdue custody;
- wrong affiliation/membership;
- wrong service area/branch/store;
- actor/membership/store/branch ID substitution;
- suspended provider while DSH presence is online;
- refund replay/over-refund;
- WLT failure after operational intent;
- reconciliation repair without double posting;
- policy version mismatch;
- cross-currency rejection;
- stale generated client/contract mismatch;
- migration from fresh and supported upgrade states.

## 5. Evidence coverage at closure

Mandatory evidence bundle includes:

- source writer inventory before/after;
- schema/table/column writer inventory;
- API/route inventory;
- event/outbox/job inventory;
- UI mutation inventory;
- generated-client inventory;
- identifier semantics inventory;
- legacy symbol/semantic zero-residue report;
- PostgreSQL migration/integration proof;
- deterministic financial invariant tests;
- concurrency/idempotency/failure-injection tests;
- cross-authority security negatives;
- affected Go tests/static checks;
- affected TypeScript typechecks/builds;
- app/runtime smoke/readback;
- privacy/redaction/audit proof;
- partner-versus-BTHWANI finance isolation proof;
- WALLET/MIXED E2E proof;
- actor provenance proof;
- governance/authority-registry drift check;
- final latest-`A` reconciliation and one same-candidate-SHA evidence bundle.

A missing journey/surface/failure/evidence row remains OPEN; it cannot be silently excluded from closure.
