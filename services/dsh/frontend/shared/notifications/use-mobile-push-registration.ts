import { useEffect } from "react";
import { registerIdentityBeforeSessionEndHook } from "@bthwani/core-identity";
import {
  deactivateNotificationPushEndpoint,
  upsertNotificationPushEndpoint,
} from "./notifications.api";
import {
  getDshMobileNotificationRuntime,
  type DshMobileNotificationResponse,
} from "../mobile-capabilities";

type DshMobileAppKey = "app-client" | "app-partner" | "app-captain" | "app-field";

function resolveSafeActionUrl(actionUrl: string, appScheme: string): string | null {
  const value = actionUrl.trim();
  if (!value) return null;
  if (value.startsWith("https://")) return value;
  if (value.startsWith(`${appScheme}://`)) return value;
  if (value.includes(":")) return null;
  return `${appScheme}://${value.replace(/^\/+/, "")}`;
}

async function openNotificationAction(
  response: DshMobileNotificationResponse | null,
  appScheme: string,
): Promise<void> {
  const runtime = getDshMobileNotificationRuntime();
  if (!response || response.actionIdentifier !== runtime.defaultActionIdentifier) return;
  const actionUrl = response.actionUrl ?? "";
  const safeUrl = resolveSafeActionUrl(actionUrl, appScheme);
  if (!safeUrl) return;
  await runtime.openUrl(safeUrl);
}

export function useDshMobilePushRegistration(
  authKind: string,
  appKey: DshMobileAppKey,
  appScheme: string,
): void {
  useEffect(() => {
    const runtime = getDshMobileNotificationRuntime();
    if (authKind !== "authenticated" || runtime.platform === "web") return undefined;
    if (runtime.platform === "android" && !runtime.androidNativePushConfigured()) return undefined;

    let active = true;
    let deviceId: string | undefined;
    let endpointRegistered = false;
    let unregisterSessionEndHook: (() => void) | undefined;
    let tokenSubscription: { remove(): void } | undefined;
    let responseSubscription: { remove(): void } | undefined;

    const addResponseListener = runtime.addResponseListener;
    if (typeof addResponseListener === "function") {
      responseSubscription = addResponseListener((response) => {
        void openNotificationAction(response, appScheme);
      });
    }

    const getLastResponse = runtime.getLastResponse;
    if (typeof getLastResponse === "function") {
      void getLastResponse().then(async (response) => {
        if (!active || response === null) return;
        await openNotificationAction(response, appScheme);
        const clearLastResponse = runtime.clearLastResponse;
        if (typeof clearLastResponse === "function") await clearLastResponse();
      }).catch((error) => console.warn(`[${appKey}] notification response handling failed`, error));
    }

    const deactivateRegisteredEndpoint = async (): Promise<void> => {
      if (!deviceId || !endpointRegistered) return;
      endpointRegistered = false;
      await deactivateNotificationPushEndpoint(deviceId);
    };

    unregisterSessionEndHook = registerIdentityBeforeSessionEndHook(async () => {
      active = false;
      await deactivateRegisteredEndpoint().catch(() => undefined);
    });

    void (async () => {
      try {
        const permissionGranted = await runtime.ensurePermission();
        if (!permissionGranted || !active) return;

        const readExpoToken = () => runtime.getPushToken();

        deviceId = await runtime.resolveDeviceId(appKey);
        if (!active) return;
        endpointRegistered = true;

        const registerToken = async (endpointToken: string): Promise<void> => {
          if (!active || !deviceId) return;
          await upsertNotificationPushEndpoint({
            provider: "expo",
            endpointToken,
            deviceId,
            platform: runtime.platform === "ios" ? "ios" : "android",
          });
        };

        await registerToken(await readExpoToken());
        if (!active) {
          await deactivateRegisteredEndpoint().catch(() => undefined);
          return;
        }

        const addPushTokenListener = runtime.addPushTokenListener;
        if (typeof addPushTokenListener === "function") {
          tokenSubscription = addPushTokenListener(() => {
            void readExpoToken()
              .then(registerToken)
              .catch((error) => console.warn(`[${appKey}] push token rotation failed`, error));
          });
        }

      } catch (error) {
        console.warn(
          `[${appKey}] push registration failed; rebuild the development client after configuring GOOGLE_SERVICES_JSON`,
          error,
        );
      }
    })();

    return () => {
      active = false;
      unregisterSessionEndHook?.();
      tokenSubscription?.remove();
      responseSubscription?.remove();
      void deactivateRegisteredEndpoint().catch(() => undefined);
    };
  }, [appKey, appScheme, authKind]);
}
