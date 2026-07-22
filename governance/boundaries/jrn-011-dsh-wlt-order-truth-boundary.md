# JRN-011 — DSH/WLT Order Truth Boundary

Status: `ACTIVE_CANONICAL`

## DSH owns

- The immutable order identity, `orderNumber`, tenant/client/store linkage and `correlationId`.
- The immutable item, pricing-reference, address and fulfillment snapshots copied from the accepted Checkout Intent.
- The operational order state, `allowedActions`, version and order event timeline.
- The read-only projection of payment state and the opaque WLT session/reference identifiers.
- Creation idempotency, event outbox, readback and tenant/actor isolation.

## WLT owns

- Payment session execution and provider interaction.
- Wallet debit/credit, cash custody financial truth, refund, settlement and reconciliation.
- The authoritative financial state and financial event sequence.

## Crossing rule

DSH may create an order only after the Checkout Intent records an eligible WLT projection. DSH copies the opaque payment reference and current projection into the order snapshot, emits `order.created`, and never calls a wallet mutation during order creation. Later payment changes enter DSH only as verified WLT events and update projection fields idempotently.

## Forbidden

- Recomputing payment success from an HTTP response or UI state.
- Storing wallet balance, ledger entries, refund amount or settlement result in `dsh_orders`.
- Letting a surface submit or override `paymentStatus`, `totalMinorUnits`, `currency`, `clientId`, `storeId`, `tenantId`, `orderNumber` or `correlationId`.
- Publishing an order event outside the transaction that creates or changes the operational order fact.

## Failure and reconciliation

An unavailable WLT read does not erase the last verified projection. The API returns a `partial` payment projection with staleness metadata. Outbox rows remain retryable with bounded attempts, next-attempt scheduling and an operator-visible dead-letter state. No retry may create a second order for the same Checkout Intent.
