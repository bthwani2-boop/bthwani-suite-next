const GOOGLE_MAPS_JAVASCRIPT_API_BASE_URL = "https://maps.googleapis.com/maps/api/js";

export function readGoogleMapsBrowserApiKey(): string | null {
  const value = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_API_KEY?.trim();
  return value ? value : null;
}

export function buildGoogleMapsJavaScriptApiUrl(
  apiKey: string,
  callbackName: string,
): string {
  const query = new URLSearchParams({
    key: apiKey,
    v: "weekly",
    callback: callbackName,
  });
  return `${GOOGLE_MAPS_JAVASCRIPT_API_BASE_URL}?${query.toString()}`;
}
