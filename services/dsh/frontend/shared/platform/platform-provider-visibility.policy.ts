import type { PlatformProviderRecord } from "./platform-provider.types";

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

/** Strips secretPolicy and returns only display-safe fields. */
export function toProviderVisibleFields(record: PlatformProviderRecord): ProviderVisibleFields {
  return {
    id: record.id,
    kind: record.kind,
    label: record.label,
    selectedProvider: record.selectedProvider,
    fallbackProvider: record.fallbackProvider ?? null,
    environment: record.environment,
    status: record.status,
    credentialVisibility: record.credentialVisibility,
    maskedCredential: record.maskedCredential ?? null,
    lastHealthStatus: record.lastHealthStatus,
    lastHealthCheckedAt: record.lastHealthCheckedAt ?? null,
    affectedSurfaces: record.affectedSurfaces,
    wltBoundary: record.wltBoundary,
    auditRequired: record.auditRequired,
    rollbackTarget: record.rollbackTarget ?? null,
    publicRuntimeConfig: record.publicRuntimeConfig,
  };
}
