"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.media = exports.breakpoints = void 0;
exports.breakpoints = {
    xs: 0,
    sm: 480,
    md: 768,
    lg: 1024,
    xl: 1280,
    wide: 1440
};
exports.media = {
    xs: { minWidth: exports.breakpoints.xs },
    sm: { minWidth: exports.breakpoints.sm },
    md: { minWidth: exports.breakpoints.md },
    lg: { minWidth: exports.breakpoints.lg },
    xl: { minWidth: exports.breakpoints.xl },
    wide: { minWidth: exports.breakpoints.wide },
    smOnly: { minWidth: exports.breakpoints.sm, maxWidth: exports.breakpoints.md - 1 },
    mdOnly: { minWidth: exports.breakpoints.md, maxWidth: exports.breakpoints.lg - 1 },
    mobile: { maxWidth: exports.breakpoints.md - 1 }
};
//# sourceMappingURL=breakpoints.js.map