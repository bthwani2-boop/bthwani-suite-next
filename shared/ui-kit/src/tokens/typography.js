"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typography = exports.fontWeights = exports.fontFamilies = void 0;
exports.fontFamilies = {
    arabic: "system-ui",
    latin: "system-ui",
    display: "system-ui",
    mono: "ui-monospace"
};
exports.fontWeights = {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    black: "800"
};
exports.typography = {
    display: { fontSize: 36, lineHeight: 44, fontWeight: exports.fontWeights.bold, letterSpacing: -0.4 },
    hero: { fontSize: 30, lineHeight: 38, fontWeight: exports.fontWeights.bold, letterSpacing: -0.3 },
    titleLg: { fontSize: 24, lineHeight: 32, fontWeight: exports.fontWeights.bold, letterSpacing: -0.2 },
    titleMd: { fontSize: 20, lineHeight: 28, fontWeight: exports.fontWeights.semibold, letterSpacing: 0 },
    titleSm: { fontSize: 18, lineHeight: 26, fontWeight: exports.fontWeights.semibold, letterSpacing: 0 },
    bodyLg: { fontSize: 17, lineHeight: 27, fontWeight: exports.fontWeights.regular, letterSpacing: 0 },
    body: { fontSize: 15, lineHeight: 24, fontWeight: exports.fontWeights.regular, letterSpacing: 0 },
    bodyStrong: { fontSize: 15, lineHeight: 24, fontWeight: exports.fontWeights.semibold, letterSpacing: 0 },
    bodySm: { fontSize: 14, lineHeight: 21, fontWeight: exports.fontWeights.regular, letterSpacing: 0 },
    label: { fontSize: 13, lineHeight: 18, fontWeight: exports.fontWeights.semibold, letterSpacing: 0.1 },
    caption: { fontSize: 12, lineHeight: 17, fontWeight: exports.fontWeights.medium, letterSpacing: 0.1 },
    code: { fontSize: 13, lineHeight: 19, fontWeight: exports.fontWeights.medium, letterSpacing: 0 }
};
//# sourceMappingURL=typography.js.map