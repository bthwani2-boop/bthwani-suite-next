# DSH/WLT Dispatch Boundary

Status: ACTIVE_CANONICAL

This domain decision refines the canonical platform model and the general product/contracts/data/security policies for dispatch-specific DSH/WLT ownership. It cannot override those higher/general authorities outside this domain.

## Ownership

- **DSH owns** assignment eligibility, captain accreditation projection, availability, service-area scope, active capacity, offer deadline, assignment state, delivery state, cancellation, reassignment, location readback, and immutable dispatch decisions.
- **Workforce owns** the human profile, employment state, vehicle and license documents. DSH may consume or synchronize only the operational projection required for dispatch.
- **Identity owns** authentication, actor identity, roles, sessions, and surface access.
- **WLT owns** balances, COD liability, commissions, earnings, settlement, payout, and all monetary ledger entries.

## Allowed references

DSH may persist actor identifiers, order identifiers, assignment identifiers, service-area identifiers, and non-financial operational metadata. DSH may expose an order/assignment reference to WLT after a financial event owned by WLT becomes relevant.

## Forbidden mutations

The dispatch domain, HTTP handlers, database migrations, frontend adapters, and operator/captain surfaces must never:

- credit or debit a wallet;
- calculate or persist captain earnings as financial truth;
- create a settlement or payout;
- change COD liability;
- infer a monetary value when WLT is unavailable;
- present a local financial mutation as successful.

## Failure behavior

A WLT outage must not corrupt assignment truth. Dispatch remains operationally readable. Any WLT-owned financial projection is shown as unavailable or stale and is recovered through WLT-owned reconciliation. No DSH retry may duplicate a WLT ledger mutation.

## Audit

Operational actions are recorded in the DSH-owned dispatch audit/decision model implemented by the current schema. Financial audit remains exclusively in WLT. Correlation crosses the boundary by stable identifiers and governed event/reference contracts, not by copying ledger truth into DSH.
