export function getWltApiBaseUrl(): string | undefined {
  if (
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_WLT_API_BASE_URL
  ) {
    return process.env.NEXT_PUBLIC_WLT_API_BASE_URL;
  }
  if (
    typeof process !== "undefined" &&
    process.env.EXPO_PUBLIC_WLT_API_BASE_URL
  ) {
    return process.env.EXPO_PUBLIC_WLT_API_BASE_URL;
  }
  return undefined;
}
