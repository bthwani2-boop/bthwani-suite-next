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

export function isProductionRuntime(): boolean {
  return process.env["NODE_ENV"] === "production";
}
