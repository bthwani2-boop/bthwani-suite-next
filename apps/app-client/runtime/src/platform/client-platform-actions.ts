import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";

export async function performClientSelectionHaptic(): Promise<void> {
  await Haptics.selectionAsync().catch(() => undefined);
}

export async function performClientSuccessHaptic(): Promise<void> {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}

export async function openClientExternalUrl(url: string): Promise<boolean> {
  const normalized = url.trim();
  if (!/^https:\/\//i.test(normalized)) return false;
  const result = await WebBrowser.openBrowserAsync(normalized);
  return result.type !== "cancel";
}
