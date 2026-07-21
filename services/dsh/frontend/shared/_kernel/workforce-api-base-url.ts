declare const process:
  | { readonly env?: Readonly<Record<string, string | undefined>> }
  | undefined;

/**
 * Single source of truth for the workforce API base URL used by native apps
 * (no BFF cookie jar — direct bearer-token calls). Reads
 * EXPO_PUBLIC_WORKFORCE_API_BASE_URL (mobile) or
 * NEXT_PUBLIC_WORKFORCE_API_BASE_URL (web), falling back to the local dev
 * default on port 58086.
 */
export function resolveWorkforceApiBaseUrl(): string {
  if (typeof process !== "undefined" && process.env) {
    const configured =
      process.env["NEXT_PUBLIC_WORKFORCE_API_BASE_URL"] ??
      process.env["EXPO_PUBLIC_WORKFORCE_API_BASE_URL"];
    if (configured && configured.trim().length > 0) return configured.trim();
  }
  return "http://localhost:58086";
}
