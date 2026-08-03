import type { components } from "../../../../clients/generated/wlt-api";

/**
 * Canonical WLT-for-DSH financial references.
 *
 * Financial statuses and records are aliases of the generated WLT OpenAPI
 * client. This file may compose read-only DSH projections, but it must never
 * redefine WLT DTOs, lifecycle states, monetary records, or envelopes.
 */
export type WltPaymentStatusReference = components["schemas"]["PaymentStatus"];
export type WltSettlementStatusReference =
  components["schemas"]["SettlementListItem"]["status"];

/** `none` is a DSH presentation sentinel for an absent refund reference. */
export type WltRefundStatusReference =
  | components["schemas"]["RefundStatus"]
  | "none";

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
export type WltDshCodReference = components["schemas"]["CodRecord"];
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
