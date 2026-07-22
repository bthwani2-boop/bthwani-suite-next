export type WltPaymentSessionStatus =
  | "reference_created"
  | "pending_provider"
  | "authorization_pending"
  | "authorized"
  | "capture_pending"
  | "captured"
  | "cod_pending"
  | "cod_collected"
  | "failed"
  | "expired"
  | "provider_result_unknown";

export type WltPaymentSession = {
  readonly id: string;
  readonly checkoutIntentId?: string | null;
  readonly specialRequestId?: string | null;
  readonly subscriptionPurchaseId?: string | null;
  readonly commercialProductReference?: string | null;
  readonly tenantId: string;
  readonly clientId: string;
  readonly storeId: string;
  readonly paymentMethod: "cod" | "wallet" | "mixed" | "official_wallet";
  readonly status: WltPaymentSessionStatus;
  readonly providerReference: string;
  readonly amountMinorUnits: number;
  readonly currency: string;
  readonly capturedAt?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type WltPaymentOperationReceipt = {
  readonly id: string;
  readonly operation: "authorize" | "capture" | "provider_status_refresh";
  readonly state: "in_progress" | "completed" | "failed" | "provider_result_unknown";
  readonly responseStatus: string;
  readonly providerReference?: string;
  readonly correlationId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly completedAt?: string | null;
};

export type WltPaymentProviderEvent = {
  readonly providerEventId: string;
  readonly eventType: string;
  readonly providerStatus: string;
  readonly providerReference?: string;
  readonly processingState: "received" | "applied" | "ignored" | "conflict";
  readonly processingResult?: string;
  readonly signatureTime: string;
  readonly occurredAt?: string | null;
  readonly receivedAt: string;
  readonly processedAt?: string | null;
};

export type WltPaymentReconciliationCase = {
  readonly id: string;
  readonly operation: string;
  readonly triggerReason: string;
  readonly status: "open" | "resolved";
  readonly assignedToOperatorId?: string | null;
  readonly resolution?: string | null;
  readonly resolutionAction?: string | null;
  readonly resolutionNote?: string | null;
  readonly resolvedAt?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type WltPaymentSessionTimeline = {
  readonly paymentSession: WltPaymentSession;
  readonly captureLedgerTransactionId?: string;
  readonly lastProviderEventId?: string;
  readonly lastProviderStatus?: string;
  readonly operationReceipts: readonly WltPaymentOperationReceipt[];
  readonly providerEvents: readonly WltPaymentProviderEvent[];
  readonly reconciliationCases: readonly WltPaymentReconciliationCase[];
};

export type WltPaymentTimelineEnvelope = {
  readonly paymentTimeline: WltPaymentSessionTimeline;
};

export type WltPaymentOperationEnvelope = {
  readonly paymentSession: WltPaymentSession;
  readonly idempotentReplay?: boolean;
  readonly receiptState?: string;
  readonly ledgerTransactionId?: string;
};

export type WltPaymentSessionPresentation = {
  readonly label: string;
  readonly description: string;
  readonly tone: "success" | "action" | "info" | "warning" | "danger";
  readonly terminal: boolean;
  readonly recoverable: boolean;
};
