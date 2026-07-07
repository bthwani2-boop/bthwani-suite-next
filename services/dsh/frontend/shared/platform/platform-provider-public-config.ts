/**
 * Public runtime configuration for the maps provider.
 * The browser/mobile restricted key is injected at runtime from backend — never hardcoded here.
 * Server-side keys (geocoding, routes, places) are backend_secret_only.
 */
export type MapsProviderPublicConfig = {
  readonly mode: "disabled" | "sandbox" | "google" | "future_provider";
  readonly region: string;
  readonly language: string;
  readonly restrictedPublicKeyRef: "runtime_injected" | "not_applicable";
  readonly serverSideKeysLocation: "backend_secret_only";
};

const DEFAULT_MAPS_PUBLIC_CONFIG: MapsProviderPublicConfig = {
  mode: "disabled",
  region: "SA",
  language: "ar",
  restrictedPublicKeyRef: "not_applicable",
  serverSideKeysLocation: "backend_secret_only",
};
