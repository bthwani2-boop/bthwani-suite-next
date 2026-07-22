import { useEffect } from "react";
import { Linking, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { registerIdentityBeforeSessionEndHook } from "@bthwani/core-identity";
import {
  deactivateNotificationPushEndpoint,
  upsertNotificationPushEndpoint,
} from "./notifications.api";

const PUSH_DEVICE_KEY_PREFIX = "bthwani-dsh-push-device";

type DshMobileAppKey = "app-client" | "app-partner" | "app-captain" | "app-field";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

function notificationPermissionGranted(
  status: Notifications.NotificationPermissionsStatus,
): boolean {
  return status.granted
    || status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("bthwani-operational", {
      name: "إشعارات بثواني التشغيلية",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  if (notificationPermissionGranted(existing)) return true;
  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });
  return notificationPermissionGranted(requested);
}

async function resolvePushDeviceId(appKey: string): Promise<string> {
  const storageKey = `${PUSH_DEVICE_KEY_PREFIX}:${appKey}`;
  const existing = await SecureStore.getItemAsync(storageKey);
  if (existing) return existing;

  const generated = `${appKey}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
  await SecureStore.setItemAsync(storageKey, generated);
  return generated;
}

function resolveSafeActionUrl(actionUrl: string, appScheme: string): string | null {
  const value = actionUrl.trim();
  if (!value) return null;
  if (value.startsWith("https://") || value.startsWith("http://")) return value;
  if (value.startsWith(`${appScheme}://`)) return value;
  if (value.includes(":")) return null;
  return `${appScheme}://${value.replace(/^\/+/, "")}`;
}

async function openNotificationAction(
  response: Notifications.NotificationResponse | null,
  appScheme: string,
): Promise<void> {
  if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
  const data = response.notification.request.content.data as Record<string, unknown>;
  const actionUrl = typeof data.actionUrl === "string" ? data.actionUrl : "";
  const safeUrl = resolveSafeActionUrl(actionUrl, appScheme);
  if (!safeUrl || !(await Linking.canOpenURL(safeUrl))) return;
  await Linking.openURL(safeUrl);
}

export function useDshMobilePushRegistration(
  authKind: string,
  appKey: DshMobileAppKey,
  appScheme: string,
): void {
  useEffect(() => {
    if (authKind !== "authenticated" || Platform.OS === "web") return undefined;

    let active = true;
    let unregisterSessionEndHook: (() => void) | undefined;

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      void openNotificationAction(response, appScheme);
    });

    void Notifications.getLastNotificationResponseAsync().then(async (response) => {
      if (!active || response === null) return;
      await openNotificationAction(response, appScheme);
      await Notifications.clearLastNotificationResponseAsync();
    });

    void (async () => {
      try {
        const permissionGranted = await ensureNotificationPermission();
        if (!permissionGranted || !active) return;

        const token = (await Notifications.getExpoPushTokenAsync()).data;
        const deviceId = await resolvePushDeviceId(appKey);
        if (!active) return;

        await upsertNotificationPushEndpoint({
          provider: "expo",
          endpointToken: token,
          deviceId,
          platform: Platform.OS === "ios" ? "ios" : "android",
        });
        if (!active) return;

        unregisterSessionEndHook = registerIdentityBeforeSessionEndHook(async () => {
          await deactivateNotificationPushEndpoint(deviceId).catch(() => undefined);
        });
      } catch (error) {
        // Registration is retried when the authenticated app root mounts again;
        // notification inbox remains available even when push registration fails.
        console.warn(`[${appKey}] push registration failed`, error);
      }
    })();

    return () => {
      active = false;
      unregisterSessionEndHook?.();
      responseSubscription.remove();
    };
  }, [appKey, appScheme, authKind]);
}
