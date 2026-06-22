import { resolveDshApiBaseUrl, validateDshApiBaseUrl } from "./dsh-api-base-url";

export function resolveDshMediaUrl(
  raw: string | null | undefined,
  apiBaseUrl = resolveDshApiBaseUrl(),
): string | null {
  if (raw == null || raw.trim().length === 0) return null;

  try {
    const media = new URL(raw);
    if (media.protocol !== "http:" && media.protocol !== "https:") return null;

    if (
      (media.hostname === "localhost" || media.hostname === "127.0.0.1") &&
      validateDshApiBaseUrl(apiBaseUrl)
    ) {
      media.hostname = new URL(apiBaseUrl).hostname;
    }

    return media.toString();
  } catch {
    return null;
  }
}

export function resolveDshImageSource(
  raw: string | null | undefined,
): { readonly uri: string } | null {
  const uri = resolveDshMediaUrl(raw);
  return uri === null ? null : { uri };
}
