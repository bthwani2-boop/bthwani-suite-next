# Deep Diagnosis — Canonical Finance / Delivery / Captain Closure

## 1. Scope and evidence posture

This diagnosis covers the discussed and previously inspected cross-surface paths involving:

- customer checkout/payment selection;
- BTHWANI Wallet and external wallet/bank funding rails;
- WLT ledger, captain collateral, COD exposure, cash custody, debt, penalty, refund, settlement and payout;
- BTHWANI captain activation/readiness/dispatch;
- Workforce readiness/accreditation/scopes/suspension;
- DSH fleet affiliation/memberships/service-area/capacity/dispatch;
- partner/store delivery and partner courier management;
- app-client, app-captain, app-partner and control-panel consequences;
- identifier semantics across DSH/Workforce/WLT boundaries;
- actor provenance;
- governance/product-truth drift;
- line/file/folder cleanup required after canonical cutover.

Evidence sources include the live `A` ref, the merged diagnosis package `v5-finance-delivery-canonical-truth-20260816-0214`, the actor-provenance task/workflow evidence, `services/wlt/WLT_EXTERNAL_WALLET_SWITCH_ARCHITECTURE.md`, the user's decision transcript, and the GitHub Actions result for run `31908535848`.

The earlier plans are evidence/working material only. They do not become runtime truth simply because they exist under `plans/**`.

## 2. Executive diagnosis

The dominant defect is not one missing screen, one enum, or one dispatch check. The system repeatedly conflates four separate concepts:

1. **Tender** — how much of the order is paid by each funding leg.
2. **Exposure** — how much new cash risk the platform is permitting a BTHWANI captain to accept.
3. **Custody** — cash actually collected and currently held/remittable by a person/store.
4. **Settlement** — the final financial obligation between canonical counterparties.

When these are represented by a single payment-method enum or by generic balance/readiness fields, downstream services infer monetary meaning from operational labels. That creates parallel authorities and unsafe gaps, especially for Mixed and partner delivery.

The architectural correction is therefore not `if paymentMethod == mixed` patches. It is a canonical financial allocation + explicit exposure/custody/settlement state model owned by WLT, consumed by DSH/Workforce through clear contracts.

## 3. Root-cause graph

### P0 — RC-PAYMENT-TENDER-EXPOSURE-CUSTODY-SETTLEMENT-CONFLATION

**Proven pattern:** checkout/payment paths use method labels while downstream COD protection and cash collection logic can be conditional on literal COD semantics. Mixed therefore risks having a real cash leg without identical protection.

**Root cause:** no single persisted numeric tender allocation drives every financial consequence.

**Blast radius:** checkout validation, payment intent, dispatch eligibility, COD reservation, cash collection, settlement, refund, receipts, operator views, captain wallet and partner delivery.

**Correct root fix:** canonical numeric `PaymentAllocation`; separate WLT models for exposure reservation, cash custody and settlement; all downstream logic consumes allocation amounts, never reconstructs them from enum names.

### P0 — RC-MONETARY-FACT-OWNERSHIP-SPLIT

**Proven pattern:** Workforce can carry guarantee-related monetary fields/readiness and can submit a proposed penalty amount while WLT later posts the amount. Partner settlement paths can carry caller-computed gross values into WLT.

**Root cause:** WLT is ledger owner but is not always decision owner for the economic amount.

**Impact:** a service that should own operational facts can become a hidden monetary authority.

**Correct root fix:** WLT alone derives/accepts authoritative monetary amounts from versioned policy and immutable evidence. Other domains send references and operational facts only.

### P0 — RC-CAPTAIN-OPERATIONAL-ELIGIBILITY-AUTHORITY-SPLIT

**Proven pattern:** readiness/eligibility is distributed across Identity, Workforce, DSH dispatch/fleet/service-area and WLT. Different paths can use different subsets. Create/reassign/accept/candidate/capacity are not guaranteed to use one identical decision primitive.

**Failure mode:** an offer may be created for a captain who later cannot accept because a later path evaluates a gate the creation path omitted.

**Correct root fix:** a single composed captain eligibility primitive, with current authority decisions for governed writes and versioned short-lived preview decisions only where scale requires them.

### P1 — RC-STORE-DELIVERY-FLEET-COMPENSATION-PARALLEL-TRUTH

**Proven pattern:** modern fleet/membership modeling coexists with legacy store-courier settings carrying person-like values such as courier name/phone and old pricing configuration. Partner delivery can also cross into BTHWANI captain financial semantics.

**Root cause:** store delivery evolved by adding new models without physically removing older identity/configuration/financial paths.

**Correct root fix:** Workforce person/provider + DSH affiliation/membership are canonical. Legacy courier identity/config is deleted. Store-owned courier payroll/optional guarantee remains store responsibility. WLT settles the store, not a fake BTHWANI captain counterparty.

### P1 — RC-IDENTIFIER-SEMANTIC-OVERLOADING

**Proven examples from prior diagnosis:** membership-like `storeCourierId` passed to Workforce APIs expecting actor identity; Store/Scope identifiers represented under branch-like fields; other paths can use a generic actor/store semantic incorrectly.

**Root cause:** generic string identifiers cross authority boundaries without branded/semantic type enforcement.

**Impact:** the system can return valid-looking records for the wrong entity class or apply readiness/financial/authorization checks to the wrong principal.

**Correct root fix:** explicit actor/membership/person/store/branch types in API, domain, events and DB schema; resolve membership -> actor at the owning domain before crossing into Workforce.

### P1 — RC-DISTRIBUTED-FINANCIAL-OBLIGATION-BEST-EFFORT

**Proven pattern:** an operational state can be committed before a required WLT mutation, while the WLT error is ignored or compensation itself is best-effort. Prior diagnosis identified delivery-proof/COD-finalization and other reserve/release-style paths as examples.

**Root cause:** cross-service money obligations treated as ordinary RPC side effects instead of a governed durable state machine.

**Impact:** operational truth says completed while financial truth remains pending/failed, with no canonical terminal recovery state.

**Correct root fix:** outbox/saga/idempotent transition model with explicit pending/succeeded/failed/reconciliation states. No ignored financial errors.

### P1 — RC-SERVICE-AREA-CAPACITY-TRUTH-DRIFT

**Proven pattern:** Workforce has operational service-area scopes, while DSH candidate/capacity logic can derive availability from dispatch profiles without proving Workforce area authorization.

**Impact:** capacity can count captains who are not authorized for the area; dispatch may assign outside scope.

**Correct root fix:** one eligibility primitive governs candidate discovery and capacity as well as assignment/acceptance.

### P1 — RC-AVAILABILITY-AND-SUSPENSION-SEMANTIC-OVERLAP

**Proven pattern:** Workforce has durable availability/suspension-style operational facts and DSH has dispatch statuses that can overlap semantically.

**Root cause:** long-lived provider eligibility and ephemeral network/presence state are represented too similarly.

**Correct root fix:** Workforce owns suspension/absence/work-window; DSH owns online/offline/available/busy only. Eligibility composes them.

### P1 — RC-ACCREDITATION-PARALLEL-AUTHORITY

**Proven pattern:** Workforce operational accreditation and DSH mutable accreditation-like status can both affect eligibility.

**Decision:** Workforce is canonical. DSH mutable duplicate authority must be removed.

### P2 — RC-GOVERNANCE-AUTHORITY-DRIFT

**Proven pattern:** product-truth/governance documents can lag behind live code or describe old ownership/route assumptions. Workforce's expanded responsibility is not always reflected by one mechanically enforced authority model.

**Correct root fix:** one machine-readable authority registry with mechanically checked human docs/contracts.

### P2 — RC-ORDER-ACTOR-PROVENANCE

**Proven:** some order-event writers can lose actor provenance despite a trusted actor being available.

**Execution evidence:** prior GitHub Actions run `31908535848` passed PostgreSQL setup/migrations/writer inventory/DB guard and service hardening, then failed at `Compile and test all DSH backend consumers`. Subsequent OpenAPI/generated verification, full tests/static checks, captain client smoke, final DB reproof and governed commit were skipped.

**Conclusion:** the finding is real; the implementation is not closed and cannot be treated as integrated runtime behavior merely because its workflow/script exists.

## 4. Canonical operational models

### 4.1 BTHWANI captain activation and collateral

Correct lifecycle:

`identity/provider ready`
→ `WLT guarantee funded >= activation baseline`
→ `BTHWANI captain activated`
→ `prepaid eligibility can proceed without reservation`
→ `COD/Mixed evaluates exact cash leg against effective collateral and open custody`

The guarantee is a restricted financial position, not the same as spendable wallet balance.

A control-plane policy defines the minimum/opening requirement. The captain wallet UI must expose the position transparently without letting presentation fields become authority.

### 4.2 COD acceptance

For a cash leg `C`:

1. DSH obtains current canonical PaymentAllocation.
2. Composite eligibility proves Workforce/DSH/fleet/scope/presence constraints.
3. WLT proves `openCustody + C <= effectiveCollateral` and settlement not overdue.
4. WLT creates an idempotent exposure reservation for `C`.
5. DSH may create/accept governed assignment only under the same decision/correlation.
6. On actual cash collection, WLT records custody for the collected cash amount.
7. Exposure and custody transitions remain separate and auditable.
8. Settlement/reconciliation closes custody, not merely the reservation.

### 4.3 Mixed payment

Mixed is not a special fuzzy state. It is an exact allocation:

`walletLeg > 0`
`cashLeg > 0`
`walletLeg + cashLeg = payable`

The wallet leg follows wallet debit/refund lineage. The cash leg follows the same exposure/custody rules as COD. Any implementation that only checks `paymentMethod == COD` is structurally insufficient.

### 4.4 External official wallets/banks

The WLT external-wallet-switch target architecture establishes external providers as funding rails into BTHWANI Wallet. Therefore:

external provider → verified funding transaction → WLT ledger/top-up → BTHWANI Wallet

They do not become a parallel order-payment authority. UI may show provider choices during top-up, not a fourth checkout tender truth.

The same principle applies to captain wallet top-up: official providers fund the captain's BTHWANI wallet/eligible guarantee funding workflow according to WLT policy; the provider itself does not own dispatch eligibility.

### 4.5 Partner/store delivery

Customer experience still offers COD, BTHWANI Wallet and Mixed.

But financial responsibility is:

customer tender → WLT canonical allocation → store settlement counterparty

If a store courier physically collects cash, WLT/DSH can record that person as store sub-custodian for evidence and reconciliation. It must not create a BTHWANI captain commission, BTHWANI guarantee exposure, or personal BTHWANI captain debt by reuse of a legacy collector type.

The store owns its employment/payroll decision. A monthly-salary store employee assigned to delivery has no per-delivery BTHWANI entitlement. Customer delivery fee remains in store economics, subject to the partner/platform commercial contract.

### 4.6 Store-courier optional guarantee

A store may require its own courier guarantee. Under the resolved decision, BTHWANI must not hold that money inside WLT merely because the platform provides UI. The platform can record requirement/status/evidence without representing it as BTHWANI money.

Any future decision to make BTHWANI custodian would be a new regulated/contractual financial product and is outside this package.

### 4.7 Penalties

Correct flow:

immutable incident facts/evidence in Workforce/Operations
→ operator selects versioned `penaltyPolicyId`
→ WLT loads canonical policy/version
→ WLT derives/approves monetary amount
→ WLT ledger transaction or receivable
→ Workforce receives reference/result only

Caller-proposed monetary amount is removed as authority.

### 4.8 Refund

Refund target and amount derive from immutable original tender/ledger lineage, not a mutable request enum.

For wallet + cash Mixed after cash collection, wallet leg returns to wallet and cash leg defaults to client BTHWANI Wallet unless a real cash-refund event is executed and evidenced. No generic manual refund source can override lineage.

## 5. Captain eligibility target

One conceptual primitive:

`EvaluateCaptainEligibility(captainActorId, orderId, purpose, evaluatedAt)`

must compose:

- trusted actor/order/fulfillment context;
- DSH primary fleet affiliation and partner membership where applicable;
- Workforce provider active state, suspension/absence, operational accreditation, service-area/store/shift scope and work window;
- DSH ephemeral dispatch presence/current assignment conflicts/capacity;
- WLT general financial eligibility and exact COD/Mixed cash-leg eligibility.

It returns an auditable decision with reason codes and source decision references/versions.

No UI computes the decision. No local cache becomes a write authority.

## 6. Cross-surface consequences

### app-client

Must show only the three checkout methods and exact split behavior. External official wallets appear under wallet top-up/funding, not as a fourth payment method. Refund status must reflect canonical lineage.

### app-captain

Must show BTHWANI/PARTNER mode under the actor's canonical affiliation; BTHWANI financial wallet must expose guarantee/custody/exposure/debt/eligibility without confusing spendable funds with protected collateral. Partner mode must not display or mutate BTHWANI guarantee/commission for store-owned obligations.

### app-partner

Must manage partner courier people/memberships/scopes/readiness/assignment/performance, permitted store-owned guarantee requirement/evidence, compensation configuration, cash custody/settlement visibility and incidents. It must not maintain a parallel courier identity using free-text name/phone settings.

### control-panel

Sovereign platform/Finance sections own BTHWANI collateral policy and penalty policy catalog. Operations applies policy/reference and operational actions. Financial effects remain WLT governed. Partner/store financial views distinguish platform liability from store liability.

## 7. Known dangerous implementation patterns to eliminate

The final implementation must inventory and remove every equivalent of:

- authoritative financial amount in Workforce/DSH;
- `PaymentMethodOfficialWallet` as checkout authority;
- COD protection conditional on method name rather than cash allocation;
- `financialGuarantee*` authority outside WLT;
- duplicate `accreditation_status` authority;
- `storeCourierId` crossing an actor boundary without resolution;
- Store IDs under branch identifiers;
- free-text courier identity in legacy settings;
- caller-authoritative partner gross settlement;
- partner courier routed through BTHWANI captain commission/collateral/debt;
- caller-authoritative penalty amount;
- caller-authoritative refund source when original lineage exists;
- ignored WLT errors after operational commits;
- duplicate local eligibility engines/filters;
- stale compatibility/fallback routes preserving old truth.

## 8. Verification conclusion

The requested branch integrations are real, but the architecture described here is not implemented merely by those merges. The finance branch was explicitly diagnosis-only. The actor-provenance branch's governed execution failed before full consumer verification/commit. Therefore the only defensible package-level status is:

`DIAGNOSIS = CLOSED`

`DECISION_REQUIRED = 0`

`IMPLEMENTATION = OPEN`

`CLEANUP = OPEN`

`FINAL_E2E_CLOSURE = OPEN`
