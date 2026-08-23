declare const process:
  | { readonly env?: Readonly<Record<string, string | undefined>> }
  | undefined;

function isReactNative(): boolean {
  return typeof navigator !== "undefined" && navigator.product === "ReactNative";
}

function isWorkforceDeviceLoopbackBridgeEnabled(): boolean {
  if (typeof process === "undefined" || !process.env) return false;
  const expoFlag = process.env.EXPO_PUBLIC_ADB_REVERSE_ENABLED?.trim().toLowerCase();
  const runtimeFlag = process.env.BTHWANI_ADB_REVERSE_ENABLED?.trim().toLowerCase();
  return expoFlag === "true" || runtimeFlag === "1" || runtimeFlag === "true";
}

/**
 * Workforce transport owner. The governed mobile launcher always injects an
 * explicit URL: LAN uses the Mobile Dev Gateway and ADB uses verified loopback
 * reverse. The fallback below exists only for direct development invocations:
 * Android emulator -> 10.0.2.2, host/web/ADB-loopback -> 127.0.0.1.
 */
export function resolveWorkforceApiBaseUrl(): string {
  if (
    typeof process !== "undefined" &&
    process.env?.["NEXT_PUBLIC_CONTROL_PANEL_BFF_ENABLED"] === "true"
  ) {
    return "/api/workforce";
  }

  if (typeof process !== "undefined" && process.env) {
    const configured =
      process.env["EXPO_PUBLIC_WORKFORCE_API_BASE_URL"] ??
      process.env["NEXT_PUBLIC_WORKFORCE_API_BASE_URL"];
    if (configured && configured.trim().length > 0) return configured.trim();
  }

  return isReactNative() && !isWorkforceDeviceLoopbackBridgeEnabled()
    ? "http://10.0.2.2:18086"
    : "http://127.0.0.1:18086";
}
