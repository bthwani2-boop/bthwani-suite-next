import type { components } from "@bthwani/wlt/openapi";

/**
 * Canonical WLT-for-DSH financial boundary.
 *
 * All financial records and lifecycle states are derived directly from the
 * generated WLT OpenAPI client. Zero handwritten shadow unions or DTOs.
 */
export type WltPaymentStatusReference = components["schemas"]["PaymentStatus"];
export type WltSettlementStatusReference = components["schemas"]["SettlementStatus"];
export type WltRefundStatusReference = components["schemas"]["RefundStatus"];

export type WltPaymentSessionStatusReference = components["schemas"]["PaymentStatus"];
export type WltRefundStatus = components["schemas"]["RefundStatus"];
export type WltDshRefundReference = components["schemas"]["GovernedRefund"];
export type WltSettlementStatus = components["schemas"]["SettlementStatus"];
export type WltDshSettlementReference = components["schemas"]["SettlementListItem"];
export type WltDshSettlementSummary = components["schemas"]["SettlementSummary"];

export type WltCommissionType = components["schemas"]["Commission"]["commissionType"];
export type WltCommissionStatus = components["schemas"]["CommissionStatus"];

export type WltDshCommissionReference = components["schemas"]["Commission"];
export type WltLedgerDebitCredit = components["schemas"]["LedgerEntry"]["debitCredit"];
export type WltLedgerActorType = components["schemas"]["ActorType"];
export type WltDshLedgerEntry = components["schemas"]["LedgerEntry"];
export type WltDshPaymentSessionReference = components["schemas"]["PaymentSession"];

export type WltDshReferenceContext = {
  readonly orderId: string;
  readonly paymentStatus: WltPaymentStatusReference | null;
  readonly settlementStatus: WltSettlementStatusReference | null;
  readonly refundStatus: WltRefundStatusReference | null;
};

