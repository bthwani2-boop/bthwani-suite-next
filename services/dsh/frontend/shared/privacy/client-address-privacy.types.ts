export type DshClientAddressPrivacyPolicy = {
  readonly enabled: boolean;
  readonly retentionDays: number;
  readonly batchLimit: number;
  readonly version: number;
  readonly updatedBy: string;
  readonly updatedAt: string;
};

export type DshClientAddressPrivacyQueueStatus = {
  readonly policyEnabled: boolean;
  readonly policyVersion: number;
  readonly retentionDays: number;
  readonly batchLimit: number;
  readonly scheduledCount: number;
  readonly dueCount: number;
  readonly anonymizedCount: number;
  readonly nextPurgeAt: string | null;
  readonly checkedAt: string;
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

export type DshClientAddressPrivacyAuditEvent = {
  readonly eventId: string;
  readonly addressId: string;
  readonly clientSubjectHash: string;
  readonly action: "retention_scheduled" | "anonymized" | "policy_updated";
  readonly actorId: string;
  readonly correlationId: string | null;
  readonly policyVersion: number;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
};

export type DshClientAddressPrivacyState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | {
      readonly kind: "success";
      readonly policy: DshClientAddressPrivacyPolicy;
      readonly status: DshClientAddressPrivacyQueueStatus;
      readonly events: readonly DshClientAddressPrivacyAuditEvent[];
    }
  | { readonly kind: "error"; readonly message: string };
