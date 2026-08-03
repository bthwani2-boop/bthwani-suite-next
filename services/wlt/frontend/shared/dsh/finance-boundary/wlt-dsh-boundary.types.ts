import type { components } from "../../../../clients/generated/wlt-api";

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

/** Names of read-only references projected by the DSH facade. */
export type WltReferenceField =
  | "wlt_reference"
  | "payment_session_reference"
  | "payment_status_reference"
  | "settlement_status_reference"
  | "refund_status_reference";

export type WltPaymentSessionStatusReference =
  components["schemas"]["PaymentStatus"];
export type WltRefundStatus = components["schemas"]["RefundStatus"];
export type WltDshRefundReference = components["schemas"]["GovernedRefund"];

export type WltSettlementStatus =
  components["schemas"]["SettlementListItem"]["status"];
export type WltDshSettlementReference =
  components["schemas"]["SettlementListItem"];

/**
 * DSH facade projection. The WLT settlement-summary route does not yet expose
 * a named schema, so this type is deliberately limited to the read model used
 * by DSH surfaces and does not define settlement lifecycle authority.
 */
export type WltDshSettlementSummary = {
  readonly partnerId: string;
  readonly totalSettled: number;
  readonly pendingAmount: number;
  readonly currency: string;
  readonly settlementCount: number;
};

export type WltCodStatus = components["schemas"]["CodRecord"]["status"];
export type WltCommissionType =
  components["schemas"]["Commission"]["commissionType"];
export type WltCommissionStatus = components["schemas"]["CommissionStatus"];
export type WltCodCollectorType =
  components["schemas"]["CreateCodRecordRequest"]["collectorType"];

/**
 * The generated CodRecord owns all required financial fields. Its source
 * schema currently leaves lifecycle timestamps as open properties, so this
 * read-only intersection types only those runtime-returned timestamps.
 */
export type WltDshCodReference = components["schemas"]["CodRecord"] & {
  readonly collectedAt?: string | null;
  readonly remittedAt?: string | null;
  readonly createdAt: string;
  readonly updatedAt?: string;
};

export type WltDshCommissionReference = components["schemas"]["Commission"];

export type WltLedgerDebitCredit =
  components["schemas"]["LedgerEntry"]["debitCredit"];
export type WltLedgerActorType = components["schemas"]["ActorType"];
export type WltDshLedgerEntry = components["schemas"]["LedgerEntry"];

export type WltDshPaymentSessionReference =
  components["schemas"]["PaymentSession"];

/** Read-only cross-domain composition; each status remains WLT-owned above. */
export type WltDshReferenceContext = {
  readonly orderId: string;
  readonly paymentStatus: WltPaymentStatusReference | null;
  readonly settlementStatus: WltSettlementStatusReference | null;
  readonly refundStatus: WltRefundStatusReference | null;
};
