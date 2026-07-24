const CLIENT_DEEP_LINK_PROTOCOL = "bthwani-client-next:";

export function notificationActionFromDeepLink(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== CLIENT_DEEP_LINK_PROTOCOL) return null;
    const path = `${parsed.hostname}${parsed.pathname}`.replace(/^\/+|\/+$/g, "");
    return path ? `/${path}` : null;
  } catch {
    return null;
  }
}
