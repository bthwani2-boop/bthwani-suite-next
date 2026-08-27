export type ProviderVisibleFields = {
  readonly id: string;
  readonly kind: string;
  readonly label: string;
  readonly selectedProvider: string;
  readonly fallbackProvider?: string | null;
  readonly environment: string;
  readonly status: string;
  readonly credentialVisibility: string;
  readonly maskedCredential?: string | null;
  readonly lastHealthStatus: string;
  readonly lastHealthCheckedAt?: string | null;
  readonly affectedSurfaces: readonly string[];
  readonly wltBoundary: boolean;
  readonly auditRequired: boolean;
  readonly rollbackTarget?: string | null;
  readonly publicRuntimeConfig: Record<string, string | number | boolean>;
};
