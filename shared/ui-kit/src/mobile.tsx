import React from "react";
import { useColorScheme } from "react-native";
import { BthwaniUiProvider } from "./provider";

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
