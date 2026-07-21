declare const process:
  | { readonly env?: Readonly<Record<string, string | undefined>> }
  | undefined;

const FORBIDDEN_PORTS = new Set(["8080", "8081", "8082", "8083", "8084", "3000"]);
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function isReactNative(): boolean {
  return typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
}

export function resolveDshApiBaseUrl(): string {
  let url = "";
  if (typeof process !== "undefined" && process.env) {
    const next = process.env["NEXT_PUBLIC_DSH_API_BASE_URL"];
    if (next && next.trim().length > 0) url = next.trim();

    if (!url) {
      const expo = process.env["EXPO_PUBLIC_DSH_API_BASE_URL"];
      if (expo && expo.trim().length > 0) url = expo.trim();
    }
  }

  if (!url) {
    if (isReactNative()) {
      url = "http://10.0.2.2:58080";
    } else {
      url = "http://localhost:58080";
    }
  }

  return url;
}

export function validateDshApiBaseUrl(url: string, isDeviceRun = false): boolean {
  if (url.startsWith("/")) return url.length > 1;

  try {
    const parsed = new URL(url);
    if (parsed.hostname.length === 0) return false;

    if (LOCAL_HOSTNAMES.has(parsed.hostname) || parsed.hostname === '10.0.2.2') {
      if (isDeviceRun) return false;

      const port = parsed.port || (parsed.protocol === "https:" ? "443" : "80");
      if (FORBIDDEN_PORTS.has(port)) return false;
    }
    return true;
  } catch {
    return false;
  }
}
