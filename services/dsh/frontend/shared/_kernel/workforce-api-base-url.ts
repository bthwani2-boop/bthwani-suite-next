declare const process:
  | { readonly env?: Readonly<Record<string, string | undefined>> }
  | undefined;

/**
 * Workforce transport owner. Control-panel requests use the same-origin BFF;
 * native apps keep direct bearer-token calls.
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
  return "http://localhost:58086";
}
