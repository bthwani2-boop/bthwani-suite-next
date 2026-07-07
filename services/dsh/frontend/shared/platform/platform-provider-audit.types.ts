import type { PlatformProviderKind } from "./platform-provider.types";

export type PlatformProviderAuditAction =
  | "provider_activated"
  | "provider_deactivated"
  | "fallback_triggered"
  | "credential_rotated"
  | "policy_override_applied"
  | "health_check_failed";

type PlatformProviderAuditRecord = {
  readonly id: string;
  readonly providerId: string;
  readonly kind: PlatformProviderKind;
  readonly action: PlatformProviderAuditAction;
  readonly performedBy: string;
  readonly performedAt: string;
  readonly reason?: string | null;
  readonly rollbackAvailable: boolean;
};
