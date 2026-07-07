"use client";

import React from "react";
import { TamaguiProvider, Theme } from "tamagui";
import { tamaguiConfig } from "./tamagui-config";

export type BthwaniUiProviderProps = {
  children?: React.ReactNode;
  defaultTheme?: "light" | "dark";
};

export function BthwaniUiProvider({
  children,
  defaultTheme = "light"
}: BthwaniUiProviderProps) {
  return React.createElement(
    TamaguiProvider,
    {
      config: tamaguiConfig,
      defaultTheme
    },
    React.createElement(
      Theme,
      {
        name: defaultTheme
      },
      children
    )
  );
}
