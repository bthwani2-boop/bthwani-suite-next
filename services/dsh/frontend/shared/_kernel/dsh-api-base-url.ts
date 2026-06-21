const FORBIDDEN_PORTS = new Set(["8080", "8081", "8082", "8083", "8084", "3000"]);
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

export function resolveDshApiBaseUrl(): string {
  if (typeof process !== "undefined") {
    const next = (process.env as Record<string, string | undefined>)["NEXT_PUBLIC_DSH_API_BASE_URL"];
    if (next && next.trim().length > 0) return next.trim();
    const expo = (process.env as Record<string, string | undefined>)["EXPO_PUBLIC_DSH_API_BASE_URL"];
    if (expo && expo.trim().length > 0) return expo.trim();
  }
  return "http://localhost:58080";
}

export function validateDshApiBaseUrl(url: string): boolean {
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
