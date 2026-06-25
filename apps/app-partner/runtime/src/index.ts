import React from "react";
import { registerRootComponent } from "expo";
import { BthwaniUiProvider } from "@bthwani/ui-kit";
import App from "./App";

function Root() {
  return React.createElement(
    BthwaniUiProvider,
    null,
    React.createElement(App)
  );
}

registerRootComponent(Root);
