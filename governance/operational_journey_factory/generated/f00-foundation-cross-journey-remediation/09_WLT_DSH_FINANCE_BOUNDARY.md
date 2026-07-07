# 09 WLT DSH Finance Boundary

status: `LOCK_PASS`

## Finance Sovereignty Allocation

Wallet Services Hub (WLT) holds exclusive ownership over all financial transactions, states, and operations:

- Wallet balances & transactions
- Payments & refunds
- Commission calculations & disbursements
- COD (Cash on Delivery) settlements
- Financial Ledger records

## DSH Integration Constraints

Delivery Services Hub (DSH) is strictly a consumer of financial outcomes:

- DSH has no direct write or update access to WLT databases or states.
- DSH may only request a payment handoff (via WLT API `payment-sessions`).
- DSH stores only opaque financial references (e.g. `paymentSessionId` or transaction correlation IDs).
- DSH frontends/UIs display read-only projections of financial statuses provided by WLT adapters.
- DSH backends listen and react to WLT events (e.g., payment success/failure webhooks).

## Boundary Guard Checks

- `guard:wlt-financial-boundary` verified that no DSH code executes wallet mutations or direct ledger updates.
- DSH-to-WLT link calls are routed through the type-safe `wlt-api` adapter.
- Unit tests confirm that no payment credentials or secrets are leaked to the DSH frontend.
