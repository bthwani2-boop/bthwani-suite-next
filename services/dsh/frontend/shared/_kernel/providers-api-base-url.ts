declare const process:
  | { readonly env?: Readonly<Record<string, string | undefined>> }
  | undefined;

/** Providers transport owner for browser BFF and direct non-browser runtimes. */
export function resolveProvidersApiBaseUrl(): string {
  if (
    typeof process !== "undefined" &&
    process.env?.["NEXT_PUBLIC_CONTROL_PANEL_BFF_ENABLED"] === "true"
  ) {
    return "/api/providers";
  }

  if (typeof process !== "undefined" && process.env) {
    const configured = process.env["NEXT_PUBLIC_PROVIDERS_API_BASE_URL"];
    if (configured && configured.trim().length > 0) return configured.trim();
  }
  return "http://localhost:58087";
}
