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
  | "payment_session_reference"
  | "payment_status_reference"
  | "settlement_status_reference"
  | "refund_status_reference";

export type WltPaymentSessionStatusReference =
  | "reference_created"
  | "pending_provider"
  | "authorized"
  | "captured"
  | "cod_pending"
  | "cod_collected"
  | "failed"
  | "expired";

// WLT Refund Status
export type WltRefundStatus =
  | "requested"
  | "approved"
  | "processing"
  | "completed"
  | "rejected"
  | "reversed";

export type WltDshRefundReference = {
  readonly id: string;
  readonly paymentSessionId: string;
  readonly orderId: string;
  readonly clientId: string;
  readonly amountMinorUnits: number;
  readonly currency: string;
  readonly reason: string;
  readonly status: WltRefundStatus;
  readonly resolvedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

// WLT Settlement Status
export type WltSettlementStatus =
  | "pending"
  | "processing"
  | "settled"
  | "failed"
  | "reversed";

export type WltDshSettlementReference = {
  readonly id: string;
  readonly partnerId: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly grossAmount: number;
  readonly platformFee: number;
  readonly netAmount: number;
  readonly currency: string;
  readonly orderCount: number;
  readonly status: WltSettlementStatus;
  readonly settledAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type WltDshSettlementSummary = {
  readonly partnerId: string;
  readonly totalSettled: number;
  readonly pendingAmount: number;
  readonly currency: string;
  readonly settlementCount: number;
};

// WLT Commission
export type WltCodStatus =
  | "pending_collection"
  | "collected"
  | "remitted"
  | "disputed"
  | "resolved";

export type WltCommissionType =
  | "delivery_fee"
  | "platform_fee"
  | "cod_fee"
  | "partner_discount";

export type WltCommissionStatus =
  | "pending"
  | "confirmed"
  | "settled"
  | "reversed";

export type WltDshCodReference = {
  readonly id: string;
  readonly orderId: string;
  readonly captainId: string;
  readonly partnerId: string;
  readonly amountMinorUnits: number;
  readonly currency: string;
  readonly status: WltCodStatus;
  readonly collectedAt: string | null;
  readonly remittedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type WltDshCommissionReference = {
  readonly id: string;
  readonly orderId: string;
  readonly captainId: string;
  readonly partnerId: string;
  readonly commissionType: WltCommissionType;
  readonly amountMinorUnits: number;
  readonly currency: string;
  readonly status: WltCommissionStatus;
  readonly settledAt: string | null;
  readonly createdAt: string;
};

// WLT Ledger
export type WltLedgerDebitCredit = "debit" | "credit";

export type WltLedgerActorType =
  | "client"
  | "partner"
  | "captain"
  | "system"
  | "platform";

export type WltDshLedgerEntry = {
  readonly id: string;
  readonly entryType: string;
  readonly actorId: string;
  readonly actorType: WltLedgerActorType;
  readonly orderId: string | null;
  readonly referenceId: string;
  readonly referenceType: string;
  readonly amountMinorUnits: number;
  readonly currency: string;
  readonly debitCredit: WltLedgerDebitCredit;
  readonly balanceAfter: number;
  readonly description: string;
  readonly createdAt: string;
};

export type WltDshPaymentSessionReference = {
  readonly id: string;
  readonly checkoutIntentId: string;
  readonly clientId: string;
  readonly storeId: string;
  readonly paymentMethod: "cod" | "wallet" | "mixed" | "official_wallet";
  readonly status: WltPaymentSessionStatusReference;
  readonly providerReference: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type WltDshReferenceContext = {
  readonly orderId: string;
  readonly paymentStatus: WltPaymentStatusReference | null;
  readonly settlementStatus: WltSettlementStatusReference | null;
  readonly refundStatus: WltRefundStatusReference | null;
};
