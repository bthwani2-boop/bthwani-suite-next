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
  readonly operatorContextId: string;
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

export type WltPaymentSessionTimeline = {
  readonly paymentSession: WltPaymentSession;
  readonly captureLedgerTransactionId?: string;
  readonly lastProviderEventId?: string;
  readonly lastProviderStatus?: string;
  readonly operationReceipts: readonly {
    readonly id: string;
    readonly operation: string;
    readonly state: string;
    readonly correlationId?: string;
    readonly responseStatus?: string;
  }[];
  readonly providerEvents: readonly {
    readonly providerEventId: string;
    readonly eventType: string;
    readonly providerStatus: string;
    readonly processingState: string;
  }[];
  readonly reconciliationCases: readonly {
    readonly id: string;
    readonly operation: string;
    readonly triggerReason: string;
    readonly status: string;
    readonly resolutionAction?: string | null;
  }[];
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
};
