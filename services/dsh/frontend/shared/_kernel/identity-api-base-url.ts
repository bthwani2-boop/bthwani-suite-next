/**
 * Single source of truth for the identity API base URL.
 * Reads from EXPO_PUBLIC_IDENTITY_API_BASE_URL (mobile) or
 * NEXT_PUBLIC_IDENTITY_API_BASE_URL (web/Next.js), falling back
 * to the local dev default on port 58082.
 */
export function resolveIdentityApiBaseUrl(): string {
  if (typeof process !== "undefined") {
    const env = process.env as Record<string, string | undefined>;
    const configured =
      env["NEXT_PUBLIC_IDENTITY_API_BASE_URL"] ??
      env["EXPO_PUBLIC_IDENTITY_API_BASE_URL"];
    if (configured && configured.trim().length > 0) return configured.trim();
  }
  return "http://localhost:58082";
}
