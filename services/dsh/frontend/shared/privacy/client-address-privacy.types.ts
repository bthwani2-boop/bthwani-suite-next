export type DshClientAddressPrivacyPolicy = {
  readonly enabled: boolean;
  readonly retentionDays: number;
  readonly batchLimit: number;
  readonly version: number;
  readonly updatedBy: string;
  readonly updatedAt: string;
};

export type DshUpdateClientAddressPrivacyPolicyInput = {
  readonly enabled: boolean;
  readonly retentionDays: number;
  readonly batchLimit: number;
  readonly expectedVersion: number;
  readonly reason: string;
};

export type DshClientAddressAnonymizationResult = {
  readonly anonymizedCount: number;
  readonly completedAt: string;
};

export type DshClientAddressPrivacyState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly policy: DshClientAddressPrivacyPolicy }
  | { readonly kind: "error"; readonly message: string };
