import type { PlatformProviderKind, PlatformProviderCredentialVisibility, PlatformProviderSecretPolicy } from "./platform-provider.types";

/**
 * Governs how secrets for each provider kind may appear in the frontend.
 * Real credentials NEVER live in frontend code, env vars visible to UI, or frontend state.
 */
export const PROVIDER_SECRET_POLICIES: Record<PlatformProviderKind, PlatformProviderSecretPolicy> = {
  maps: { secretStorageLocation: "env", maskedPreviewAllowed: true, realValueForbiddenInFrontend: true },
  payments: { secretStorageLocation: "vault", maskedPreviewAllowed: true, realValueForbiddenInFrontend: true },
  hosting: { secretStorageLocation: "env", maskedPreviewAllowed: false, realValueForbiddenInFrontend: true },
  storage: { secretStorageLocation: "vault", maskedPreviewAllowed: true, realValueForbiddenInFrontend: true },
  notifications: { secretStorageLocation: "env", maskedPreviewAllowed: true, realValueForbiddenInFrontend: true },
  sms: { secretStorageLocation: "env", maskedPreviewAllowed: true, realValueForbiddenInFrontend: true },
  email: { secretStorageLocation: "env", maskedPreviewAllowed: true, realValueForbiddenInFrontend: true },
  analytics: { secretStorageLocation: "env", maskedPreviewAllowed: false, realValueForbiddenInFrontend: true },
  search: { secretStorageLocation: "env", maskedPreviewAllowed: false, realValueForbiddenInFrontend: true },
  ai: { secretStorageLocation: "vault", maskedPreviewAllowed: false, realValueForbiddenInFrontend: true },
  fraud: { secretStorageLocation: "vault", maskedPreviewAllowed: false, realValueForbiddenInFrontend: true },
};

export const PROVIDER_CREDENTIAL_VISIBILITY: Record<PlatformProviderKind, PlatformProviderCredentialVisibility> = {
  maps: "public_restricted_key",
  payments: "masked_only",
  hosting: "forbidden_in_frontend",
  storage: "masked_only",
  notifications: "masked_only",
  sms: "masked_only",
  email: "masked_only",
  analytics: "forbidden_in_frontend",
  search: "forbidden_in_frontend",
  ai: "backend_secret_only",
  fraud: "backend_secret_only",
};

export function isForbiddenInFrontend(kind: PlatformProviderKind): boolean {
  const v = PROVIDER_CREDENTIAL_VISIBILITY[kind];
  return v === "forbidden_in_frontend" || v === "backend_secret_only";
}
