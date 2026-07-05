const FORBIDDEN_PORTS = new Set(["8080", "8081", "8082", "8083", "8084", "3000"]);
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * Single source of truth for the WLT API base URL used by WLT frontend adapters.
 * Reads from NEXT_PUBLIC_WLT_API_BASE_URL (web/Next.js) or
 * EXPO_PUBLIC_WLT_API_BASE_URL (mobile), falling back to the local dev default
 * on port 58083.
 */
export function resolveWltApiBaseUrl(): string {
  if (typeof process !== "undefined") {
    const env = process.env as Record<string, string | undefined>;
    const configured =
      env["NEXT_PUBLIC_WLT_API_BASE_URL"] ??
      env["EXPO_PUBLIC_WLT_API_BASE_URL"];
    if (configured && configured.trim().length > 0)
      return configured.trim().replace(/\/$/, "");
  }
  return "http://localhost:58083";
}

export function validateWltApiBaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.length === 0) return false;
    if (LOCAL_HOSTNAMES.has(parsed.hostname)) {
      const port = parsed.port || (parsed.protocol === "https:" ? "443" : "80");
      if (FORBIDDEN_PORTS.has(port)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * @deprecated Use `resolveWltApiBaseUrl()` instead.
 * Kept for backward compatibility — will be removed in a future cleanup.
 */
export function getWltApiBaseUrl(): string {
  return resolveWltApiBaseUrl();
}
