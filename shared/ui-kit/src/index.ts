export * from "./tokens";
export * from "./theme";
export * from "./components";
export * from "./primitives";
export * from "./patterns";
export { BthwaniUiProvider } from "./provider";

// Appearance system — BThwaniAppearanceProvider, useBThwaniAppearance, PortalLayer, useI18n
export {
  BThwaniAppearanceProvider,
  useBThwaniAppearanceContext,
  useBThwaniAppearance,
  useI18n,
  PortalLayer,
} from "./providers";

// Appearance tokens — glass recipes, palette helpers, mode utilities
export {
  bthwaniAppearanceModes,
  isBThwaniAppearanceMode,
  syncBThwaniAppearanceCookie,
  bthwaniAppearancePaletteByMode,
  bthwaniAppearanceThemeColorsByMode,
  bthwaniAppearanceComponentTokensByMode,
  getBThwaniGlassRecipe,
} from "./appearance";
export type { BThwaniAppearanceMode } from "./appearance";

// Foundation token exports — design system primitives
export {
  tokenCssVariables,
  themeByMode,
  amountToArabicText,
  nativeThemeOutputs,
  surfaceContainerRoles,
  shadowLaw,
  typographyRoles,
  neutralPalette,
  brandPalette,
  successPalette,
  warningPalette,
  dangerPalette,
  infoPalette,
  shadowByElevation,
  sizes,
  zIndex,
  opacities,
  letterSpacings,
  resolveFontFamily,
  resolveTextRole,
  resolveLogicalPadding,
  resolveLogicalMargin,
  resolveLogicalBorderRadius,
  resolveTextAlign,
  tamaguiBridge,
} from "./foundation";

// Locales
export { getUiKitCommon } from "./locales";

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
