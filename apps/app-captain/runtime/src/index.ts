import React, { useEffect } from "react";
import "./platform/dsh-capabilities";
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
import { initSentry } from "./observability/sentry";

export const sentryEnabled = initSentry();

const APP_KEY = "app-captain";
const queryClient = createBthwaniQueryClient();
const queryPersistenceKey = `bthwani-query-cache:v3:${APP_KEY}`;

export function MobileRuntimeProviders({ children }: { readonly children: React.ReactNode }) {
  useEffect(() => {
    const detachNetwork = wireNetInfoOnlineManager(queryClient);
    const detachPower = wireBatteryAwareQueue();
    const detachSession = registerIdentityBeforeSessionEndHook(async () => {
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
