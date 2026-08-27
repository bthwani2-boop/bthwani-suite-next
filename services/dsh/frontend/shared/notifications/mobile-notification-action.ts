import { getDshMobileNotificationRuntime } from "../mobile-capabilities";

export function resolveSafeDshNotificationActionUrl(
  actionUrl: string,
  appScheme: string,
): string | null {
  const value = actionUrl.trim();
  const scheme = appScheme.trim().replace(/:\/\/$/, "");
  if (!value || !scheme) return null;
  if (/^https:\/\//i.test(value)) return value;
  if (value.startsWith(`${scheme}://`)) return value;
  if (value.includes(":")) return null;
  return `${scheme}://${value.replace(/^\/+/, "")}`;
}

export async function openDshNotificationActionUrl(
  actionUrl: string,
  appScheme: string,
): Promise<void> {
  const resolvedUrl = resolveSafeDshNotificationActionUrl(actionUrl, appScheme);
  if (!resolvedUrl) return;
  await getDshMobileNotificationRuntime().openUrl(resolvedUrl);
}
