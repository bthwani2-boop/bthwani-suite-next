import React, { useEffect } from "react";
import { registerRootComponent } from "expo";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BthwaniUiProvider } from "@bthwani/ui-kit";
import { BthwaniQueryProvider, wireNetInfoOnlineManager, createBthwaniQueryClient } from "@bthwani/data-runtime";
import App from "./App";

const queryClient = createBthwaniQueryClient();

function Root() {
  useEffect(() => {
    return wireNetInfoOnlineManager(queryClient);
  }, []);

  return React.createElement(
    SafeAreaProvider,
    null,
    React.createElement(
      BthwaniQueryProvider,
      { client: queryClient },
      React.createElement(
        BthwaniUiProvider,
        null,
        React.createElement(App)
      )
    )
  );
}

registerRootComponent(Root);
