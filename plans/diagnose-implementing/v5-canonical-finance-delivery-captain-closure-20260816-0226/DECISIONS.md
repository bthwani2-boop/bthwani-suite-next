# Binding Decisions — Canonical Finance / Delivery / Captain Closure

## Decision status

`DECISION_REQUIRED = 0`

The user explicitly stated: any previously asked decision not separately answered is accepted at the recommended option. Later explicit clarifications override an older recommendation where they conflict.

These decisions are execution authority for this package. They must not be re-opened as implementation convenience choices.

---

## D01 — Single canonical authority per truth

**Decision:** one authoritative owner only.

- Identity: authentication, sessions, principal, trusted actor context.
- Workforce: person/provider lifecycle, non-financial readiness, operational accreditation, employment/provider suspension, planned absence, work scopes and windows.
- DSH: stores, real branches, fleet primary affiliation, partner store memberships, order, fulfillment, dispatch, ephemeral dispatch presence.
- WLT: all authoritative monetary facts and financial decisions.

No writable monetary projection is permitted in Workforce or DSH after cutover.

## D02 — BTHWANI captain guarantee is a real WLT product

**Decision:** the BTHWANI captain pays real money as opening/minimum collateral. It is not a Workforce status field and not a generic wallet balance alias.

WLT must model an explicit restricted `CaptainGuaranteePosition` (or equivalent precise name) with funding, active/restricted balance, release, setoff/forfeiture where policy permits, refund/offboarding, reconciliation, and immutable ledger lineage.

Workforce may consume only a non-authoritative decision/reference such as `financialEligibility` + `decisionReference`.

## D03 — Baseline collateral and activation

**Decision:** platform governance defines the minimum/opening collateral required to activate a BTHWANI captain.

The threshold is versioned financial policy owned by WLT/platform finance governance, not a hard-coded app constant and not a Workforce amount.

## D04 — Prepaid versus COD collateral usage

**Decision:** prepaid-only orders do **not** reserve collateral.

COD and Mixed orders reserve only the actual cash-on-delivery leg. The payment-method enum cannot determine the amount; canonical numeric allocation does.

Mandatory invariant:

`outstandingCashCustody + newCashExposure <= effectiveCollateral`

If this invariant is false, COD/Mixed assignment or acceptance fails closed.

## D05 — Low collateral after activation

**Decision:** a captain who drops below the COD-safe required level becomes financially ineligible for COD/Mixed. Prepaid work may remain eligible if all non-financial gates pass and platform activation policy does not require a separate hard suspension.

The system must represent this as a financial eligibility decision, not by corrupting dispatch presence or Workforce status.

## D06 — Captain collateral withdrawal/release

**Decision:** there is no unrestricted direct withdrawal from the protected guarantee position.

The platform control plane defines the protected minimum. A captain may request release/settlement of excess only if WLT proves after-release collateral remains compliant and there is no overdue cash custody, debt, hold, unresolved liability, or other blocking financial obligation.

Offboarding can refund the releasable remainder after all obligations close.

## D07 — Guarantee setoff

**Decision:** guarantee funds may satisfy only a final, proven, policy-authorized liability such as COD shortage, proven loss/fraud liability, or a penalty policy that explicitly permits setoff.

Required: maker/checker where applicable, immutable reason/evidence, actor/correlation/idempotency, ledger lineage, and audit. Arbitrary Operations debit is forbidden.

## D08 — COD exposure and cash custody are separate truths

**Decision:** collateral/exposure controls whether new cash risk may be accepted. Cash custody records cash actually collected and still owed/remittable.

Finalizing/releasing an exposure reservation must never erase or substitute for open cash custody.

Every collected cash leg opens or increases a custody obligation until governed settlement/reconciliation closes it.

## D09 — Rolling COD settlement

**Decision:** exposure is rolling.

New COD/Mixed cash exposure is blocked if the captain is insufficiently collateralized or if settlement is overdue. Mandatory settlement closure also exists at shift/day boundaries according to versioned policy.

Captain wallet surfaces must clearly show at least effective collateral, protected minimum, available excess, reserved exposure, open cash custody, debts/holds, settlement deadline/status, and resulting COD eligibility.

## D10 — Exactly three checkout payment choices

**Decision:** customer checkout has exactly:

1. COD / cash on delivery.
2. BTHWANI Wallet.
3. Mixed = BTHWANI Wallet + cash on delivery.

`official_wallet` is removed as an order-payment method.

Official banks/e-wallets/payment providers are external funding rails used to top up the BTHWANI Wallet. They do not become a parallel internal spending authority.

This aligns checkout with `services/wlt/WLT_EXTERNAL_WALLET_SWITCH_ARCHITECTURE.md`.

## D11 — Canonical numeric tender allocation

**Decision:** financial logic uses a persisted canonical `PaymentAllocation` (exact name may vary but semantics may not) rather than method-name branching.

At minimum:

- `walletAmountMinorUnits`
- `cashOnDeliveryAmountMinorUnits`
- any externally funded top-up is completed before order spending and therefore is not a fourth order leg.

Invariant:

`walletAmountMinorUnits + cashOnDeliveryAmountMinorUnits = orderPayableMinorUnits`

COD: wallet=0, cash=total.
Wallet: wallet=total, cash=0.
Mixed: both >0.

All exposure, custody, refund, settlement, and receipt logic consumes the persisted allocation.

## D12 — Store delivery offers the same three payment choices

**Decision:** `partner_delivery`/store delivery exposes COD, BTHWANI Wallet, and Mixed to the customer, using the same canonical allocation semantics.

The financial counterparty changes; the meaning of customer tender does not.

## D13 — Store is the primary settlement counterparty for store delivery

**Decision:** for partner/store delivery, the store is financially accountable to BTHWANI settlement. The store courier may be recorded as a sub-custodian/person who physically received cash, but that must not create BTHWANI captain debt, BTHWANI captain commission, or consume BTHWANI captain collateral.

## D14 — Store-courier guarantee remains store responsibility

**Decision:** if a store chooses to require collateral/guarantee from its courier, that obligation remains the store's responsibility and must not silently turn BTHWANI into custodian of employee guarantee funds.

The platform may manage non-financial requirement/status/evidence for the store if useful, but it must not represent such money as a BTHWANI WLT balance/asset/liability without a future explicit custodial product and contract.

## D15 — Store-courier compensation remains store responsibility

**Decision:** BTHWANI is not the payer or canonical payroll ledger for a store courier merely because app-partner configures the courier.

The store may choose its own compensation arrangement. Platform UI may record operational configuration/projection when needed, but it must be unmistakably store-owned and must not create BTHWANI financial liability.

## D16 — Monthly salary store-courier semantics

**Decision:** when the courier is an existing store employee paid a monthly salary, the customer delivery fee is economically attributable to the store settlement model; the courier has **no per-delivery BTHWANI financial entitlement**.

If a store later selects per-delivery compensation, that is a separate store-owned compensation rule. Monthly salary accrual, if represented by the platform, is proportional by effective dates with explicit rounding policy and is not attendance-derived unless a real canonical attendance source exists.

## D17 — Store delivery fee and partner settlement

**Decision:** store-delivery fee belongs in the store's gross economic settlement, subject to the canonical partner/platform contract and fees. Courier compensation is a separate store expense and must never be assumed equal to the customer delivery fee.

WLT must derive/verify settlement amounts from canonical order/quote/tender evidence rather than trust a caller-supplied authoritative gross amount.

## D18 — Penalty monetary policy

**Decision:** platform Finance/sovereign control plane owns a versioned catalog of penalty policies and monetary values/bounds in WLT.

Operations selects `penaltyPolicyId`/version against immutable incident facts/evidence. Workforce does not send an authoritative amount. WLT derives and posts the monetary effect.

For genuinely discretionary policies, any amount selection remains within WLT Finance Control with policy bounds, mandatory reason/evidence, maker/checker, immutable decision, and no Workforce amount authority.

## D19 — Insufficient balance for a penalty/liability

**Decision:** create a canonical WLT receivable/debt. Do not make spendable wallet balance negative.

Collection may occur from future earnings or governed guarantee setoff only where the policy permits it. Eligibility restrictions are derived from WLT policy/decision.

## D20 — Refund funding lineage

**Decision:** refund follows exact original funding lineage.

- Wallet-funded leg returns to BTHWANI Wallet.
- If an external rail has a true captured transaction that requires same-rail reversal, reversal targets that original rail/transaction.
- Cash already collected defaults to BTHWANI Wallet refund unless a real cash refund is executed and evidenced.

Caller-supplied `fundsSource` is not authoritative. Original ledger/tender lineage is.

## D21 — Exact reversal dimensions

**Decision:** reversals bind to the original transaction/ledger entry and original dimensions. No reconstruction from mutable caller fields is accepted where immutable financial lineage exists.

## D22 — Primary fleet affiliation is exclusive

**Decision:** a captain has one primary dispatch affiliation at a time: `BTHWANI XOR PARTNER`.

When primary affiliation is PARTNER, the person may have memberships in multiple partner stores if the domain requires it. Memberships do not replace the primary affiliation truth.

Transfers between BTHWANI and PARTNER are explicit lifecycle transitions with audit and conflict checks.

## D23 — Partner courier execution surface

**Decision:** the personal delivery execution surface is `app-captain`, with governed mode/authority according to BTHWANI or PARTNER affiliation.

`app-partner` manages the store's courier/fleet functions: people/team, memberships, readiness, coverage/scopes, assignment, performance, store-owned collateral requirement/evidence, compensation configuration, cash custody/settlement visibility, incidents, and suspension controls allowed to the store.

A shared merchant session must not impersonate an individual courier.

## D24 — Canonical provider/person profile

**Decision:** Workforce remains canonical for the person/provider profile and non-financial readiness, with explicit employer/authority scope. A PARTNER/STORE-scoped provider is not thereby a BTHWANI employee.

DSH owns dispatch/fleet affiliation and store memberships.

## D25 — Non-reducible platform safety baseline

**Decision:** stores may add stricter requirements but may not remove the platform baseline for identity/KYC/account/security and any mandatory platform safety controls.

A partner courier need not inherit every internal BTHWANI employment policy, but the platform baseline is universal.

## D26 — Operational accreditation owner

**Decision:** Workforce `operationsAccreditationStatus` (or renamed canonical equivalent) is the single operational accreditation truth.

Mutable duplicate DSH `accreditation_status` authority must be removed. DSH may consume the Workforce decision only.

## D27 — Availability semantics split

**Decision:** Workforce owns employment/provider suspension, planned absence, leave, work windows and non-financial operational gate. DSH owns ephemeral dispatch presence such as online/offline/available/busy.

A Workforce suspension is not a second mutable DSH presence status. Composite eligibility joins the two truths.

## D28 — One captain eligibility primitive

**Decision:** all governed captain selection/transition paths use the same canonical evaluation semantics:

- candidate discovery;
- capacity forecast;
- manual assignment;
- automatic assignment;
- reassignment;
- captain inbox/offer visibility where governed;
- acceptance;
- financial transition gates.

Writes that create/accept/reassign financial or operational obligation query current authorities synchronously and fail closed when required authority is unavailable.

High-volume previews may use a short-lived, versioned decision token containing decision ID, source versions, evaluatedAt, expiresAt and constraints; expired/unverifiable tokens do not authorize writes.

## D29 — Eligibility composition

**Decision:** the composite decision must include the relevant order/fulfillment truth, primary fleet affiliation/membership, Workforce active/non-suspended/accredited/scoped/work-window truth, DSH current dispatch presence/conflicts/capacity, and WLT financial/COD eligibility.

Service-area authorization from Workforce scopes must govern candidate discovery, capacity and assignment; it is not a UI filter.

## D30 — Explicit identifier semantics

**Decision:** authority boundaries use semantically explicit identifiers such as:

- `captainActorId`
- `captainMembershipId`
- `workforcePersonId`
- `partnerId`
- `storeId`
- `branchId`

A membership ID may never be passed to an API expecting actor ID. A store ID may never be stored under a branch ID field. Generic `id: string` across authority boundaries is forbidden where semantics can be confused.

## D31 — Canonical StoreBranch

**Decision:** because the system surfaces a branch concept, branch identity must be a real canonical entity with its own `branchId` and parent `storeId`, location, hours, status and relevant service-area/inventory/fleet links.

Using Store IDs in `selectedBranchIds` or equivalent fields is forbidden after cutover.

## D32 — Distributed financial mutations are not best-effort

**Decision:** an operational transition that requires a financial obligation cannot silently commit while the financial transition fails and is ignored.

Use an explicit durable state machine/outbox/saga/transactional boundary with idempotency, correlation, retries, terminal failure/recovery state and reconciliation. `_ = financialCall(...)` or equivalent ignored errors are forbidden on governed financial paths.

## D33 — Actor provenance

**Decision:** `actorId` remains the canonical provenance identity for governed order events when a trusted actor exists. Operator views may expose it where authorized; client/partner surfaces must not leak internal actor identity merely because it is stored canonically.

Historical facts that cannot be proven must remain unknown; migrations may not fabricate provenance.

The previous implementation attempt is still OPEN because its CI run failed before consumer/OpenAPI/full verification and final commit.

## D34 — Authority registry and governance

**Decision:** create one machine-readable authority registry for canonical truth ownership, writers, allowed projections, identifiers and critical invariants. Human Product Truth/governance docs must be validated/generated against it or otherwise mechanically checked for drift.

Stale governance text is not execution truth.

## D35 — Migration and cleanup policy

**Decision:** applied migrations are not rewritten. Use forward-only corrective migrations.

After cutover, obsolete writable sources, compatibility routes, fallback adapters, DTOs, schema fields, duplicate calculations, generated clients, tests, scripts, files, folders, references and governance text are deleted. They are not retained as a safety fallback.

## D36 — Fail-closed closure rule

**Decision:** no component may claim DONE based on unit-local success. Closure requires one final candidate SHA with full cross-authority runtime evidence and adversarial inventory proving no parallel writer/source remains.
