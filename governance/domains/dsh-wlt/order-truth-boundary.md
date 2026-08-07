# DSH/WLT Order Truth Boundary

Status: ACTIVE_CANONICAL

This domain decision refines the canonical platform model and the general product/contracts/data/security policies for order-specific DSH/WLT truth ownership. It cannot override those authorities outside this domain.

## DSH owns

- The immutable order identity, `orderNumber`, platform/operator/client/store linkage and `correlationId` according to the current contract.
- The immutable item, pricing-reference, address and fulfillment snapshots copied from the accepted checkout intent.
- The operational order state, `allowedActions`, version and order event timeline.
- A read-only projection of payment state and opaque WLT session/reference identifiers.
- Creation idempotency, event outbox, operational readback and actor/business-scope isolation.

## WLT owns

- Payment session execution and provider interaction.
- Wallet debit/credit, cash-custody financial truth, refund, settlement and reconciliation.
- Authoritative financial state and financial event sequence.

## Crossing rule

DSH may create an order only after the checkout intent has the financial eligibility/projection required by the current contract. DSH may copy opaque payment references and the permitted point-in-time projection into its operational snapshot, emit its owned operational event transactionally, and must not perform a wallet mutation as part of order creation. Later financial changes enter DSH only through the current verified WLT-owned contract/event boundary and update projections idempotently.

## Forbidden

- Recomputing payment success from an HTTP response or UI state.
- Storing wallet balance, ledger entries, refund truth or settlement truth as DSH-owned order truth.
- Letting a surface supply or override server-owned financial/order identity or trusted-scope fields as authorization truth.
- Publishing an operational order event outside the transaction/outbox discipline that owns the operational change.

## Failure and reconciliation

An unavailable WLT read must not fabricate or erase financial truth. DSH may expose the last verified bounded projection with explicit staleness/partial-state semantics when the current contract permits it. Outbox/retry processing must be idempotent, bounded, observable, and recoverable. No retry may create a second order for the same idempotency scope or duplicate a WLT mutation.
