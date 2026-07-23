import React from "react";
import { registerRootComponent } from "expo";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BthwaniUiProvider } from "@bthwani/ui-kit";
import { initSentry } from "./observability/sentry";
import App from "./App";

initSentry();

function Root() {
  return React.createElement(
    SafeAreaProvider,
    null,
    React.createElement(
      BthwaniUiProvider,
      null,
      React.createElement(App)
    )
  );
}

registerRootComponent(Root);
