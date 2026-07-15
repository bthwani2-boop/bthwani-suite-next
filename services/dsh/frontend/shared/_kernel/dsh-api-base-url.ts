const FORBIDDEN_PORTS = new Set(["8080", "8081", "8082", "8083", "8084", "3000"]);
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

function isReactNative(): boolean {
  return typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.document !== 'undefined';
}

export function resolveDshApiBaseUrl(): string {
  let url = "";
  if (typeof process !== "undefined" && process.env) {
    const next = (process.env as Record<string, string | undefined>)["NEXT_PUBLIC_DSH_API_BASE_URL"];
    if (next && next.trim().length > 0) url = next.trim();
    
    if (!url) {
      const expo = (process.env as Record<string, string | undefined>)["EXPO_PUBLIC_DSH_API_BASE_URL"];
      if (expo && expo.trim().length > 0) url = expo.trim();
    }
  }

  // If no env is set, but we are in a browser, use relative URL or infer from location if it's not a native app.
  if (!url) {
    if (isReactNative()) {
      // In React Native, if no URL is provided via ENV, it's a fatal error unless it's a local simulator.
      // But we can't reliably know if it's a device or simulator without `expo-device`.
      // We'll default to localhost for simulator, but validation will fail it later if it's a device.
      url = "http://10.0.2.2:58080"; // Android emulator default
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
      // If we are explicitly told this is a physical device run, localhost/emulator IPs are invalid!
      if (isDeviceRun) return false;

      const port = parsed.port || (parsed.protocol === "https:" ? "443" : "80");
      if (FORBIDDEN_PORTS.has(port)) return false;
    }
    return true;
  } catch {
    return false;
  }
}
