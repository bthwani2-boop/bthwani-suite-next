export type PlatformProviderKind =
  | "maps"
  | "payments"
  | "hosting"
  | "storage"
  | "notifications"
  | "sms"
  | "email"
  | "analytics"
  | "search"
  | "ai"
  | "fraud";

export type PlatformProviderEnvironment = "development" | "sandbox" | "production" | "unknown";

export type PlatformProviderStatus =
  | "active"
  | "inactive"
  | "pending_approval"
  | "failed"
  | "disabled_by_policy";

/** Controls how a provider's credential may appear in the frontend layer. */
export type PlatformProviderCredentialVisibility =
  | "masked_only"
  | "public_restricted_key"
  | "backend_secret_only"
  | "forbidden_in_frontend";

export type PlatformProviderSecretPolicy = {
  readonly secretStorageLocation: "vault" | "env" | "secret_manager" | "backend_only";
  readonly maskedPreviewAllowed: boolean;
  readonly realValueForbiddenInFrontend: true;
};

export type PlatformProviderHealthStatus = "healthy" | "degraded" | "down" | "unknown";

export type PlatformProviderRecord = {
  readonly id: string;
  readonly kind: PlatformProviderKind;
  readonly label: string;
  readonly selectedProvider: string;
  readonly fallbackProvider?: string | null;
  readonly environment: PlatformProviderEnvironment;
  readonly status: PlatformProviderStatus;
  readonly owner: string;
  readonly priority: number;
  readonly credentialVisibility: PlatformProviderCredentialVisibility;
  /**
   * Masked/truncated credential for display only.
   * NEVER contains a real secret value. Format: "sk_live_••••••XXXX".
   */
  readonly maskedCredential?: string | null;
  readonly lastHealthStatus: PlatformProviderHealthStatus;
  readonly lastHealthCheckedAt?: string | null;
  /**
   * Non-secret configuration safe for frontend display.
   * Examples: region, tier, mode — never keys or secrets.
   */
  readonly publicRuntimeConfig: Record<string, string | number | boolean>;
  readonly secretPolicy: PlatformProviderSecretPolicy;
  readonly affectedSurfaces: readonly string[];
  readonly wltBoundary: boolean;
  readonly auditRequired: boolean;
  readonly rollbackTarget?: string | null;
};
