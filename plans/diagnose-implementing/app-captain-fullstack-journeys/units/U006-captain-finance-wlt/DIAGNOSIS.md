# U006 — captain-finance-wlt

## Objective

Prove and close only remaining Captain financial gaps on current `BB` while keeping WLT the sole financial truth owner and preventing cross-Captain exposure or frontend/DSH financial calculation.

## Current diagnosis

The previous package contains a stale concrete gap: it says Captain commission lifecycle readback is missing. That is no longer true on `BB`.

Current `WltCaptainFinanceScreen` includes `ActorWalletPanel actorType="captain"`, `WltCaptainCodCustodyScreen`, `RepresentativeCommissionPanel actorType="captain"` and `PayoutDestinationPanel actorType="captain"`. `RepresentativeCommissionPanel` calls the generic own-commission API and renders the required lifecycle states (`pending`, `confirmed`, `settled`, `rejected`, `reversed`), source/policy information and `resolutionNote`. `commission.api.ts` resolves own commissions through `/dsh/captain/me/finance/commissions`.

On the backend, `representative_finance_routes.go` registers Captain self-service wallet, ledger, commissions, payout-request/destination and COD collect/remit routes. Self-service handlers derive actor identity from authenticated context before WLT reads; control-panel mutation routes are separate and permission protected.

Therefore the root task is **not** to implement another Captain commission list. U006 must prove that the current route/controller/backend/WLT chain is actor-scoped, contract-compatible, idempotent where it mutates COD/payout state, financially reconciled, and robust to errors/unknown results. It must also prove that no shared generic change accidentally leaks or changes field/partner semantics.

## Financial boundaries

- WLT owns wallet, ledger, COD financial liability, commission policy/calculation/lifecycle, payout financial state and adjustments.
- DSH may provide operational evidence and bounded authenticated proxy/readback; it cannot become a second financial ledger.
- Captain self-service is scoped to the authenticated Captain. Captain may request only currently authorized self-service payout/COD actions; commission state mutation remains operator/service controlled according to Product Truth.
- No caller-supplied authoritative commission amount, local aggregate earnings calculation or cross-Captain query is allowed.
- Error/offline/partial/unknown-result UI must not fabricate zero balance, settled commission, completed payout or remitted COD.

## Shared-code boundary

`RepresentativeCommissionPanel` and representative finance APIs are generic. They remain in Captain scope only as consumed by app-captain. If fixing a Captain-proven defect requires changing a generic contract/component/route, verification must cover every actual affected consumer. That does not authorize importing app-field or partner-only product work into this package.

## Closure rule

U006 requires candidate-bound DSH/WLT backend evidence, current Captain runtime/type evidence, actor-isolation negatives and finance reconciliation. Static existence of routes/panels is not financial closure and protected finance/product/release approval cannot be self-issued.
