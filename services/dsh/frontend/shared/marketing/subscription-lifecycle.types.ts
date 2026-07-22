import type { ClientBenefitsPayload, SubscriptionPlanRecord } from "./loyalty-subscriptions.types";

export type SubscriptionPurchaseStatus =
  | "initiated"
  | "pending_payment"
  | "payment_captured"
  | "active"
  | "renewal_pending_payment"
  | "renewed"
  | "cancelled"
  | "expired"
  | "compensation_pending"
  | "compensated"
  | "failed";

export type SubscriptionPaymentStatus =
  | "created"
  | "authorized"
  | "captured"
  | "cancelled"
  | "expired"
  | "failed";

export type SubscriptionPaymentMethod = "official_wallet" | "wallet" | "mixed";

export type SubscriptionPurchaseRecord = {
  readonly id: string;
  readonly tenantId: string;
  readonly clientId: string;
  readonly planId: string;
  readonly wltProductReference: string;
  readonly wltPaymentSessionId?: string;
  readonly wltSubscriptionId?: string;
  readonly renewalOfPurchaseId?: string;
  readonly paymentMethod: SubscriptionPaymentMethod;
  readonly status: SubscriptionPurchaseStatus;
  readonly lifecycleVersion: number;
  readonly failureCode?: string;
  readonly activatedAt?: string;
  readonly expiresAt?: string;
  readonly cancelledAt?: string;
  readonly cancellationReason?: string;
  readonly compensationStatus: "not_required" | "pending" | "completed" | "failed";
  readonly compensationReference?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type SubscriptionPaymentSession = {
  readonly id: string;
  readonly subscriptionPurchaseId?: string;
  readonly commercialProductReference?: string;
  readonly tenantId: string;
  readonly clientId: string;
  readonly paymentMethod: SubscriptionPaymentMethod;
  readonly status: SubscriptionPaymentStatus;
  readonly providerReference?: string;
  readonly amountMinorUnits: number;
  readonly currency: string;
  readonly capturedAt?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type SubscriptionLifecycleRecord = {
  readonly id: string;
  readonly clientId: string;
  readonly productReference: string;
  readonly status: "active" | "cancelled" | "expired" | "superseded";
  readonly paymentSessionId?: string;
  readonly subscriptionPurchaseId?: string;
  readonly startsAt: string;
  readonly endsAt?: string;
  readonly cancelAtPeriodEnd: boolean;
  readonly cancelledAt?: string;
  readonly cancellationReason?: string;
  readonly lastRenewalPaymentSessionId?: string;
  readonly compensationStatus: "not_required" | "pending" | "completed" | "failed";
  readonly compensationReference?: string;
  readonly version: number;
  readonly allowedActions: readonly ("renew" | "cancel")[];
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type SubscriptionCompensationRecord = {
  readonly id: string;
  readonly subscriptionId: string;
  readonly clientId: string;
  readonly paymentSessionId: string;
  readonly status: "pending" | "completed" | "failed";
  readonly reason: string;
  readonly refundReference?: string;
  readonly amountMinorUnits: number;
  readonly currency: string;
  readonly correlationId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly completedAt?: string;
};

export type SubscriptionPurchaseEnvelope = {
  readonly purchase: SubscriptionPurchaseRecord;
  readonly paymentSession?: SubscriptionPaymentSession;
};

export type SubscriptionActivationEnvelope = {
  readonly purchase: SubscriptionPurchaseRecord;
  readonly subscription?: SubscriptionLifecycleRecord;
};

export type SubscriptionCancellationEnvelope = {
  readonly subscription: SubscriptionLifecycleRecord;
  readonly compensation?: SubscriptionCompensationRecord;
  readonly updatedPurchaseCount: number;
};

export type SubscriptionLifecycleSnapshot = {
  readonly benefits: ClientBenefitsPayload;
  readonly selectedPlan?: SubscriptionPlanRecord;
  readonly purchase?: SubscriptionPurchaseRecord;
  readonly paymentSession?: SubscriptionPaymentSession;
};
