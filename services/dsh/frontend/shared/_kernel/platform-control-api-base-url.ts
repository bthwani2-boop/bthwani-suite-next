/**
 * Same-origin BFF base URL for platform-control.
 * The browser uses HttpOnly control-panel cookies; bearer tokens stay server-side.
 */
export function resolvePlatformControlApiBaseUrl(): string {
  return "/api/platform-control";
}
