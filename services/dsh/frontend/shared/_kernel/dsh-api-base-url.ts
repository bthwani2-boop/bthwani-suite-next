export function resolveDshApiBaseUrl(): string {
  if (typeof process !== "undefined") {
    const next = (process.env as Record<string, string | undefined>)["NEXT_PUBLIC_DSH_API_BASE_URL"];
    if (next && next.trim().length > 0) return next.trim();
    const expo = (process.env as Record<string, string | undefined>)["EXPO_PUBLIC_DSH_API_BASE_URL"];
    if (expo && expo.trim().length > 0) return expo.trim();
  }
  return "http://localhost:58080";
}

export function validateDshApiBaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname.length > 0;
  } catch {
    return false;
  }
}
