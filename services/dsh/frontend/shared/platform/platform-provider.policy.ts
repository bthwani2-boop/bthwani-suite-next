import type { PlatformProviderKind } from "./platform-provider.types";

export const ALLOWED_PROVIDER_CONSUMER_SURFACES = ["control-panel", "system"] as const;
export const FORBIDDEN_PROVIDER_CONSUMER_SURFACES = ["app-client", "app-partner", "app-captain", "app-field"] as const;

export type AllowedProviderConsumerSurface = (typeof ALLOWED_PROVIDER_CONSUMER_SURFACES)[number];
export type ForbiddenProviderConsumerSurface = (typeof FORBIDDEN_PROVIDER_CONSUMER_SURFACES)[number];

export const PROVIDER_AFFECTED_SURFACES: Record<PlatformProviderKind, readonly string[]> = {
  maps: ["app-client", "app-captain", "app-field", "app-partner", "control-panel"],
  payments: ["app-client", "app-partner", "control-panel"],
  hosting: ["control-panel"],
  storage: ["app-partner", "app-field", "control-panel"],
  notifications: ["app-client", "app-captain", "app-partner", "app-field"],
  sms: ["app-client", "app-captain"],
  email: ["app-partner", "control-panel"],
  analytics: ["control-panel"],
  search: ["app-client", "app-partner"],
  ai: ["control-panel"],
  fraud: ["control-panel"],
};

export const PROVIDER_MUTATION_POLICY = {
  requiresBackendContract: true,
  localOnlyApplyForbidden: true,
  previewOnlyApplyForbidden: true,
  mutationSurface: "control-panel/platform" as const,
} as const;

export const WLT_BOUNDARY_PROVIDER_KINDS: readonly PlatformProviderKind[] = ["payments"];
