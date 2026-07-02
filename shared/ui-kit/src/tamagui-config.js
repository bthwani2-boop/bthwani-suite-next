"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tamaguiConfig = void 0;
const v5_1 = require("@tamagui/config/v5");
const tamagui_1 = require("tamagui");
const tokens_1 = require("./tokens");
exports.tamaguiConfig = (0, tamagui_1.createTamagui)({
    ...v5_1.defaultConfig,
    tokens: {
        ...v5_1.defaultConfig.tokens,
        color: tokens_1.tamaguiColorTokens,
        space: {
            ...v5_1.defaultConfig.tokens.space,
            ...tokens_1.spacing
        },
        size: {
            ...v5_1.defaultConfig.tokens.size,
            ...tokens_1.sizing
        },
        radius: {
            ...v5_1.defaultConfig.tokens.radius,
            ...tokens_1.radius
        },
        zIndex: {
            ...v5_1.defaultConfig.tokens.zIndex,
            ...tokens_1.zIndex
        }
    },
    themes: {
        ...v5_1.defaultConfig.themes,
        light: {
            ...v5_1.defaultConfig.themes.light,
            ...tokens_1.lightThemeColors
        },
        dark: {
            ...v5_1.defaultConfig.themes.dark,
            ...tokens_1.darkThemeColors
        }
    },
    media: {
        ...v5_1.defaultConfig.media,
        ...tokens_1.media
    },
    shorthands: {
        ...v5_1.defaultConfig.shorthands,
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
exports.default = exports.tamaguiConfig;
//# sourceMappingURL=tamagui-config.js.map