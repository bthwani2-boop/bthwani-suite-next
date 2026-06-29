export * from "./tokens";
export * from "./theme";
export * from "./components";
export * from "./primitives";
export * from "./patterns";
export { default as tamaguiConfig, tamaguiConfig as bthwaniTamaguiConfig } from "./tamagui-config";
export type { TamaguiConfig } from "./tamagui-config";
export { BthwaniUiProvider } from "./provider";

import { I18nManager } from "react-native";
export { useTheme } from "tamagui";
export function useDirection() {
  const isRTL = I18nManager.isRTL;
  return {
    direction: isRTL ? ("rtl" as const) : ("ltr" as const),
    isRTL,
  };
}
export { resolveRowDirection } from "./tokens/direction";
