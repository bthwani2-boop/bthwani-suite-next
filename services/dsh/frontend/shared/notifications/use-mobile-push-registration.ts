import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { registerIdentityBeforeSessionEndHook } from "@bthwani/core-identity";
import {
  deactivateNotificationPushEndpoint,
  upsertNotificationPushEndpoint,
} from "./notifications.api";

const PUSH_DEVICE_KEY_PREFIX = "bthwani-dsh-push-device";

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

export function useDshMobilePushRegistration(
  authKind: string,
  appKey: "app-client" | "app-partner" | "app-captain" | "app-field",
): void {
  useEffect(() => {
    if (authKind !== "authenticated" || Platform.OS === "web") return undefined;

    let active = true;
    let unregisterSessionEndHook: (() => void) | undefined;

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
    };
  }, [appKey, authKind]);
}
