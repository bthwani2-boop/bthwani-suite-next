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
import { clearFieldOfflineQueue, configureFieldOfflineQueueStorage } from "@bthwani/dsh/app-field";
import { initSentry } from "./observability/sentry";

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
      await Promise.all([
        clearBthwaniQueryClient(queryClient, queryPersistenceKey),
        clearFieldOfflineQueue(),
      ]);
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
