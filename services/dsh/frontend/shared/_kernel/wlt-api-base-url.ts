export function resolveWltApiBaseUrl(): string {
  if (typeof process !== "undefined" && process.env?.WLT_API_URL) {
    return process.env.WLT_API_URL.replace(/\/$/, "");
  }
  return "http://localhost:58083";
}
