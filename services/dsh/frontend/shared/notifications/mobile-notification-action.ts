import { Linking } from "react-native";

let activeMobileAppScheme: string | null = null;

export function setActiveDshMobileAppScheme(appScheme: string | null): void {
  activeMobileAppScheme = appScheme?.trim().replace(/:\/\/$/, "") || null;
}

export function resolveSafeDshNotificationActionUrl(
  actionUrl: string,
  appScheme: string,
): string | null {
  const value = actionUrl.trim();
  const scheme = appScheme.trim().replace(/:\/\/$/, "");
  if (!value || !scheme) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith(`${scheme}://`)) return value;
  if (value.includes(":")) return null;
  return `${scheme}://${value.replace(/^\/+/, "")}`;
}

export async function openDshNotificationActionUrl(
  actionUrl: string,
  appScheme: string,
): Promise<void> {
  const resolvedUrl = resolveSafeDshNotificationActionUrl(actionUrl, appScheme);
  if (!resolvedUrl || !(await Linking.canOpenURL(resolvedUrl))) return;
  await Linking.openURL(resolvedUrl);
}

export async function openDshMobileNotificationActionUrl(actionUrl: string): Promise<void> {
  if (!activeMobileAppScheme) return;
  await openDshNotificationActionUrl(actionUrl, activeMobileAppScheme);
}
