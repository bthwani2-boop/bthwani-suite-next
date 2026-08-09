declare const process:
  | { readonly env?: Readonly<Record<string, string | undefined>> }
  | undefined;

/**
 * Resolve the Identity transport at the Identity package boundary.
 * The control panel may use a same-origin HttpOnly BFF; native apps use the
 * direct runtime URL backed by bearer sessions in SecureStore. Local Android
 * traffic reaches host loopback through the governed adb reverse contract.
 */
export function resolveIdentityApiBaseUrl(): string {
  if (
    typeof process !== "undefined" &&
    process.env?.["NEXT_PUBLIC_CONTROL_PANEL_BFF_ENABLED"] === "true"
  ) {
    return "/api/identity";
  }

  if (typeof process !== "undefined" && process.env) {
    const configured =
      process.env["EXPO_PUBLIC_IDENTITY_API_BASE_URL"] ??
      process.env["NEXT_PUBLIC_IDENTITY_API_BASE_URL"];
    if (configured && configured.trim().length > 0) return configured.trim();
  }

  return "http://127.0.0.1:58082";
}
