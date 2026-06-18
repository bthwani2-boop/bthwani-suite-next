# DSH / WLT Financial Boundary

## DSH Owns

- stores
- catalog
- cart
- checkout intent
- order lifecycle
- delivery lifecycle

## WLT Owns

- wallet
- payment session
- transaction
- refund
- settlement
- payout
- ledger
- reconciliation
- financial audit

## Forbidden Inside DSH

- wallet balance calculation
- payment confirmation
- refund execution
- settlement creation
- commission finalization
- ledger mutation
- payout management

## Allowed Inside DSH

- paymentSessionId
- paymentStatus
- financialReference
