export const MOBILE_APP_KEY_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export function assertSafeMobileAppKey(value, source = "mobile app key") {
  if (typeof value !== "string" || value.length > 64 || !MOBILE_APP_KEY_PATTERN.test(value)) {
    throw new Error(`${source}: must match ${MOBILE_APP_KEY_PATTERN} and be at most 64 characters`);
  }
  return value;
}

export function escapeRegexLiteral(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
