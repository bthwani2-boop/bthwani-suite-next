"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.theme = exports.themeKernel = exports.themes = void 0;
const tokens_1 = require("../tokens");
exports.themes = {
    light: tokens_1.lightThemeColors,
    dark: tokens_1.darkThemeColors
};
exports.themeKernel = {
    themes: exports.themes,
    spacing: tokens_1.spacing,
    radius: tokens_1.radius,
    elevation: tokens_1.elevation,
    motion: tokens_1.motion,
    sizing: tokens_1.sizing,
    breakpoints: tokens_1.breakpoints,
    typography: tokens_1.typography,
    fontFamilies: tokens_1.fontFamilies,
    fontWeights: tokens_1.fontWeights,
    borders: tokens_1.borders,
    opacity: tokens_1.opacity,
    zIndex: tokens_1.zIndex,
    direction: tokens_1.direction
};
exports.theme = exports.themeKernel;
//# sourceMappingURL=index.js.map