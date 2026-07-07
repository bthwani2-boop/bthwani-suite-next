# WLT DSH Finance Boundary Plan

This document governs the operational boundary between the DSH Order Lifecycle and the WLT Finance System.

## Finance Boundary Rules

1. **WLT owns the financial source of truth**:
   - Payments, settlements, refunds, commissions, and Cash On Delivery (COD) ledger records are strictly processed and stored within the WLT microservice.
2. **DSH checkout intent links to WLT payment session**:
   - A client cannot place a DSH order until WLT authorizes the corresponding `wltPaymentSessionId`.
   - The checkout intent state in DSH stores `wlt_payment_ref_id` as evidence of payment authorization.
3. **Refund triggers are propagated to WLT**:
   - When an operator or store rejects/cancels an order, DSH dispatches a cancel hook to WLT referencing the original `wltPaymentRefId` to initiate the refund process.
4. **COD remittance**:
   - Captain COD collections are logged in WLT. The captain cannot mark a COD order as delivered without completing WLT's remittance handshake.

## Integration Bridges
- [dsh-client-wlt-payment-bridge.ts](file:///c:/bthwani-suite-next/services/dsh/frontend/shared/finance-wlt-link/finance-boundary/dsh-client-wlt-payment-bridge.ts)
- [dsh-wlt-boundary.ts](file:///c:/bthwani-suite-next/services/dsh/frontend/shared/finance-wlt-link/finance-boundary/dsh-wlt-boundary.ts)
