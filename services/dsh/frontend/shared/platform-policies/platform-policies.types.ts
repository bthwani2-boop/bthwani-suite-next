export type DshZone = {
  readonly id: string;
  readonly name: string;
  readonly cityCode: string;
  readonly isActive: boolean;
  readonly description: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type DshSlaRule = {
  readonly id: string;
  readonly zoneId: string;
  readonly category: string;
  readonly maxPrepMins: number;
  readonly maxDeliveryMins: number;
  readonly updatedBy: string;
  readonly updatedAt: string;
};

export type DshCapacityConfig = {
  readonly id: string;
  readonly zoneId: string;
  readonly maxConcurrentOrders: number;
  readonly maxCaptainsOnline: number;
  readonly throttleThreshold: number;
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

// ── Store onboarding fee policy ──────────────────────────────────────────────
// DSH owns the policy DEFINITION only — never a WLT ledger entry.
export type DshStoreOnboardingFeeAppliesTo = "first_store" | "additional_store" | "all_stores";
export type DshStoreOnboardingFeeChargeTiming = "on_approval" | "on_publication" | "on_first_order" | "manual";

export type DshStoreOnboardingFeePolicy = {
  readonly enabled: boolean;
  readonly amount: number;
  readonly currency: string;
  readonly appliesTo: DshStoreOnboardingFeeAppliesTo;
  readonly chargeTiming: DshStoreOnboardingFeeChargeTiming;
  readonly actorCharged: "partner";
  readonly effectiveFrom: string | null;
  readonly notes: string;
  readonly updatedBy: string;
  readonly updatedAt: string;
  readonly isConfigured: boolean;
  readonly blockedReason?: string;
};

export type DshStoreOnboardingFeePolicyInput = {
  readonly enabled: boolean;
  readonly amount: number;
  readonly currency: string;
  readonly appliesTo: DshStoreOnboardingFeeAppliesTo;
  readonly chargeTiming: DshStoreOnboardingFeeChargeTiming;
  readonly effectiveFrom?: string | null;
  readonly notes?: string;
};
