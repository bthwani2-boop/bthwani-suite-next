# Operational Coverage Matrix

This matrix prevents a root fix from being declared complete after only backend or only UI work.

## Authority and domain coverage

| Area | Required proof |
|---|---|
| Identity | trusted actor/principal propagation; no financial or fleet authority leak |
| Workforce | provider lifecycle, non-financial readiness, accreditation, suspension/absence, work scopes; zero authoritative money |
| DSH Order/Fulfillment | exact order/fulfillment context and canonical tender reference |
| DSH Fleet | exclusive primary BTHWANI/PARTNER affiliation; explicit partner memberships; actor resolution |
| DSH Dispatch | one eligibility client/primitive; presence only; area/capacity consume composite eligibility |
| WLT | guarantee, allocation financial effects, exposure, custody, debt, penalties, settlement, refunds, ledger |
| Store/Partner | canonical store/branch, partner courier membership, store-owned compensation/optional guarantee semantics |
| Governance | one authority registry and reconciled Product Truth |

## Journey coverage

### J01 — BTHWANI captain onboarding/activation

Create/resolve identity → Workforce provider readiness → fund WLT guarantee → prove baseline → activate BTHWANI affiliation → read back eligibility on captain/control panel.

Negative cases: insufficient baseline, pending KYC/readiness, WLT unavailable, duplicate funding/idempotency, stale projection.

### J02 — BTHWANI captain excess release

Request excess withdrawal/release → WLT recomputes protected minimum/effective collateral/open custody/debt/holds → governed approve/reject → ledger movement → updated COD eligibility/readback.

Negative cases: release would fall below floor, overdue custody, unresolved debt/hold, concurrent COD exposure.

### J03 — Customer wallet top-up from official provider

Choose official bank/e-wallet → provider funding intent → verification/callback/reconciliation → WLT internal wallet credit → idempotent readback.

Proof that provider is not exposed as a fourth order tender authority.

### J04 — Captain wallet/guarantee funding from official provider

External rail funding → WLT credit/funding classification → allowed transfer/funding into guarantee according to policy → readback of protected/releasable position.

No provider-specific dispatch authority.

### J05 — Checkout COD

Persist allocation `{wallet=0,cash=total}` → order creation → delivery choice → exact cash exposure evaluation/reservation when BTHWANI delivery is assigned → cash custody on collection → settlement.

### J06 — Checkout BTHWANI Wallet

Persist `{wallet=total,cash=0}` → wallet authorization/capture → no COD collateral reservation → refund exact wallet lineage.

### J07 — Checkout Mixed

Persist exact `{wallet>0,cash>0}` → wallet authorization/capture for wallet leg → COD exposure only for cash leg → cash custody only for collected cash leg → refund each leg by lineage.

Negative proof: Mixed must never bypass COD safety because method != literal COD.

### J08 — BTHWANI candidate discovery/capacity

Candidate/capacity evaluates exclusive affiliation, Workforce readiness/accreditation/service-area/work-window, DSH presence/conflict/capacity and WLT financial gate.

Negative proof: unauthorized-area or wrong-affiliation captain is not counted as capacity.

### J09 — Manual/automatic assignment

Same eligibility semantics as candidate discovery; current synchronous authority decision for governed write; idempotent assignment/reservation.

### J10 — Reassignment

Release/replace prior governed obligations safely; evaluate new captain under same primitive; no exposure leak or duplicate reservation.

### J11 — Captain inbox/acceptance

Offer visibility and acceptance cannot contradict creation eligibility. Acceptance revalidates current critical authorities and exact cash exposure.

### J12 — COD collection and rolling custody

Proof of delivery/cash collection creates custody, updates exposure/collateral availability, enforces deadline/end-shift/day settlement and blocks new COD when unsafe.

### J13 — Store delivery checkout

Customer sees same three payment choices; persisted allocation identical in semantics; financial counterparty points to store settlement model.

### J14 — Store courier assignment

Partner app selects canonical Workforce/DSH provider/membership; membership resolves to actor; platform baseline and store-added requirements enforced; no free-text person authority.

### J15 — Store courier cash collection

Courier recorded as store sub-custodian → store remains settlement counterparty → no BTHWANI captain collateral/commission/debt side effect.

### J16 — Store courier monthly salary

Courier is store employee with salary mode → delivery completes → delivery fee accrues to store economics → no per-delivery courier entitlement emitted by BTHWANI.

### J17 — Store courier alternative compensation configuration

Store may record chosen store-owned compensation model where supported → prove no BTHWANI payroll liability/writer. Any financial payment remains store responsibility unless a future explicit product changes authority.

### J18 — BTHWANI penalty

Incident/evidence → Operations selects WLT penalty policy/version → WLT derives amount → wallet debit or receivable/debt → optional governed setoff according to policy → audit/readback.

Negative proof: caller cannot choose arbitrary authoritative amount.

### J19 — Refund COD

After collected cash → default refund into BTHWANI Wallet unless true evidenced cash refund workflow executes. No caller source override.

### J20 — Refund Mixed

Exact reversal by original wallet/cash lineage; partial refunds preserve proportional/line-level rules defined by canonical WLT logic and cannot exceed captured/collected amounts.

### J21 — Partner settlement

WLT derives/verifies store gross and fees from immutable order/quote/tender/contract evidence; caller cannot choose gross. Store-delivery fee included according to canonical commercial contract.

### J22 — Distributed financial failure

Inject WLT timeout/error after operational intent → system remains in explicit pending/retry/reconcile state, not silently completed. Replays are idempotent and no double ledger entry occurs.

### J23 — Actor provenance

Every governed order writer with trusted actor persists actor provenance; unknown historical actor stays unknown; operator-authorized readback works; client/partner redaction holds.

### J24 — Fleet transfer

BTHWANI ↔ PARTNER transfer checks active assignments/exposure/custody/obligations, closes conflicts, records audit, and maintains XOR primary affiliation.

### J25 — Suspension/presence semantics

Workforce suspension while DSH presence is online → composite eligibility false without mutating presence into a second suspension truth. Reinstatement restores eligibility only if all other gates pass.

### J26 — Branch semantics

Partner/store workflows use real `branchId` linked to `storeId`; no store-ID-as-branch fallback remains.

## Surface coverage

| Surface | Mandatory outcomes |
|---|---|
| app-client | 3 checkout choices, wallet top-up rails, exact Mixed UX, refund status |
| app-captain | BTHWANI/PARTNER mode, guarantee/custody/exposure/debt/eligibility clarity, assignment flows |
| app-partner | courier team/membership/readiness/coverage/assignment/performance, store-owned guarantee requirement/evidence, compensation config, custody/settlement visibility |
| control-panel | platform collateral policy, penalty policy catalog, Operations application, financial reconciliation, partner/store distinction |
| backend APIs | typed IDs, one eligibility contract, canonical allocation/evidence, no caller money authority |
| DB | canonical tables/FKs/checks/exclusivity/arithmetic/provenance/forward migrations |
| events/outbox | actor/correlation/idempotency/source version, durable financial obligations |
| generated clients | no stale enums/IDs/routes |

## Failure/recovery coverage

Every critical journey must include tests for:

- dependency unavailable;
- stale source version/expired decision;
- duplicate request/retry;
- concurrent accept/reassign/release;
- partial provider callback;
- insufficient wallet/collateral;
- overdue custody;
- wrong affiliation/membership;
- wrong service area/branch;
- suspended provider with online presence;
- refund replay/over-refund attempt;
- WLT failure after operational intent;
- reconciliation repair without double posting.

## Evidence coverage required at closure

- source writer inventory;
- schema writer inventory;
- route/API inventory;
- event/outbox inventory;
- UI mutation inventory;
- generated-client inventory;
- zero-residue old-symbol inventory;
- PostgreSQL integration proof;
- deterministic invariant tests;
- concurrency/idempotency tests;
- cross-authority negative tests;
- all affected Go/TypeScript checks/builds;
- app/runtime smoke/readback;
- final governance drift check;
- final latest-`A` reconciliation and same-candidate-SHA evidence bundle.
