import { resolveDshApiBaseUrl, validateDshApiBaseUrl } from "./dsh-api-base-url";

export function resolveDshMediaUrl(
  raw: string | null | undefined,
  apiBaseUrl = resolveDshApiBaseUrl(),
): string | null {
  const value = raw?.trim();
  if (!value) return null;

  const hasValidApiBaseUrl = validateDshApiBaseUrl(apiBaseUrl);

  try {
    const media = /^https?:\/\//i.test(value)
      ? new URL(value)
      : hasValidApiBaseUrl
        ? new URL(value, apiBaseUrl)
        : null;

    if (media === null || (media.protocol !== "http:" && media.protocol !== "https:")) {
      return null;
    }

    if (
      (media.hostname === "localhost" || media.hostname === "127.0.0.1") &&
      hasValidApiBaseUrl
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
