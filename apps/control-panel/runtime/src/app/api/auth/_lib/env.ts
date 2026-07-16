function readServerEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : fallback;
}

/** Server-only Identity base URL. Never exposed to the browser (no NEXT_PUBLIC_ prefix). */
export function resolveIdentityServerBaseUrl(): string {
  return readServerEnv("IDENTITY_API_BASE_URL", "http://localhost:58082");
}

/** Server-only DSH backend base URL used by the /api/dsh proxy route. */
export function resolveDshServerBaseUrl(): string {
  return readServerEnv("DSH_API_BASE_URL", "http://localhost:58080");
}

/** Server-only Workforce backend base URL used by the /api/workforce proxy route. */
export function resolveWorkforceServerBaseUrl(): string {
  return readServerEnv("WORKFORCE_API_BASE_URL", "http://localhost:58086");
}

/** Server-only Platform Control base URL used by the /api/platform-control proxy route. */
export function resolvePlatformControlServerBaseUrl(): string {
  return readServerEnv("PLATFORM_CONTROL_API_BASE_URL", "http://localhost:58088");
}

export function isProductionRuntime(): boolean {
  return process.env["NODE_ENV"] === "production";
}
