import { defaultConfig } from "@tamagui/config/v5";
import { createTamagui } from "tamagui";
import {
  darkThemeColors,
  lightThemeColors,
  media,
  radius,
  sizing,
  spacing,
  tamaguiColorTokens,
  zIndex
} from "./tokens";

export const tamaguiConfig = createTamagui({
  ...defaultConfig,
  tokens: {
    ...defaultConfig.tokens,
    color: tamaguiColorTokens,
    space: {
      ...defaultConfig.tokens.space,
      ...spacing
    },
    size: {
      ...defaultConfig.tokens.size,
      ...sizing
    },
    radius: {
      ...defaultConfig.tokens.radius,
      ...radius
    },
    zIndex: {
      ...defaultConfig.tokens.zIndex,
      ...zIndex
    }
  },
  themes: {
    ...defaultConfig.themes,
    light: {
      ...defaultConfig.themes.light,
      ...lightThemeColors
    },
    dark: {
      ...defaultConfig.themes.dark,
      ...darkThemeColors
    }
  },
  media: {
    ...defaultConfig.media,
    ...media
  },
  shorthands: {
    ...defaultConfig.shorthands,
    bg: "backgroundColor",
    m: "margin",
    mt: "marginTop",
    mb: "marginBottom",
    ms: "marginStart",
    me: "marginEnd",
    mx: "marginHorizontal",
    my: "marginVertical",
    p: "padding",
    pt: "paddingTop",
    pb: "paddingBottom",
    ps: "paddingStart",
    pe: "paddingEnd",
    px: "paddingHorizontal",
    py: "paddingVertical"
  }
});

export type TamaguiConfig = typeof tamaguiConfig;

declare module "tamagui" {
  interface TamaguiCustomConfig extends TamaguiConfig {}
}

export default tamaguiConfig;
