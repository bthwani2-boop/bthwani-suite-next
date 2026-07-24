export type DshWltRefundStatus =
  | "requested"
  | "approved"
  | "processing"
  | "provider_unknown"
  | "completed"
  | "rejected"
  | "reversed";

export type DshWltRefundView = {
  readonly id: string;
  readonly orderId: string;
  readonly paymentSessionId?: string | undefined;
  readonly clientId?: string | undefined;
  readonly status: DshWltRefundStatus;
  readonly statusLabel: string;
  readonly statusBadge: "success" | "warning" | "error" | "neutral";
  readonly amountMinorUnits: number;
  readonly amountLabel: string;
  readonly currency: string;
  readonly reason?: string | undefined;
  readonly eligibilityReference?: string | undefined;
  readonly providerReference?: string | undefined;
  readonly providerStatus?: string | undefined;
  readonly reconciliationCaseId?: string | undefined;
  readonly requestedByOperatorId?: string | undefined;
  readonly approvedByOperatorId?: string | undefined;
  readonly rejectedByOperatorId?: string | undefined;
  readonly decisionReason?: string | undefined;
  readonly resolvedAt: string | null;
  readonly createdAt?: string | undefined;
  readonly updatedAt?: string | undefined;
};

export type DshWltRefundAuditEvent = {
  readonly id: string;
  readonly refundId: string;
  readonly eventType: string;
  readonly actorId: string;
  readonly actorType: "operator" | "service" | "provider" | "reconciler" | "system";
  readonly fromStatus?: string | undefined;
  readonly toStatus: string;
  readonly reason?: string | undefined;
  readonly correlationId?: string | undefined;
  readonly createdAt: string;
};

export type CreateDshWltRefundInput = {
  readonly paymentSessionId: string;
  readonly orderId: string;
  readonly clientId: string;
  /** Zero requests the full remaining refundable amount. */
  readonly amountMinorUnits: number;
  readonly reason: string;
  readonly eligibilityReference: string;
};

export type RefundDecisionInput = { readonly reason: string };
export type RefundReconciliationInput = {
  readonly resolutionAction: "confirmed_success" | "confirmed_failed";
  readonly evidenceNote: string;
  readonly providerReference?: string | undefined;
};

export type DshWltRefundFailureKind =
  | "unauthorized"
  | "forbidden"
  | "conflict"
  | "provider_unknown"
  | "offline"
  | "invalid"
  | "error";

export type DshWltRefundResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly kind: DshWltRefundFailureKind; readonly message: string };

export type DshWltRefundState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "loaded"; readonly refund: DshWltRefundView | null }
  | { readonly kind: "mutating"; readonly action: "create" | "approve" | "reject" | "complete" | "reconcile" }
  | { readonly kind: "provider_unknown"; readonly refund: DshWltRefundView | null; readonly message: string }
  | { readonly kind: "error"; readonly failure: DshWltRefundFailureKind; readonly message: string };
