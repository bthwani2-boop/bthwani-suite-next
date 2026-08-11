export type DshZone = {
  readonly id: string;
  readonly name: string;
  readonly cityCode: string;
  readonly isActive: boolean;
  readonly description: string;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshSlaRule = {
  readonly id: string;
  readonly zoneId: string;
  readonly category: string;
  readonly maxPrepMins: number;
  readonly maxDeliveryMins: number;
  readonly version: number;
  readonly updatedBy: string;
  readonly updatedAt: string;
};

export type DshCapacityConfig = {
  readonly id: string;
  readonly zoneId: string;
  readonly maxConcurrentOrders: number;
  readonly maxCaptainsOnline: number;
  readonly throttleThreshold: number;
  readonly version: number;
  readonly updatedBy: string;
  readonly updatedAt: string;
};

export type DshZoneServiceability = {
  readonly zoneId: string;
  readonly isActive: boolean;
  readonly activeStores: number;
  readonly slaAvailable: boolean;
};

export type DshPlatformState<T> =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly data: T }
  | { readonly kind: "error"; readonly message: string };

export type DshCreateZoneInput = {
  readonly id?: string;
  readonly name: string;
  readonly cityCode: string;
  readonly description?: string;
  readonly reason: string;
};

export type DshUpdateZoneInput = {
  readonly name?: string;
  readonly description?: string;
  readonly isActive?: boolean;
  readonly expectedVersion: number;
  readonly reason: string;
};

export type DshUpsertSlaRuleInput = {
  readonly zoneId: string;
  readonly category: string;
  readonly maxPrepMins: number;
  readonly maxDeliveryMins: number;
  readonly expectedVersion: number;
  readonly reason: string;
};

export type DshUpsertCapacityInput = {
  readonly zoneId: string;
  readonly maxConcurrentOrders: number;
  readonly maxCaptainsOnline: number;
  readonly throttleThreshold: number;
  readonly expectedVersion: number;
  readonly reason: string;
};

// WLT owns onboarding-fee financial truth. DSH transports only the typed,
// authenticated policy projection and never stores or recomputes the money.
export type DshStoreOnboardingFeeAppliesTo = "first_store" | "additional_store" | "all_stores";
export type DshStoreOnboardingFeeChargeTiming = "on_approval" | "on_publication" | "on_first_order" | "manual";

export type DshStoreOnboardingFeePolicy = {
  readonly enabled: boolean;
  readonly amountMinorUnits: number;
  readonly currency: string;
  readonly appliesTo: DshStoreOnboardingFeeAppliesTo;
  readonly chargeTiming: DshStoreOnboardingFeeChargeTiming;
  readonly actorCharged: "partner";
  readonly effectiveFrom: string | null;
  readonly notes: string;
  readonly updatedBy: string;
  readonly updatedAt: string;
  readonly version: number;
  readonly isConfigured: boolean;
  readonly blockedReason?: "POLICY_NOT_CONFIGURED";
};

export type DshStoreOnboardingFeePolicyInput = {
  readonly enabled: boolean;
  readonly amountMinorUnits: number;
  readonly currency: string;
  readonly appliesTo: DshStoreOnboardingFeeAppliesTo;
  readonly chargeTiming: DshStoreOnboardingFeeChargeTiming;
  readonly effectiveFrom?: string | null;
  readonly notes?: string;
  readonly expectedVersion: number;
  readonly reason: string;
};

// DSH stores only opaque WLT decision metadata. Wallet state, balance,
// currency, thresholds, and financial policy remain WLT-owned truth.
export type DshCaptainFinancialEligibility = {
  readonly operatorContextId: string;
  readonly captainId: string;
  readonly wltDecisionId: string;
  readonly wltReasonCode: string;
  readonly wltPolicyVersion: string;
  readonly eligible: boolean;
  readonly ineligibilityReason?: string;
  readonly snapshotReference: string;
  readonly checkedAt: string;
  readonly evaluatedAt: string;
  readonly expiresAt: string;
};
