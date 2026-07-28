# JRN-014 — DSH/WLT dispatch boundary

## Ownership

- **DSH owns** assignment eligibility, captain accreditation projection, availability, service-area scope, active capacity, offer deadline, assignment state, delivery state, cancellation, reassignment, location readback, and immutable dispatch decisions.
- **Workforce owns** the human profile, employment state, vehicle and license documents. DSH may consume or synchronize only the operational projection required for dispatch.
- **Identity owns** authentication, actor identity, roles, sessions, and surface access.
- **WLT owns** balances, COD liability, commissions, earnings, settlement, payout, and all monetary ledger entries.

## Allowed references

DSH may persist actor identifiers, order identifiers, assignment identifiers, service-area identifiers, and non-financial operational metadata. DSH may expose an order/assignment reference to WLT after a financial event owned by WLT becomes relevant.

## Forbidden mutations

The dispatch domain, HTTP handlers, database migration, frontend adapters, and operator/captain surfaces must never:

- credit or debit a wallet;
- calculate or persist captain earnings as financial truth;
- create a settlement or payout;
- change COD liability;
- infer a monetary value when WLT is unavailable;
- present a local financial mutation as successful.

## Failure behavior

A WLT outage must not corrupt assignment truth. Dispatch remains operationally readable. Any WLT-owned financial projection is shown as unavailable or stale and is recovered through WLT-owned reconciliation. No DSH retry may duplicate a WLT ledger mutation.

## Audit

Operational actions are recorded in `dsh_dispatch_decisions`. Financial audit remains exclusively in WLT. Correlation uses identifiers only; no ledger payload is copied into DSH.
