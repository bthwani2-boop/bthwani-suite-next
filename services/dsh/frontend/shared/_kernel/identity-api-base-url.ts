declare const process:
  | { readonly env?: Readonly<Record<string, string | undefined>> }
  | undefined;

/**
 * Identity transport owner. The control panel uses a same-origin HttpOnly BFF;
 * native apps keep direct bearer transport backed by SecureStore.
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
  return "http://localhost:58082";
}
