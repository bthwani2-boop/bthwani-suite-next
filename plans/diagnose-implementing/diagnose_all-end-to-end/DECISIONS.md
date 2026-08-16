# Binding Decisions — diagnose_all-end-to-end

## Status and precedence

`DECISION_REQUIRED = 0`

This is the single merged decision register for the two source packages.

Precedence:

1. later explicit user decisions;
2. this reconciled register;
3. older package recommendations/open questions only where not superseded.

The earlier finance package contained D01–D20. The later closure package expanded/reconciled them into D01–D36. No earlier resolved product outcome is intentionally dropped; conflicts are explicitly reconciled below.

## D01 — One canonical authority per durable truth

- Identity owns authentication/session/principal/trusted actor context.
- Workforce owns person/provider lifecycle and non-financial readiness/accreditation/suspension/absence/work scopes/windows.
- DSH owns store/branch/order/fulfillment, fleet primary affiliation, partner memberships, dispatch and ephemeral presence/capacity.
- WLT owns every authoritative monetary fact and financial decision.

No writable parallel source remains after cutover.

## D02 — BTHWANI captain financial product

BTHWANI captain uses one coherent WLT-owned captain financial account/wallet experience. Within WLT, protected collateral/guarantee must be represented as an explicit restricted financial position with separate semantics from spendable funds; it is not a second independently authoritative wallet and not a Workforce field.

Required lifecycle includes funding, active/restricted amount, protected minimum, releasable excess, reservation exposure, setoff where policy allows, offboarding release/refund, reconciliation and immutable ledger lineage.

## D03 — Opening/baseline collateral required for activation

Sovereign Platform/Finance governance defines the versioned minimum/opening collateral required to activate a BTHWANI captain.

It is WLT-owned policy, not a hard-coded app constant and not a Workforce money amount.

## D04 — Prepaid versus cash-bearing collateral usage

Fully prepaid orders create no COD exposure reservation.

COD and Mixed reserve only the exact cash-on-delivery leg from canonical numeric allocation.

Mandatory invariant:

`openCashCustody + proposedNewCashExposure <= effectiveCollateral`

If false, COD/Mixed assignment/acceptance fails closed.

## D05 — Low collateral after activation

After activation, insufficient COD-safe collateral makes the captain financially ineligible for COD/Mixed cash-bearing work. Fully prepaid BTHWANI Wallet work may remain eligible when all non-financial gates pass.

This is a WLT financial eligibility result, not a fake DSH presence state or Workforce suspension.

## D06 — Protected minimum and excess release

Protected minimum is not directly withdrawable.

Captain may request governed release/settlement only for safe excess after WLT accounts for active reservations, open custody, debt, holds and unresolved liabilities and proves post-release compliance.

Offboarding may release the provable remainder only after obligations close.

## D07 — Guarantee/collateral setoff

Restricted guarantee may satisfy only a final, proven, policy-authorized liability such as COD shortage, proven loss/fraud liability, or a penalty policy explicitly allowing setoff.

Require reason/evidence, actor/correlation/idempotency, immutable lineage and maker/checker where applicable. Arbitrary Operations debit is forbidden.

## D08 — Exposure and cash custody are distinct

Collateral exposure controls permission to accept new cash risk.

Cash custody records physical cash actually collected and still owed/remittable.

Releasing/finalizing exposure never silently means custody was settled.

## D09 — Rolling COD custody/settlement

New COD/Mixed cash exposure is blocked when collateral is insufficient or settlement/custody is overdue according to versioned policy.

Mandatory shift/day boundary settlement/closure exists where policy requires it.

Captain surfaces must clearly expose effective collateral, protected minimum, releasable excess, reserved exposure, open cash custody, debts/holds, settlement status/deadline and resulting COD eligibility.

## D10 — Exactly three checkout choices

Customer checkout exposes exactly:

1. COD / cash on delivery;
2. BTHWANI Wallet;
3. Mixed = BTHWANI Wallet + cash on delivery.

`official_wallet` is not a fourth order-payment authority.

## D11 — Official banks/e-wallets/providers are funding rails

External official providers are used to top up/fund BTHWANI Wallet through governed WLT Cash-In evidence, idempotency and reconciliation.

This applies to customer and captain funding flows where policy permits.

The external provider never becomes an independent internal spending/dispatch authority.

## D12 — Canonical persisted PaymentAllocation

Financial logic uses one persisted server-owned numeric allocation rather than method-name branching.

At minimum:

- `walletAmountMinorUnits`
- `cashOnDeliveryAmountMinorUnits`
- `orderPayableMinorUnits`
- currency and immutable pricing/policy references.

Invariant:

`walletAmountMinorUnits + cashOnDeliveryAmountMinorUnits = orderPayableMinorUnits`

COD: wallet=0/cash=total; Wallet: wallet=total/cash=0; Mixed: both >0.

All exposure, custody, refund and settlement logic consumes this allocation.

## D13 — Store delivery uses the same three customer choices

Partner/store delivery exposes COD, BTHWANI Wallet and Mixed with the same allocation semantics. The financial counterparty changes; customer tender meaning does not.

## D14 — Store is settlement counterparty for store delivery

The store is financially accountable to BTHWANI settlement for store delivery.

The store courier can be recorded as a sub-custodian/person who physically received cash, but that must not create BTHWANI captain collateral, commission, debt, payout or earning semantics.

## D15 — Store-courier collateral remains store responsibility

If a store requires collateral/guarantee from its courier, it remains store-owned/off-platform responsibility under the current product boundary.

The platform may record non-financial requirement/status/evidence when useful but must not represent the amount as BTHWANI/WLT money without a future explicit custodial financial product/contract.

## D16 — Store-courier compensation/payroll remains store responsibility

BTHWANI is not the payer or canonical payroll ledger for a store courier merely because app-partner manages the courier.

The store owns employment, salary and compensation arrangements. Platform UI may record clearly store-owned operational configuration/projection where useful but must not create BTHWANI financial liability.

This later explicit decision supersedes the earlier package suggestion that store-selected per-delivery compensation could automatically become a WLT-canonical store-funded earning product.

## D17 — Monthly salary semantics

For a store employee paid monthly salary:

- delivery fee belongs to store economics/settlement;
- courier has no per-delivery BTHWANI entitlement;
- salary/payroll remains store responsibility.

If the platform ever represents salary accrual, it cannot invent attendance-derived financial truth without a real canonical attendance source and explicit product authority.

## D18 — Store delivery fee versus courier compensation

Store-delivery fee is part of the store's gross economic settlement subject to the canonical partner/platform contract.

Courier compensation is a separate store expense and is never assumed equal to the customer delivery fee.

WLT derives/verifies BTHWANI/store settlement from canonical order/quote/tender/contract evidence rather than trusting caller-supplied gross.

## D19 — Penalty monetary policy

Platform Finance/sovereign control defines a versioned catalog of penalty policies/amounts/bounds in WLT.

Operations selects `penaltyPolicyId`/version against immutable incident evidence. Workforce/Operations does not send an authoritative money amount.

WLT derives and posts the monetary effect.

For genuinely discretionary policies, any bounded amount selection remains within WLT Finance Control with mandatory reason/evidence and maker/checker where applicable.

## D20 — Insufficient balance for penalty/liability

Create a canonical WLT receivable/debt. Do not arbitrarily make spendable wallet balance negative.

Collection from future earnings or guarantee setoff is allowed only where versioned policy permits. Eligibility restrictions derive from WLT.

## D21 — Refund follows original funding lineage

- wallet-funded leg -> BTHWANI Wallet;
- a true external captured rail requiring same-rail reversal -> original rail/transaction when supported;
- collected cash -> BTHWANI Wallet by default unless a real governed evidenced cash refund occurs.

Caller `fundsSource` is not authoritative where immutable lineage exists.

## D22 — Exact reversal dimensions

Reversal/refund binds to the original transaction/ledger entry and original immutable dimensions. No reconstruction from mutable caller fields where canonical lineage exists.

## D23 — Primary fleet affiliation is exclusive

A captain has exactly one primary dispatch affiliation at a time:

`BTHWANI XOR PARTNER`

PARTNER affiliation may have multiple partner-store memberships where allowed. Transfer between primary affiliations is explicit, audited and conflict-checked.

## D24 — Partner courier execution/management surfaces

The personal delivery execution surface is `app-captain`, operating under canonical BTHWANI or PARTNER affiliation/mode.

`app-partner` manages the store's courier/fleet functions: people/team, memberships, readiness, coverage/scopes, assignment, performance, store-owned requirement/evidence/configuration, cash custody/settlement visibility, incidents and permitted suspension controls.

A shared merchant session must not impersonate an individual courier.

## D25 — Canonical person/provider profile

Workforce remains canonical for the person/provider profile and non-financial readiness with explicit employer/authority scope.

A PARTNER/STORE-scoped provider is not thereby a BTHWANI employee.

DSH owns dispatch/fleet affiliation and store memberships.

## D26 — Non-reducible platform safety baseline

Stores may add stricter requirements but may not remove platform identity/KYC/account/security and mandatory safety baseline controls.

## D27 — Operational accreditation owner

Workforce `operationsAccreditationStatus` or canonical renamed equivalent is the single general operational accreditation truth.

Mutable duplicate DSH `accreditation_status` authority must be removed. DSH consumes the Workforce decision only unless a distinctly named separate dispatch certification is explicitly proven.

## D28 — Availability semantics split

Workforce owns employment/provider suspension, planned absence, leave, work windows and durable non-financial operational gates.

DSH owns ephemeral dispatch presence: online/offline/available/busy/current conflict/capacity.

Composite eligibility joins them; neither copies the other's truth.

## D29 — One captain eligibility primitive

Candidate discovery, capacity, manual/automatic assignment, reassignment, inbox/offer visibility where governed, acceptance and financial transition gates use one canonical semantic composition.

Governed writes query current authorities synchronously and fail closed if required authority is unavailable.

High-volume preview may use short-lived versioned tokens with decision ID/source versions/evaluatedAt/expiresAt/constraints; expired or unverifiable tokens never authorize writes.

## D30 — Eligibility composition

Relevant composition includes:

- trusted actor/order/fulfillment context;
- primary fleet affiliation and required partner membership;
- Workforce active/non-suspended/accredited/scoped/work-window truth;
- DSH presence/conflicts/capacity;
- service-area authorization;
- WLT general financial and exact COD/Mixed cash eligibility.

Service-area authorization is an authority gate, not a UI filter.

## D31 — Explicit identifier semantics

Authority boundaries use semantically explicit identifiers/types such as:

- `captainActorId`
- `captainMembershipId`
- `workforcePersonId`
- `partnerId`
- `storeId`
- `branchId`

Membership ID may never be passed to an API expecting actor ID. Store/scope ID may never be stored as branch ID. Generic raw strings are forbidden where semantic confusion can cross authority boundaries.

## D32 — Canonical StoreBranch

Because the product exposes branch semantics, branch identity must be a real canonical entity with its own `branchId`, parent `storeId`, location, hours, status and relevant service-area/inventory/fleet links.

Using Store/Scope IDs in `selectedBranchIds` or equivalent is forbidden after cutover.

## D33 — Distributed financial mutations are not best-effort

An operational transition requiring a financial obligation cannot silently commit while the financial transition fails/gets ignored.

Use durable state-machine/outbox/saga/transactional boundaries with idempotency, correlation, retries, explicit recovery/terminal state and reconciliation.

Patterns such as `_ = financialCall(...)` or fire-and-forget required financial mutation are forbidden.

## D34 — Actor provenance

`actorId` is canonical provenance identity for governed order events when a trusted actor exists.

Operator views may expose it where authorized; client/partner surfaces must not leak internal actor identity merely because it is stored.

Historical facts that cannot be proven remain unknown; migrations may not fabricate provenance.

The prior implementation attempt remains OPEN because CI failed before consumer/OpenAPI/full verification and governed final commit.

## D35 — Machine-readable authority registry and governance

Create one machine-readable registry for canonical owners, allowed writers/projections, identifier semantics and critical invariants.

Human Product Truth/governance must be generated/validated/mechanically checked against it. Stale governance text is not runtime authority.

## D36 — Migration, cleanup and fail-closed closure

Applied migrations are not rewritten. Use forward-only corrective migrations.

After cutover, obsolete writable sources, compatibility routes/fallback adapters, DTOs, schema fields/tables, duplicate calculations, generated clients, tests, scripts, configs, files/folders and stale governance references are removed.

No unit-local success, merge, plan or partial workflow is DONE. Final closure requires one exact final candidate SHA with complete cross-authority runtime/data evidence, zero parallel writer/source, zero fallback authority, `DECISION_REQUIRED=0`, `BLOCKER=0`, `KNOWN_FINDING_UNCLASSIFIED=0`, and latest-`A` reconciliation.

## Decision status

`DECISION_REQUIRED = 0`

Implementation convenience may not silently reopen these decisions. A genuinely new contradiction outside this register must be surfaced explicitly before execution can cross that decision boundary.
