import React, { useEffect } from "react";
import { registerRootComponent } from "expo";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BthwaniUiProvider } from "@bthwani/ui-kit";
import { BthwaniQueryProvider, createBthwaniQueryClient, wireNetInfoOnlineManager } from "@bthwani/data-runtime";
import { initSentry } from "./observability/sentry";
import App from "./App";

initSentry();

const queryClient = createBthwaniQueryClient();

function Root() {
  useEffect(() => wireNetInfoOnlineManager(queryClient), []);

  return React.createElement(
    SafeAreaProvider,
    null,
    React.createElement(
      BthwaniQueryProvider,
      { client: queryClient },
      React.createElement(
        BthwaniUiProvider,
        null,
        React.createElement(App),
      ),
    ),
  );
}

registerRootComponent(Root);
