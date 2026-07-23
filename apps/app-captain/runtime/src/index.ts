import React, { useEffect } from "react";
import { registerRootComponent } from "expo";
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
import { initSentry } from "./observability/sentry";
import App from "./App";

initSentry();

const APP_KEY = "app-captain";
const queryClient = createBthwaniQueryClient();
const queryPersistenceKey = `bthwani-query-cache:v2:${APP_KEY}`;
const mutationQueue = createBthwaniOfflineMutationQueue(
  `bthwani-offline-mutations:v1:${APP_KEY}`,
);

function Root() {
  useEffect(() => {
    const detachNetwork = wireNetInfoOnlineManager(queryClient, mutationQueue);
    const detachPower = wireBatteryAwareQueue(mutationQueue);
    const detachSession = registerIdentityBeforeSessionEndHook(async () => {
      await Promise.all([
        clearBthwaniQueryClient(queryClient, queryPersistenceKey),
        mutationQueue.clear(),
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
      React.createElement(BthwaniUiProvider, null, React.createElement(App)),
    ),
  );
}

registerRootComponent(Root);
