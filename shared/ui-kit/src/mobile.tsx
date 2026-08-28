import React from "react";
import { useColorScheme } from "react-native";
import { configureNativeIconRenderer } from "./components/Icon/icon-renderer.native";
import { BthwaniUiProvider } from "./provider";

configureNativeIconRenderer();

export type MobileUiProviderProps = {
  children?: React.ReactNode;
};

export function MobileUiProvider({
  children,
}: MobileUiProviderProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? "dark" : "light";

  return React.createElement(
    BthwaniUiProvider,
    { defaultTheme: theme },
    children,
  );
}
