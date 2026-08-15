# Deep Diagnosis — Finance, Wallets, COD, Captain, Partner Delivery

## 0. Diagnostic posture

This document is Derived Support for the V5 `PACKAGE.md`. Runtime/product truth is taken from the pinned repository candidate and explicit user decisions. Old plans are historical evidence only.

Pinned base at package creation:

- Integration target: `A`
- Base SHA: `bdbcb811ab2a0fe0cc4db6e4947d5ef741d2c5c7`
- Task branch: `task/v5-finance-delivery-canonical-truth-20260816-0214`

The diagnosis follows `TOP-DOWN DIAGNOSIS; BOTTOM-UP EVIDENCE` and treats lower technical findings as children of operational ownership/root-cause failures.

## 1. Canonical platform meaning

The financial and delivery platform must be modeled as one multi-surface system with explicit sovereign owners:

```text
Identity
  owns authenticated actor/principal/session/trusted context

Workforce
  owns workforce/provider lifecycle
  owns non-financial readiness/accreditation
  owns work scopes, service areas, shifts
  owns planned absence/suspension/operational evidence
  does NOT own money

DSH
  owns commerce/order/store/fulfillment
  owns fleet membership/affiliation
  owns dispatch presence/capacity/assignment lifecycle
  owns partner-delivery operational tasks
  does NOT own authoritative money

WLT
  owns every authoritative monetary fact
  owns internal wallets
  owns ledger/accounting
  owns cash-in/out evidence
  owns financial policies and monetary derivation
  owns COD exposure/collateral decision
  owns penalties monetary effect
  owns earnings/fees/commission/refund/settlement
  owns financial eligibility
```

A field may exist as a read-only projection outside its owner, but it cannot be independently writable or independently authoritative.

## 2. Customer checkout and payment methods

### 2.1 Resolved product model

The user-defined customer payment methods are exactly:

1. `COD` — cash on delivery.
2. `WALLET` — payment from internal Bthwani customer wallet.
3. `MIXED` — part internal wallet, part COD/cash.

This applies to both:

- `bthwani_delivery`
- `partner_delivery`

and the payment/financial beneficiary is derived from the fulfillment/order/store context, not from client calculations.

### 2.2 Current semantic drift

`services/dsh/backend/internal/checkout/checkout.go` currently defines:

- `cod`
- `wallet`
- `mixed`
- `official_wallet`

The fourth value conflicts with the resolved product model and the WLT architecture, where official wallets are external Cash-In rails used to fund an internal wallet. It therefore requires full usage inventory followed by removal/migration if no distinct product flow is proven.

### 2.3 PaymentAllocation is required

The current DSH `PricingSnapshot` carries:

- subtotal
- delivery fee
- discount
- total
- currency

This is necessary but insufficient for financial truth. A canonical PaymentAllocation must bind the governed total to funding/economic components, at minimum:

```text
order_id
currency
subtotal
delivery_fee
discount
platform_subsidy
internal_wallet_amount
external_official_wallet_amount   # when a future direct electronic checkout rail is explicitly supported
cash_amount
partner_payable components
platform fee/commission components
captain/store-courier delivery earning components where applicable
total
policy_version
pricing_snapshot_reference
```

Conservation must be mechanically enforced. The UI may display the result but never calculate the authoritative split.

## 3. BTHWANI captain — one wallet and collateral policy

### 3.1 One wallet, not a guarantee wallet plus earnings wallet

The user clarified that a BTHWANI captain pays/loads a real opening balance, typically around or above 30,000 YER, and that this balance qualifies the captain to work and especially to take COD orders.

The correct model is one internal WLT captain wallet. The ledger distinguishes purposes:

```text
CAPTAIN_OPENING_FUNDING
CAPTAIN_TOPUP
CAPTAIN_COD_RESERVE
CAPTAIN_COD_RELEASE
CAPTAIN_COD_DEBIT
CAPTAIN_DELIVERY_EARNING
CAPTAIN_PENALTY
CAPTAIN_PAYOUT_HOLD
CAPTAIN_PAYOUT_RELEASE
CAPTAIN_PAYOUT_COMPLETED
```

No second visible “guarantee account” is needed unless accounting/legal evidence later proves a distinct segregated asset is required.

### 3.2 Platform-configured protected financial floor

The sovereign Platform/Finance control plane defines a versioned WLT financial policy for BTHWANI captains, including a configured opening/minimum protected amount.

A captain can top up through the same WLT Cash-In mechanism as customers, using supported official electronic-wallet rails and authoritative provider evidence.

The settlement/withdrawable amount is server-derived. A safe conceptual formula is:

```text
ledger_balance
- pending
- payout_holds
- active_cod_reservations
- other enforceable debts/holds
- protected_minimum_floor
= maximum_settlement_eligible_excess
```

The exact accounting representation must be one WLT truth; the control panel must never type a “current available” balance.

### 3.3 Current Workforce defect

Workforce currently contains writable captain fields:

```text
FinancialGuaranteeMinorUnits
FinancialGuaranteeCurrency
FinancialGuaranteeStatus
FinancialGuaranteeReference
```

and exposes them through `CaptainActivationCorePatch` even though its own comment says monetary truth remains in WLT.

These fields are parallel monetary authority and must be removed from the live readiness/mutation model after a governed migration. Historical evidence may be archived if legally/audit required, but it must be explicitly non-authoritative.

## 4. BTHWANI COD — exposure, debit and financial closure

### 4.1 Order-specific exposure

A general minimum balance check is insufficient because concurrent COD orders can overcommit the same collateral. The order-specific rule is:

```text
PaymentAllocation.cash_amount
        ↓
WLT order/captain risk decision
        ↓
atomic reservation against captain wallet
        ↓
assignment/acceptance allowed only if reservation succeeds
```

For `MIXED`, only the actual cash component is reserved. Prepaid wallet components do not consume COD capacity.

### 4.2 Net financial settlement model

The user clarified that the captain charges/top-ups the internal wallet and that the COD amount is deducted automatically. This matches the target architecture:

- reserve cash exposure before/at governed assignment acceptance;
- on cancellation/reassignment before completion: release/retarget reservation exactly once;
- on successful delivery: convert reserved exposure to final WLT debit;
- captain keeps the physical cash collected from customer, while WLT debit settles the platform’s financial claim against the captain’s internal wallet;
- do not create a second remittance liability for the same economic amount.

This is safer for BTHWANI because platform recovery is collateral-backed rather than depending on later manual remittance from the captain.

### 4.3 Current lifecycle contradiction

Current WLT contains both reservation semantics and legacy custody/remittance semantics. `sovereign_cod.go` explicitly rejects legacy collection/remittance when a reservation exists, calling it a funded-wallet order. This is directionally compatible with net settlement but leaves cleanup/semantic debt.

More critically, current DSH accepted delivery proof executes:

```go
_, _ = s.wlt.FinalizeCodReservation(...)
```

The WLT error is discarded. This permits operational delivery success while required financial closure is failed/unknown.

This is a P0 fail-open financial handoff. The final design must use one of:

- synchronous atomic/confirmed WLT transition before final operational closure where feasible; or
- a durable outbox/saga state where operational status cannot be represented as financially closed until canonical WLT readback succeeds, with retry/reconciliation and visible exception state.

It must never silently ignore failure.

### 4.4 Current reservation trusts DSH amount

The current DSH WLT client sends `amountMinorUnits` and `currency` to WLT reservation. Even if DSH has a governed pricing snapshot, WLT financial truth should derive/verify the reservation amount against its canonical PaymentAllocation/payment session/order financial reference instead of trusting a cross-domain caller amount.

## 5. Financial eligibility vs order-specific COD capacity

Current WLT `dispatchfinancialeligibility` applies the strictest of:

- minimum dispatch balance
- minimum COD balance

and returns one universal short-lived decision.

This is structurally too coarse after the product decisions:

- general financial readiness/active wallet is one question;
- order-specific COD capacity for a specific `cash_amount` is another.

The target should separate:

```text
EvaluateCaptainFinancialReadiness(captain)
ReserveOrderCODExposure(captain, canonicalPaymentAllocation)
```

Critical assignment writes must use fresh authority/readback. Candidate discovery may use short-lived versioned decisions for scale, but no stale projection may grant a financial write.

## 6. Captain operational eligibility — one composition

The system currently splits captain eligibility across Workforce, DSH dispatch, DSH fleet and WLT. This creates contradictory paths.

The target composite decision must account for:

```text
Identity/trusted actor
DSH order/fulfillment/store/service area
DSH fleet primary affiliation
Workforce provider active/non-suspended state
Workforce accreditation
Workforce service-area/shift scopes
DSH dispatch presence/capacity/current assignment state
WLT financial readiness
WLT order-specific COD reservation when required
```

The same semantics must govern:

- candidate discovery
- capacity forecasting
- create assignment
- automatic assignment
- manual assignment
- reassignment
- captain inbox
- captain accept

A UI-side filter is not a security/authority boundary.

## 7. Service-area and capacity drift

The current DSH candidate query receives a `serviceAreaCode` and returns that value for candidates but does not prove the candidate has the same code in authoritative Workforce scopes. This creates false eligibility and false capacity.

Correct flow:

```text
order/store service area
    +
Workforce actor serviceAreaCodes
    +
other eligibility gates
    ↓
eligible candidate set
    ↓
capacity forecast derived from eligible candidate set
```

Capacity must never count every available dispatch profile in the operator context and label it scoped to the requested area.

## 8. Accreditation and availability authority

### 8.1 Accreditation

The user adopted the recommendation that Workforce owns general operational accreditation.

Current DSH dispatch profile also has mutable `accreditation_status`. This duplicate writer must be removed. If DSH requires a dispatch-specific certification in the future, it must be explicitly renamed and given a distinct business meaning/lifecycle; it cannot silently reuse “accreditation”.

### 8.2 Availability/suspension

Target separation:

**Workforce:**

- employment/provider active/suspended
- planned absence
- leave/work window
- non-financial readiness

**DSH Dispatch:**

- online
- offline
- available
- busy

A Workforce suspension makes eligibility false; it does not need to be copied as a second independently writable DSH presence state.

## 9. Fleet affiliation

The user explicitly decided that a captain cannot be simultaneously a BTHWANI and PARTNER primary dispatch actor.

Target invariant:

```text
primary_dispatch_affiliation ∈ {BTHWANI, PARTNER}
exactly one active value at a time
```

A PARTNER actor may have multiple store memberships if the product rules permit it. Moving between BTHWANI and PARTNER requires an explicit transfer lifecycle, not parallel active truth.

BTHWANI dispatch must enforce BTHWANI affiliation. Partner delivery must enforce an active partner/store membership for the target store.

## 10. Partner/store courier

### 10.1 Product meaning

The user wants store delivery capabilities inside the Partner app with clear, fit-for-purpose sections. It should provide the operational capabilities required to manage store delivery without copying the full BTHWANI captain product shape.

Minimum partner sections should cover, subject to exact UX design:

- delivery mode/status and store-level configuration;
- courier/team list;
- courier membership/activation state;
- assigned delivery tasks;
- current task status/tracking;
- proof/completion/exceptions;
- store-owned compensation mode/configuration if platform-managed;
- store financial readback for delivery proceeds/fees where relevant;
- no exposure to BTHWANI-only workforce/finance controls.

### 10.2 Identity defect

Current `PartnerDelivery.AssignCourier` uses one `storeCourierID` for two meanings:

1. it calls Workforce `ActivationReadiness(storeCourierID)`, which expects actor identity;
2. it persists the same value as `dsh_partner_delivery_tasks.store_courier_id`, which is membership identity.

Correct boundary:

```text
captainMembershipId
    ↓
DSH Fleet resolve active membership
    ↓
validate same store + PARTNER affiliation/status
    ↓
captainActorId
    ↓
Workforce readiness(captainActorId)
    ↓
persist captainMembershipId in partner delivery task
```

Identifiers must be explicit in DB columns, Go/TS types, OpenAPI, events and audit.

### 10.3 Financial responsibility

The user states that partner/store delivery is financially tied to the store and that platform responsibility for the store employee relationship is limited.

Resolved case:

**SALARIED store employee**

- delivery fee/payable belongs to store;
- courier gets no per-order WLT earning;
- monthly salary/payroll is store responsibility and should not be invented by Bthwani;
- platform may show task/activity records, not payroll truth.

Still-open product cone:

**PER-DELIVERY store courier**

The user has said the store may choose this model, but it remains to decide whether Bthwani WLT will actually create/pay/settle courier earnings or whether the store remains financially responsible and the platform only records a compensation rule/report. This must be explicit before implementation.

### 10.4 Optional store collateral

The user states a store may choose a collateral model for its own courier and that it must be linked to the store, not BTHWANI finance.

This cannot reuse the platform BTHWANI-captain policy. If platform-managed, it requires a store-scoped financial policy and liability model in WLT. If not platform-managed, no fake “balance” may be created in DSH/Partner UI.

## 11. Partner-delivery customer payment

Partner delivery must still show customer:

- COD
- Wallet
- Mixed

The financial flows differ from BTHWANI captain delivery:

### Wallet/prepaid

Customer wallet debit is WLT-owned; governed partner/store proceeds are credited/settled to partner financial position based on delivered order/payment policy.

### Mixed

WLT PaymentAllocation divides wallet vs cash and binds each portion to the proper party.

### COD

Cash is collected under the store/partner delivery responsibility. The platform must not create a BTHWANI captain collateral debit. Store/partner payable, platform fee/commission and any platform-managed store-courier earning must be derived from the same PaymentAllocation and delivered-order evidence.

The exact partner COD risk/settlement mechanics must be verified end-to-end before execution so the platform is never left with an uncollected fee or unsupported payable.

## 12. Penalties

### 12.1 Resolved product flow

The user defined:

1. Sovereign Platform section in control panel defines a catalog of penalties and values.
2. Operations chooses the applicable penalty type for a captain incident.
3. Finance/WLT performs the actual financial deduction.

Canonical interpretation:

```text
Platform control-plane UI
    ↓ writes governed versioned WLT penalty policy
PenaltyPolicyVersion
    ↓
Operations incident action references policy/version
    ↓
WLT loads pinned policy + incident facts
    ↓
derives authoritative amount
    ↓
posts canonical ledger transaction
```

Operations/Workforce must not send an authoritative amount.

### 12.2 Current defect

Workforce `CreateProviderIncidentInput` contains `ProposedPenaltyMinorUnits` + `Currency`.

WLT `PostInput` contains `AmountMinorUnits` + `Currency` and validates/post this caller value.

WLT current posting is otherwise improved compared with old diagnosis: it uses canonical double-entry and no longer directly mutates wallet balance. Therefore the old direct-write finding must be retired while the caller-amount authority defect remains open.

## 13. Refunds

Adopted target:

```text
refund follows funding lineage
```

- internal wallet amount -> customer internal wallet;
- direct electronic rail amount -> same rail when the rail supports authoritative refund and policy permits;
- cash amount already collected -> customer wallet by default;
- actual cash refund is allowed only as a real governed cash-refund transition with evidence/reconciliation.

Mixed refunds must be proportional/bound to original PaymentAllocation, not recomputed from the current payment-method label.

## 14. Settlement and withdrawal

Captain top-up from official wallet and captain settlement are separate flows:

**Cash-In:** external official wallet -> provider evidence -> WLT ledger -> internal wallet.

**Cash-Out/settlement:** captain requests amount/mode within WLT-derived eligibility -> WLT pins verified payout destination -> Finance executes governed external transfer -> evidence/readback/reconciliation -> canonical completion.

For BTHWANI captain, excess settlement must not weaken protected collateral or ignore active COD exposure, debt, holds, unresolved penalties or reconciliation cases.

## 15. Historical finance package — what survives and what does not

The historical `wlt-finance-wallet-multisurface` diagnosis is useful only as a search seed.

Current reproof already shows one old claim is obsolete:

- old claim: penalty path directly mutates `wlt_wallets`;
- current truth: penalty path uses canonical ledger and wallet projection trigger.

Other old claims (legacy ledger coexistence, daily-close behavior, promotion/commercial/pricing monetary controls, etc.) remain `NEEDS_REPROOF`, not automatically open defects.

This rule must apply to every historical package finding.

## 16. Failure/recovery requirements

Every material financial mutation must specify:

- trusted operator context;
- authenticated actor/role/scope;
- canonical source IDs;
- idempotency key;
- correlation ID;
- expected/current state;
- version/policy version;
- same-transaction local invariants;
- durable cross-service handoff when distributed;
- timeout/unknown-result behavior;
- retry policy;
- reconciliation/readback;
- compensating transition where valid;
- immutable audit/evidence.

Forbidden outcomes:

- operational success + unknown financial state hidden from users/operators;
- retry causing second debit/earning/refund;
- fallback to local balance/eligibility when WLT is unavailable;
- stale projection granting money-moving action;
- manual amount override “to fix” a failed flow.

## 17. Security/isolation requirements

Must adversarially test:

- wrong `operator_context_id`;
- wrong partner/store membership;
- actor ID vs membership ID substitution;
- wrong role applying/reversing penalty;
- partner attempting BTHWANI finance operations;
- BTHWANI captain appearing in partner-only dispatch and vice versa;
- IDOR on wallet/settlement/COD/penalty/partner-delivery records;
- replay with modified amount/actor/store/order;
- stale policy version;
- cross-store courier assignment;
- cross-currency operations;
- payout below protected floor;
- concurrent COD reservations exhausting same balance.

## 18. Cross-surface readback requirements

### app-client

- exactly three payment methods;
- correct PaymentAllocation summary without client arithmetic;
- payment/refund status canonical readback;
- correct fulfillment-mode semantics.

### app-captain

- one wallet view;
- opening/top-up state;
- available/protected/reserved/eligible-to-settle views derived from WLT;
- per-order COD reservation/readback;
- penalties/earnings/settlement lineage;
- no ability to edit financial master data.

### app-partner

- store-courier operational sections;
- store delivery task lifecycle;
- store financial readback;
- salary mode shows no courier per-order entitlement;
- any optional per-delivery/store-collateral features appear only after the product decision and canonical backend exist.

### control-panel

Separate clear authorities:

- Platform sovereign policy: penalty catalog, BTHWANI collateral/minimum policy, approved global finance rules;
- Operations: incident/penalty selection, non-financial captain operations, assignment oversight;
- Finance: WLT-owned financial master data, settlements, reconciliation, exceptions, ledger readback;
- no manual balance editing and no free-form authoritative monetary override.

## 19. Required cleanup principle

Execution is not complete when new canonical code is added. Completion requires deleting/repairing every superseded path down to line/file/folder level.

The package therefore treats cleanup as an implementation workstream, not post-project polish.

## 20. Current highest-leverage execution order

Subject to resolving only the three remaining product decisions in `DECISIONS.md`:

1. WLT monetary authority and policy cutover.
2. BTHWANI captain collateral/COD lifecycle and fail-closed financial completion.
3. Unified captain eligibility/scopes/fleet/accreditation/availability.
4. Partner membership->actor identity cutover.
5. Checkout three-method + PaymentAllocation + refund lineage cutover.
6. Partner courier financial boundary once remaining decisions are resolved.
7. Reprove and remove any remaining legacy ledger/daily-close parallel truth.
8. Cross-surface cutover and cleanup.
9. Governance/Product Truth/contracts/generated synchronization.
10. Re-rank lower `ORDER_ACTOR_PROVENANCE` work after higher roots are closed.
