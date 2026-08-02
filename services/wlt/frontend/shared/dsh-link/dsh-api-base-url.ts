declare const process:
  | { readonly env?: Readonly<Record<string, string | undefined>> }
  | undefined;

const FORBIDDEN_PORTS = new Set(["8080", "8081", "8082", "8083", "8084", "3000"]);
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const ANDROID_EMULATOR_HOSTNAME = "10.0.2.2";

function isReactNative(): boolean {
  return typeof navigator !== "undefined" && navigator.product === "ReactNative";
}

export function isDshDeviceLoopbackBridgeEnabled(): boolean {
  if (typeof process === "undefined" || !process.env) return false;
  const expoFlag = process.env["EXPO_PUBLIC_ADB_REVERSE_ENABLED"]?.trim().toLowerCase();
  const runtimeFlag = process.env["BTHWANI_ADB_REVERSE_ENABLED"]?.trim().toLowerCase();
  return expoFlag === "true" || runtimeFlag === "1" || runtimeFlag === "true";
}

export function resolveDshApiBaseUrl(): string {
  if (
    typeof process !== "undefined" &&
    process.env?.["NEXT_PUBLIC_CONTROL_PANEL_BFF_ENABLED"] === "true"
  ) {
    return "/api/dsh";
  }

  let url = "";
  if (typeof process !== "undefined" && process.env) {
    const expo = process.env["EXPO_PUBLIC_DSH_API_BASE_URL"];
    if (expo && expo.trim().length > 0) url = expo.trim();

    if (!url) {
      const next = process.env["NEXT_PUBLIC_DSH_API_BASE_URL"];
      if (next && next.trim().length > 0) url = next.trim();
    }
  }

  if (!url) {
    url = isReactNative() ? "http://10.0.2.2:58080" : "http://localhost:58080";
  }
  return url;
}

export function validateDshApiBaseUrl(
  url: string,
  isDeviceRun = false,
  allowDeviceLoopback = isDshDeviceLoopbackBridgeEnabled(),
): boolean {
  if (url.startsWith("/")) return url.length > 1;

  try {
    const parsed = new URL(url);
    if (parsed.hostname.length === 0) return false;

    const isLoopback = LOCAL_HOSTNAMES.has(parsed.hostname);
    const isAndroidEmulator = parsed.hostname === ANDROID_EMULATOR_HOSTNAME;
    if (isLoopback || isAndroidEmulator) {
      const port = parsed.port || (parsed.protocol === "https:" ? "443" : "80");
      if (FORBIDDEN_PORTS.has(port)) return false;
    }

    // Android emulators intentionally reach the host through 10.0.2.2. A real
    // device may use loopback only when the runtime explicitly established and
    // verified adb reverse mappings.
    if (isDeviceRun && isLoopback && !allowDeviceLoopback) return false;

    return true;
  } catch {
    return false;
  }
}
