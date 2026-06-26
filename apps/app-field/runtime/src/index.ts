import React from "react";
import { registerRootComponent } from "expo";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BthwaniUiProvider } from "@bthwani/ui-kit";
import App from "./App";

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
