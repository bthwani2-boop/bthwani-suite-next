# Deep Diagnosis — diagnose_all-end-to-end

## 0. Diagnostic posture

This is the merged diagnosis for the finance / wallet / checkout / captain / partner-store-delivery / eligibility / settlement / refund / penalty / identity-boundary cluster.

It consolidates the diagnostic meaning of both prior packages into one root-cause landscape. Older plans are search seeds and historical evidence only. Live current code/runtime/data/contracts on the pinned execution candidate remain the technical source of truth; later explicit user product decisions remain binding product authority.

The method is:

`TOP-DOWN DIAGNOSIS; BOTTOM-UP EVIDENCE`

A low-level technical issue is not allowed to direct execution until its operational parent, canonical owner and root cause are proven.

## 1. Canonical platform meaning

The system must have one owner for each durable fact.

```text
Identity
  owns authentication/session/principal/trusted actor context

Workforce
  owns person/provider lifecycle
  owns non-financial readiness
  owns operational accreditation
  owns suspension/absence/work windows/scopes
  does NOT own authoritative money

DSH
  owns store/real branch/order/fulfillment
  owns primary fleet affiliation and partner memberships
  owns dispatch assignment/presence/capacity
  owns partner delivery operational tasks
  does NOT own authoritative money

WLT
  owns wallets/ledger
  owns canonical monetary amounts
  owns captain collateral/guarantee
  owns payment allocation financial effects
  owns COD exposure and cash custody
  owns debt/receivable
  owns penalties monetary effect
  owns settlement/payout/refund/reversal
  owns financial eligibility
```

Read-only projections may exist outside the owner only when source/version/freshness are explicit and the projection cannot grant a critical write.

## 2. Executive root cause

The highest systemic defect is not one missing page or enum. The architecture repeatedly conflates four distinct concepts:

1. **Tender** — how the customer funds the order.
2. **Exposure** — how much new cash risk BTHWANI permits a captain to accept.
3. **Custody** — physical cash actually collected and still owed/remittable.
4. **Settlement** — the final financial obligation between canonical counterparties.

When downstream logic infers these from a payment-method label, a local balance field, a legacy courier role, or caller-computed totals, money authority leaks into operational domains.

The highest root is therefore:

`RC-PAYMENT-TENDER-EXPOSURE-CUSTODY-SETTLEMENT-CONFLATION`

The structural fix is a canonical persisted numeric `PaymentAllocation`, explicit WLT exposure/custody/settlement models, one monetary authority, and one composed captain eligibility authority.

## 3. Root-cause landscape

### P0 — RC-PAYMENT-TENDER-EXPOSURE-CUSTODY-SETTLEMENT-CONFLATION

**Evidence/pattern**

- Checkout historically contains method-name semantics including `official_wallet`.
- COD protection paths can key on literal COD instead of exact cash allocation.
- Mixed can therefore contain real cash without identical risk/custody treatment unless all financial logic consumes numeric allocation.
- Current/previous WLT COD concepts include reservation plus legacy collection/remittance semantics that require reconciliation and cleanup.

**Blast radius**

Checkout, payment authorization/capture, dispatch financial eligibility, COD reservation, cash collection, partner/store delivery, settlement, refunds, receipts, captain wallet UI and finance/operator views.

**Target**

Persist one `PaymentAllocation` and make every financial consequence consume exact numeric legs.

### P0 — RC-MONETARY-FACT-OWNERSHIP-SPLIT

**Proven examples**

- Workforce previously carries writable captain fields equivalent to `FinancialGuaranteeMinorUnits`, `FinancialGuaranteeCurrency`, `FinancialGuaranteeStatus`, `FinancialGuaranteeReference` even though WLT is intended monetary authority.
- Workforce incident input can carry `ProposedPenaltyMinorUnits`/currency.
- WLT penalty posting can accept caller amount even though WLT should derive the amount from policy.
- Partner settlement can accept caller-computed gross/amount rather than derive/verify immutable economic evidence.
- DSH/WLT reservation boundaries can trust caller amount/currency rather than canonical financial allocation.

**Target**

WLT is decision owner as well as ledger owner for canonical monetary facts. Operational domains provide immutable references/facts, not authoritative amounts.

### P0 — RC-CAPTAIN-OPERATIONAL-ELIGIBILITY-AUTHORITY-SPLIT

**Pattern**

Identity, Workforce, DSH Fleet, DSH Dispatch and WLT each own legitimate inputs, but candidate/capacity/assign/reassign/inbox/accept paths can use different subsets or stale projections.

**Failure**

An offer can be visible/created for an actor who later fails an omitted gate, or capacity can count an actor who is unauthorized for the service area.

**Target**

One conceptual primitive such as:

`EvaluateCaptainEligibility(captainActorId, orderId, purpose, evaluatedAt)`

combines all authorities and returns auditable reason codes/source versions. Governed writes use current synchronous authority; short-lived versioned preview decisions are allowed only for scalable discovery and never become unbounded write authority.

### P1 — RC-STORE-DELIVERY-FLEET-COMPENSATION-PARALLEL-TRUTH

**Carried-forward evidence**

- legacy `StoreCourierSettings`-style person/lifecycle fields such as courier name/phone/active state can coexist with Workforce person and DSH membership truth;
- legacy `pricingSource`/courier-pricing selectors can coexist with canonical store-delivery pricing;
- partner/store courier can leak through older collector/captain financial semantics;
- store courier compensation settings can be confused with BTHWANI payroll/earning authority.

**Target**

Workforce owns person/provider; DSH owns primary affiliation/membership/task; WLT owns BTHWANI financial settlement with store/customer; store owns its employee payroll/compensation and optional store-specific collateral unless a future explicit financial-custody product changes that boundary.

### P1 — RC-IDENTIFIER-SEMANTIC-OVERLOADING

**Proven class**

- a `storeCourierId`-like value can mean membership in DSH but be sent to Workforce as if actor ID;
- store or scope IDs can be persisted/passed under branch-named fields;
- generic strings cross authority boundaries with insufficient entity semantics.

**Correct handoff**

```text
captainMembershipId
  -> DSH Fleet resolves active membership
  -> validate store + PARTNER affiliation
  -> captainActorId
  -> Workforce readiness(captainActorId)
  -> persist/use membershipId only where membership is the intended entity
```

**Target**

Explicit actor/membership/person/store/branch types across DB, Go, TS, OpenAPI, generated clients, events, audit and UI query state.

### P1 — RC-DISTRIBUTED-FINANCIAL-OBLIGATION-BEST-EFFORT

A proven example is accepted delivery completing while the required WLT `FinalizeCodReservation` call error is discarded (`_, _ = ...`). The class is wider and includes any reserve/release/bind/refund/settlement/promotion/coupon financial obligation handled as best-effort RPC.

**Target**

A durable state machine/outbox/saga with idempotency, correlation, explicit pending/succeeded/failed/reconciliation states, retry and deterministic readback. Operational success cannot hide unknown financial state.

### P1 — RC-SERVICE-AREA-CAPACITY-TRUTH-DRIFT

DSH candidate/capacity can historically receive a requested `serviceAreaCode` and label candidates with it without proving the Workforce actor actually owns that scope.

Correct flow:

`order/store area + Workforce serviceAreaCodes + all other eligibility gates -> eligible candidate set -> capacity`

Capacity must count only actors truly eligible for that requested area.

### P1 — RC-AVAILABILITY-AND-SUSPENSION-SEMANTIC-OVERLAP

Workforce durable facts and DSH presence must be separate:

- Workforce: active/suspended, planned absence, leave/work window, readiness.
- DSH: online/offline/available/busy/current assignment state.

A Workforce suspension makes composite eligibility false; DSH must not create a second independently writable suspension truth.

### P1 — RC-ACCREDITATION-PARALLEL-AUTHORITY

Workforce is the canonical owner of general operational accreditation. Any mutable DSH `accreditation_status` with the same business meaning is duplicate authority and must be removed or renamed only if it is proven to represent a different dispatch-specific certification.

### P2 — RC-GOVERNANCE-AUTHORITY-DRIFT

Historical Product Truth/plans can lag behind live code, and current code may evolve without one machine-enforced authority declaration. This is a recurrence multiplier.

Target: one machine-readable authority registry for owners, writers, projections, identifiers and invariants, with human governance mechanically checked against it.

### P2 — RC-ORDER-ACTOR-PROVENANCE

The finding is valid but the previous implementation attempt is not closed. GitHub Actions run `31908535848` failed at `Compile and test all DSH backend consumers`; OpenAPI/generated verification, full tests/static checks, client smoke, final DB reproof and governed final commit were skipped.

It remains HOLD behind higher systemic roots until contracts stabilize and the failed consumer compilation is diagnosed/fixed.

## 4. Customer checkout and PaymentAllocation

### Final customer choices

Exactly:

1. `COD`
2. `BTHWANI Wallet`
3. `Mixed`

This applies to both BTHWANI delivery and store/partner delivery.

`official_wallet` / external banks/e-wallets/providers are funding rails into BTHWANI Wallet, not a fourth checkout tender authority.

### Canonical allocation

At minimum the system needs authoritative numeric fields such as:

```text
orderId
currency
subtotal
deliveryFee
discount
platformSubsidy
walletAmountMinorUnits
cashOnDeliveryAmountMinorUnits
partner/store payable components
platform fee/commission components
pricing/policy version
pricing snapshot/reference
total/orderPayableMinorUnits
```

Conservation must be mechanically enforced. The client displays the result but never calculates authoritative allocation.

Invariant:

`walletAmountMinorUnits + cashOnDeliveryAmountMinorUnits = orderPayableMinorUnits`

COD: wallet=0, cash=total.

Wallet: wallet=total, cash=0.

Mixed: wallet>0 and cash>0.

## 5. External official provider funding

Correct model:

`official bank/e-wallet/provider -> verified funding transaction -> WLT ledger -> BTHWANI Wallet`

The same governed WLT Cash-In mechanism is used by customer and captain where product policy permits. Provider identity does not own dispatch/checkout monetary authority.

The complete E2E journey must be proven, not inferred from enums or primitives:

`funding intent -> provider verification/callback -> idempotency/unknown-result handling -> WLT ledger credit -> readback/reconciliation`

## 6. BTHWANI captain collateral/guarantee

The final model is a real WLT-owned restricted financial position, not a Workforce status and not merely a generic spendable wallet alias.

Required concepts are distinct:

- spendable wallet balance where applicable;
- restricted guarantee/collateral;
- protected minimum;
- releasable excess;
- active COD/Mixed cash exposure reservation;
- open cash custody;
- debt/receivable;
- other holds.

Platform Finance governance defines the opening/protected minimum as versioned WLT policy.

Activation requires the configured opening/baseline collateral. After activation, insufficient COD-safe collateral blocks COD/Mixed cash-bearing work but may allow fully prepaid work when all non-financial gates pass.

No unrestricted direct withdrawal of protected collateral is allowed. Governed excess release is permitted only when post-release collateral remains compliant and there is no overdue custody/debt/hold/unresolved liability.

Offboarding can release/refund the provable remainder after obligations close.

## 7. COD exposure, custody and settlement

For exact cash leg `C`:

1. current PaymentAllocation is resolved;
2. composite operational eligibility passes;
3. WLT proves `openCashCustody + C <= effectiveCollateral` and settlement is not overdue;
4. WLT creates an idempotent exposure reservation for `C`;
5. assignment/acceptance is governed by that decision/correlation;
6. actual cash collection creates/increases custody;
7. exposure and custody remain separate and auditable;
8. settlement/reconciliation closes custody according to versioned policy.

Prepaid-only orders create zero COD collateral reservation.

Mixed reserves only the cash leg.

Exposure finalization/release may never imply physical cash was remitted.

Rolling settlement/deadline/end-shift/day policy can block new COD when custody is overdue or collateral insufficient.

### Prior lifecycle contradiction

Previous diagnosis found:

- reservation and legacy custody/remittance semantics coexisting;
- `sovereign_cod.go` rejecting legacy collection/remittance on reservation-funded orders;
- accepted delivery path discarding WLT finalize error;
- DSH reservation client able to send caller amount/currency rather than binding solely to canonical WLT allocation/reference.

These remain mandatory reproof/cleanup cones during execution.

## 8. Financial eligibility versus order-specific capacity

A coarse general decision such as applying the strictest minimum dispatch/COD balance is insufficient.

The architecture needs separate semantics for:

- general financial readiness;
- exact order-specific cash exposure reservation/capacity.

Candidate discovery can use bounded preview decisions. Critical assign/accept/reassign writes must re-evaluate fresh authorities and exact cash exposure.

## 9. Fleet affiliation and partner membership

Primary dispatch affiliation is exclusive:

`BTHWANI XOR PARTNER`

A PARTNER actor may have multiple active store memberships where allowed. Memberships do not replace primary affiliation.

Transfer between BTHWANI and PARTNER is an explicit audited lifecycle that must check active assignments, exposure, custody and blocking obligations.

## 10. Partner/store delivery

Customer still sees COD, BTHWANI Wallet and Mixed.

The financial counterparty is the store, not the store courier as a BTHWANI captain.

If a store courier physically collects cash, the system may record the actor/membership as store sub-custodian evidence. That must not create:

- BTHWANI captain collateral usage;
- BTHWANI captain commission;
- BTHWANI captain debt;
- BTHWANI captain payout/earning;
- BTHWANI payroll liability.

### Store employee compensation

- Monthly-salary employee: delivery fee remains in store economics; no per-order BTHWANI entitlement.
- Alternative per-delivery compensation: remains store-owned compensation under the later explicit user decision. The platform may record operational configuration/projection but does not become payer/payroll ledger merely because app-partner manages the courier.
- Optional store-specific collateral: store responsibility; BTHWANI/WLT must not silently custody or display it as BTHWANI money.

Any future BTHWANI-managed payroll/guarantee-custody product requires a separate explicit product/contract decision.

### Partner app purpose

app-partner should provide fit-for-purpose management for:

- courier/team membership;
- readiness/status;
- coverage/scopes;
- assignments and task lifecycle;
- tracking/proof/exceptions/reassignment;
- performance/incidents;
- store-owned requirement/evidence/configuration where appropriate;
- store cash custody/settlement visibility;
- clear financial readback without BTHWANI-only captain finance controls.

It must not maintain a free-text parallel courier identity.

## 11. StoreBranch

If product/UI semantics use “branch”, the implementation must have a real canonical StoreBranch entity/identifier with parent store and relevant location/hours/status/service-area/inventory/fleet links.

`selectedBranchIds` or equivalent must never contain Store/Scope IDs under a branch name. No final compatibility fallback `branchId = storeId` is allowed.

## 12. Penalties

Correct flow:

`immutable incident facts/evidence -> Operations selects WLT penaltyPolicyId/version -> WLT loads policy -> derives amount -> posts ledger or debt/receivable -> immutable audit/reference`

Operations/Workforce does not author the amount.

If insufficient spendable balance exists, WLT creates canonical receivable/debt rather than making spendable balance arbitrarily negative. Collection from future earnings or guarantee setoff is allowed only where versioned policy explicitly permits it.

Any discretionary bounded amount remains WLT Finance Control with policy bounds, reason/evidence and maker/checker where applicable.

## 13. Refunds and reversals

Refund follows immutable original funding lineage:

- wallet-funded leg -> BTHWANI Wallet;
- true captured external-rail transaction requiring reversal -> same original rail/transaction when supported;
- collected cash -> BTHWANI Wallet by default unless a real evidenced cash-refund workflow occurs.

Mixed reversals use original allocation/ledger dimensions. No mutable caller `fundsSource` or reconstructed payment-method label may override immutable lineage.

Reversal binds to original transaction/ledger entry; original financial history remains immutable.

## 14. Partner/store settlement

Store-delivery fee belongs in store gross economic settlement subject to canonical partner/platform contract. Courier compensation is a separate store expense and must never be assumed equal to delivery fee.

WLT must derive/verify store gross, fee/commission, discounts/subsidies and other settlement components from canonical order/quote/tender/contract evidence, not trust a caller-authored `GrossAmountMinorUnits` or subtotal-only reconstruction.

## 15. Failure/recovery contract

Every material financial transition must carry or derive:

- trusted actor/operator context;
- role/scope authorization;
- canonical source IDs;
- idempotency key;
- correlation ID;
- expected/current state;
- policy/source versions;
- local invariants;
- durable distributed handoff;
- timeout/unknown-result semantics;
- retry/reconciliation/readback;
- compensating transition where valid;
- immutable audit/evidence.

Forbidden:

- operational success + hidden unknown finance;
- retry causing second debit/earning/refund;
- local financial/eligibility fallback when WLT/required authority is unavailable;
- stale projection granting money-moving/assignment write;
- manual amount override as repair.

## 16. Security/isolation adversarial requirements

Must test at least:

- wrong operator context;
- wrong partner/store membership;
- actor vs membership substitution;
- store/scope vs branch substitution;
- wrong role applying/reversing penalty;
- partner attempting BTHWANI finance operations;
- BTHWANI captain appearing in partner-only dispatch and vice versa;
- IDOR on wallet/settlement/COD/penalty/partner-delivery data;
- replay with modified amount/actor/store/order;
- stale policy/source version;
- cross-store courier assignment;
- cross-currency mutation;
- release below protected floor;
- concurrent COD reservations exhausting the same collateral;
- suspended Workforce provider remaining online in DSH;
- Mixed cash leg bypassing COD guards.

## 17. Cross-surface consequences

### app-client

- exactly three checkout choices;
- official providers under top-up only;
- exact Mixed summary from server allocation;
- canonical payment/refund readback;
- no client monetary arithmetic.

### app-captain

- canonical BTHWANI/PARTNER mode;
- clear guarantee/protected/releasable/reserved/custody/debt/settlement/eligibility readback;
- no financial master-data editing;
- PARTNER mode isolated from BTHWANI-only finance semantics.

### app-partner

- canonical courier membership/person resolution;
- task/coverage/readiness management;
- store-owned compensation/optional guarantee clearly labeled as store responsibility;
- store settlement/custody visibility;
- no parallel free-text identity or BTHWANI payroll/collateral authority.

### control-panel

- Platform/Finance configures versioned BTHWANI collateral and penalty policy;
- Operations selects incidents/policies and manages operational actions;
- Finance owns WLT settlement/reconciliation/ledger/exceptions;
- Partner/store views clearly separate store liability from platform/captain liability;
- no manual balance or arbitrary authoritative money override.

## 18. Historical finance reproof

Historical finance packages are search seeds, not current defect proof.

One older direct-penalty-wallet-mutation claim was already superseded by current canonical ledger posting. Other historical cones—legacy ledger coexistence, daily close, promotion funding, subscription/onboarding commercial fees, pricing, payout and reconciliation—must be re-proven on the exact current candidate before being carried as current findings.

Never delete or fix solely because an old plan said it was broken.

## 19. Mandatory carried-forward finding register

The merged diagnosis explicitly retains:

- `MR-F01` store courier parallel identity/lifecycle truth;
- `MR-F02` parallel store-courier pricing source/configuration;
- `MR-F03` identifier overloading beyond membership/actor;
- `MR-F04` canonical StoreBranch gap;
- `MR-F05` partner courier leaking into BTHWANI captain finance;
- `MR-F06` distributed financial best-effort mutation class;
- `MR-F07` partner settlement gross/amount authority drift;
- `MR-F08` full WALLET/MIXED E2E journey gap;
- `MR-F09` tender/exposure/custody/settlement separation;
- `MR-F10` store-delivery fleet/compensation parallel truth;
- `MR-F11` actor provenance open/lower-ranked after failed verification.

None is dropped by consolidation.

## 20. Current merged verdict

`DIAGNOSIS = CLOSED FOR THIS MERGED SCOPE`

`DECISION_REQUIRED = 0`

`IMPLEMENTATION = OPEN`

`CLEANUP = OPEN`

`FINAL_E2E_CLOSURE = OPEN`

The next executor must re-pin current `A`, classify concurrent delta, then execute the root-first frontier in `PACKAGE.md`. The existence of these documents is not runtime implementation evidence.
