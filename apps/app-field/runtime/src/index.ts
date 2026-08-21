import React, { useEffect } from "react";
import "./platform/dsh-capabilities";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BthwaniUiProvider } from "@bthwani/ui-kit";
import { registerIdentityBeforeSessionEndHook } from "@bthwani/core-identity";
import {
  BthwaniQueryProvider,
  clearBthwaniQueryClient,
  createBthwaniOfflineMutationQueue,
  createBthwaniQueryClient,
  wireBatteryAwareQueue,
  wireNetInfoOnlineManager,
} from "@bthwani/data-runtime";
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
const queryPersistenceKey = `bthwani-query-cache:v2:${APP_KEY}`;
const mutationQueue = createBthwaniOfflineMutationQueue(`bthwani-offline-mutations:v1:${APP_KEY}`);

export function MobileRuntimeProviders({ children }: { readonly children: React.ReactNode }) {
  useEffect(() => {
    const detachNetwork = wireNetInfoOnlineManager(queryClient, mutationQueue);
    const detachPower = wireBatteryAwareQueue(mutationQueue);
    const detachSession = registerIdentityBeforeSessionEndHook(async () => {
      await Promise.all([
        clearBthwaniQueryClient(queryClient, queryPersistenceKey),
        mutationQueue.clear(),
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
      React.createElement(BthwaniUiProvider, null, children),
    ),
  );
}
