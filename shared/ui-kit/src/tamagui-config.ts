import { defaultConfig } from "@tamagui/config/v5";
import { createTamagui } from "tamagui";
import { colorRoles } from "./tokens";

export const tamaguiConfig = createTamagui({
  ...defaultConfig,
  themes: {
    ...defaultConfig.themes,
    light: {
      ...defaultConfig.themes.light,
      background: colorRoles.surfaceBase,
      color: colorRoles.textPrimary,
      borderColor: colorRoles.borderSubtle,
      accentBackground: colorRoles.brandAction,
      accentColor: colorRoles.textInverse
    },
    dark: {
      ...defaultConfig.themes.dark,
      background: colorRoles.brandStructure,
      color: colorRoles.textInverse,
      borderColor: colorRoles.borderStrong,
      accentBackground: colorRoles.brandAction,
      accentColor: colorRoles.textInverse
    }
  }
});

export type TamaguiConfig = typeof tamaguiConfig;

declare module "tamagui" {
  interface TamaguiCustomConfig extends TamaguiConfig {}
}

export default tamaguiConfig;
