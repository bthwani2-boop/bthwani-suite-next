declare const process:
  | { readonly env?: Readonly<Record<string, string | undefined>> }
  | undefined;

/**
 * Single source of truth for the logical platform providers API base URL.
 * Reads from NEXT_PUBLIC_PROVIDERS_API_BASE_URL, falling back
 * to the local dev default on port 58087.
 */
export function resolveProvidersApiBaseUrl(): string {
  if (typeof process !== "undefined" && process.env) {
    const configured = process.env["NEXT_PUBLIC_PROVIDERS_API_BASE_URL"];
    if (configured && configured.trim().length > 0) return configured.trim();
  }
  return "http://localhost:58087";
}
