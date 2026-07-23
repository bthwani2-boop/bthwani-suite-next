import { useEffect } from "react";
import { Linking, Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { registerIdentityBeforeSessionEndHook } from "@bthwani/core-identity";
import {
  deactivateNotificationPushEndpoint,
  upsertNotificationPushEndpoint,
} from "./notifications.api";

const PUSH_DEVICE_KEY_PREFIX = "bthwani-dsh-push-device";
let fallbackDeviceSequence = 0;

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

function createPushDeviceId(appKey: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return `${appKey}-${uuid}`;
  fallbackDeviceSequence += 1;
  return `${appKey}-${Date.now().toString(36)}-${fallbackDeviceSequence.toString(36)}`;
}

async function resolvePushDeviceId(appKey: string): Promise<string> {
  const storageKey = `${PUSH_DEVICE_KEY_PREFIX}:${appKey}`;
  const existing = await SecureStore.getItemAsync(storageKey);
  if (existing) return existing;

  const generated = createPushDeviceId(appKey);
  await SecureStore.setItemAsync(storageKey, generated);
  return generated;
}

function resolveSafeActionUrl(actionUrl: string, appScheme: string): string | null {
  const value = actionUrl.trim();
  if (!value) return null;
  if (value.startsWith("https://")) return value;
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

function resolveExpoProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
}

export function useDshMobilePushRegistration(
  authKind: string,
  appKey: DshMobileAppKey,
  appScheme: string,
): void {
  useEffect(() => {
    if (authKind !== "authenticated" || Platform.OS === "web") return undefined;

    let active = true;
    let deviceId: string | undefined;
    let unregisterSessionEndHook: (() => void) | undefined;
    let tokenSubscription: Notifications.EventSubscription | undefined;

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

        const projectId = resolveExpoProjectId();
        const token = (
          await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
        ).data;
        deviceId = await resolvePushDeviceId(appKey);
        if (!active) return;

        const registerToken = async (endpointToken: string): Promise<void> => {
          if (!active || !deviceId) return;
          await upsertNotificationPushEndpoint({
            provider: "expo",
            endpointToken,
            deviceId,
            platform: Platform.OS === "ios" ? "ios" : "android",
          });
        };

        await registerToken(token);
        if (!active) return;

        tokenSubscription = Notifications.addPushTokenListener((nextToken) => {
          if (nextToken.type !== "expo") return;
          void registerToken(nextToken.data).catch((error) => {
            console.warn(`[${appKey}] push token rotation failed`, error);
          });
        });

        unregisterSessionEndHook = registerIdentityBeforeSessionEndHook(async () => {
          if (deviceId) await deactivateNotificationPushEndpoint(deviceId).catch(() => undefined);
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
      tokenSubscription?.remove();
      responseSubscription.remove();
    };
  }, [appKey, appScheme, authKind]);
}
