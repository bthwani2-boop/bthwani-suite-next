import type { components } from "@bthwani/wlt-openapi";

/**
 * Canonical WLT-for-DSH financial boundary.
 *
 * Named financial records and lifecycle states are aliases of the generated
 * WLT OpenAPI client. The isolated read projections below exist only where the
 * current WLT contract still exposes an open response or omits returned fields;
 * each gap is documented at the declaration and must be removed when OpenAPI
 * gains the matching named schema.
 */
export type WltPaymentStatusReference =
  | "pending"
  | "authorized"
  | "captured"
  | "failed"
  | "refunded"
  | "partially_refunded";

export type WltSettlementStatusReference =
  | "pending"
  | "processing"
  | "settled"
  | "failed";

export type WltRefundStatusReference =
  | "none"
  | "requested"
  | "approved"
  | "completed"
  | "rejected";

export type WltReferenceField =
  | "wlt_reference"
  | "payment_session_reference"
  | "payment_status_reference"
  | "settlement_status_reference"
  | "refund_status_reference";

export type WltPaymentSessionStatusReference = components["schemas"]["PaymentStatus"];
export type WltRefundStatus = components["schemas"]["RefundStatus"];
export type WltDshRefundReference = components["schemas"]["GovernedRefund"];
export type WltSettlementStatus = components["schemas"]["SettlementListItem"]["status"];
export type WltDshSettlementReference = components["schemas"]["SettlementListItem"];

/** The settlement-summary route still lacks a named response schema. */
export type WltDshSettlementSummary = {
  readonly partnerId: string;
  readonly totalSettled: number;
  readonly pendingAmount: number;
  readonly currency: string;
  readonly settlementCount: number;
};

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
