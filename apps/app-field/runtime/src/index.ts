import React, { useEffect } from "react";
import "./platform/dsh-capabilities";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MobileUiProvider } from "@bthwani/ui-kit/mobile";
import { registerIdentityBeforeSessionEndHook } from "@bthwani/core-identity";
import {
  BthwaniQueryProvider,
  clearBthwaniQueryClient,
  createBthwaniQueryClient,
  wireNetInfoOnlineManager,
} from "@bthwani/data-runtime";
import { wireBatteryAwareQueue } from "@bthwani/data-runtime/power-policy";
import {
  configureFieldOfflineQueueStorage,
  detachFieldOfflineQueueScope,
} from "@bthwani/dsh/app-field";
import { initSentry } from "./observability/sentry";
import { configureBthwaniSensitiveStorage } from "@bthwani/data-runtime/sensitive-storage-adapter";
import { createBthwaniBrowserSensitiveStorage } from "@bthwani/data-runtime/browser-sensitive-storage";

configureBthwaniSensitiveStorage(
  Platform.OS === "web"
    ? createBthwaniBrowserSensitiveStorage()
    : {
        getItem: (key) => SecureStore.getItemAsync(key),
        setItem: (key, value) => SecureStore.setItemAsync(key, value),
        removeItem: (key) => SecureStore.deleteItemAsync(key),
      },
);

if (Platform.OS !== "web") {
  configureFieldOfflineQueueStorage({
    getItem: (key) => SecureStore.getItemAsync(key),
    setItem: (key, value) => SecureStore.setItemAsync(key, value),
    removeItem: (key) => SecureStore.deleteItemAsync(key),
  });
}

export const sentryEnabled = initSentry();

const APP_KEY = "app-field";
const queryClient = createBthwaniQueryClient();
const queryPersistenceKey = `bthwani-query-cache:v3:${APP_KEY}`;

export function MobileRuntimeProviders({ children }: { readonly children: React.ReactNode }) {
  useEffect(() => {
    const detachNetwork = wireNetInfoOnlineManager(queryClient);
    const detachPower = wireBatteryAwareQueue();
    const detachSession = registerIdentityBeforeSessionEndHook(async () => {
      // Offline field work is durable operational evidence, not session cache.
      // Detach the actor scope before identity teardown, but preserve the queue,
      // unknown results, corrupt archive, and terminal quarantine for the same
      // actor/install scope to reconcile after the next authenticated session.
      detachFieldOfflineQueueScope();
      await clearBthwaniQueryClient(queryClient, queryPersistenceKey);
    });
    return () => {
      detachNetwork();
      detachPower();
      detachSession();
    };
  }, []);

  return React.createElement(
    SafeAreaProvider,
    null,
    React.createElement(
      BthwaniQueryProvider,
      { client: queryClient, persistenceKey: queryPersistenceKey },
      React.createElement(MobileUiProvider, null, children),
    ),
  );
}
