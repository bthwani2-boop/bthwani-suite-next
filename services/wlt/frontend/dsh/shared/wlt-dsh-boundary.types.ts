// WLT-for-DSH boundary types.
// Read-only financial reference types that DSH surfaces may display.
// DSH must not mutate any of these fields.

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
  | "payment_status_reference"
  | "settlement_status_reference"
  | "refund_status_reference";

export type WltDshReferenceContext = {
  readonly orderId: string;
  readonly paymentStatus: WltPaymentStatusReference | null;
  readonly settlementStatus: WltSettlementStatusReference | null;
  readonly refundStatus: WltRefundStatusReference | null;
};
