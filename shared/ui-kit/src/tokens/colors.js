"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.colorPalette = exports.tamaguiColorTokens = exports.darkThemeColors = exports.lightThemeColors = exports.statusScale = exports.neutralScale = exports.colorRoles = exports.brandScale = exports.brandRoots = void 0;
exports.alpha = alpha;
exports.brandRoots = {
    brandAction: "#FF500D",
    surfaceBase: "#FFFFFF",
    brandStructure: "#0A2F5C"
};
function alpha(hex, opacity) {
    const normalized = hex.replace("#", "");
    const expanded = normalized.length === 3
        ? normalized
            .split("")
            .map((value) => `${value}${value}`)
            .join("")
        : normalized;
    if (expanded.length !== 6) {
        throw new Error(`Invalid hex color: ${hex}`);
    }
    const red = Number.parseInt(expanded.slice(0, 2), 16);
    const green = Number.parseInt(expanded.slice(2, 4), 16);
    const blue = Number.parseInt(expanded.slice(4, 6), 16);
    return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}
exports.brandScale = {
    action: {
        50: "#FFF3ED",
        100: "#FFE2D4",
        200: "#FFC0A3",
        300: "#FF9A6B",
        400: "#FF7138",
        500: exports.brandRoots.brandAction,
        600: "#E5480C",
        700: "#B73809",
        800: "#8C2B07",
        900: "#641F05"
    },
    structure: {
        50: "#EEF5FC",
        100: "#D8E7F7",
        200: "#B4CFEA",
        300: "#86AED8",
        400: "#4E83BD",
        500: "#275F96",
        600: exports.brandRoots.brandStructure,
        700: "#082744",
        800: "#061D33",
        900: "#041322"
    },
    surface: {
        0: exports.brandRoots.surfaceBase,
        50: "#FFFCF8",
        100: "#F8F5F0",
        200: "#EFE9E0",
        300: "#E3DACE",
        400: "#D2C7B8"
    }
};
exports.colorRoles = {
    brandAction: exports.brandRoots.brandAction,
    brandActionHover: exports.brandScale.action[600],
    brandActionPressed: exports.brandScale.action[700],
    brandActionSoft: exports.brandScale.action[50],
    brandActionTint: alpha(exports.brandRoots.brandAction, 0.12),
    surfaceBase: exports.brandRoots.surfaceBase,
    surfaceWarm: exports.brandScale.surface[50],
    surfaceMuted: exports.brandScale.surface[100],
    surfaceInset: exports.brandScale.surface[200],
    surfaceOverlay: alpha(exports.brandRoots.surfaceBase, 0.86),
    mediaScrimStrong: alpha("#0F172A", 0.78),
    brandStructure: exports.brandRoots.brandStructure,
    brandStructureElevated: exports.brandScale.structure[500],
    brandStructureSoft: exports.brandScale.structure[50],
    brandStructureTint: alpha(exports.brandRoots.brandStructure, 0.12),
    textPrimary: exports.brandRoots.brandStructure,
    textSecondary: exports.brandScale.structure[500],
    textMuted: alpha(exports.brandRoots.brandStructure, 0.68),
    textInverse: exports.brandRoots.surfaceBase,
    textOnMediaMuted: alpha(exports.brandRoots.surfaceBase, 0.4),
    textOnMediaStrong: alpha(exports.brandRoots.surfaceBase, 0.9),
    borderSubtle: alpha(exports.brandRoots.brandStructure, 0.1),
    borderStrong: alpha(exports.brandRoots.brandStructure, 0.18),
    focusRing: alpha(exports.brandRoots.brandAction, 0.34),
    success: "#1F8B4C",
    warning: "#B96A06",
    danger: "#C43B35",
    info: "#295FAA",
    shadowBase: "#000000"
};
exports.neutralScale = {
    0: "#FFFFFF",
    50: "#F8FAFC",
    100: "#F1F5F9",
    200: "#E2E8F0",
    300: "#CBD5E1",
    400: "#94A3B8",
    500: "#64748B",
    600: "#475569",
    700: "#334155",
    800: "#1E293B",
    900: "#0F172A",
    950: "#020617"
};
exports.statusScale = {
    successSoft: "#ECFDF3",
    success: "#1F8B4C",
    successStrong: "#16653A",
    warningSoft: "#FFFBEB",
    warning: "#B96A06",
    warningStrong: "#8E5204",
    dangerSoft: "#FEF2F2",
    danger: "#C43B35",
    dangerStrong: "#9B2F2B",
    infoSoft: "#EFF6FF",
    info: "#295FAA",
    infoStrong: "#214D89"
};
exports.lightThemeColors = {
    background: exports.brandScale.surface[50],
    backgroundAlt: exports.brandRoots.surfaceBase,
    surface: exports.brandRoots.surfaceBase,
    surfaceRaised: exports.brandScale.surface[50],
    surfaceInset: exports.brandScale.surface[100],
    surfaceOverlay: exports.colorRoles.surfaceOverlay,
    color: exports.colorRoles.textPrimary,
    colorSecondary: exports.colorRoles.textSecondary,
    colorMuted: exports.colorRoles.textMuted,
    colorInverse: exports.colorRoles.textInverse,
    borderColor: exports.colorRoles.borderSubtle,
    borderColorStrong: exports.colorRoles.borderStrong,
    focusColor: exports.colorRoles.focusRing,
    action: exports.colorRoles.brandAction,
    actionHover: exports.colorRoles.brandActionHover,
    actionPressed: exports.colorRoles.brandActionPressed,
    actionSoft: exports.colorRoles.brandActionSoft,
    structure: exports.colorRoles.brandStructure,
    structureSoft: exports.colorRoles.brandStructureSoft,
    success: exports.statusScale.success,
    successSoft: exports.statusScale.successSoft,
    warning: exports.statusScale.warning,
    warningSoft: exports.statusScale.warningSoft,
    danger: exports.statusScale.danger,
    dangerSoft: exports.statusScale.dangerSoft,
    info: exports.statusScale.info,
    infoSoft: exports.statusScale.infoSoft,
    shadowColor: exports.colorRoles.shadowBase
};
exports.darkThemeColors = {
    background: exports.neutralScale[950],
    backgroundAlt: exports.neutralScale[900],
    surface: exports.neutralScale[900],
    surfaceRaised: exports.neutralScale[800],
    surfaceInset: exports.neutralScale[950],
    surfaceOverlay: alpha(exports.neutralScale[900], 0.9),
    color: exports.neutralScale[50],
    colorSecondary: exports.neutralScale[200],
    colorMuted: exports.neutralScale[400],
    colorInverse: exports.brandRoots.brandStructure,
    borderColor: alpha(exports.neutralScale[0], 0.12),
    borderColorStrong: alpha(exports.neutralScale[0], 0.2),
    focusColor: alpha(exports.brandRoots.brandAction, 0.5),
    action: exports.brandRoots.brandAction,
    actionHover: exports.brandScale.action[400],
    actionPressed: exports.brandScale.action[300],
    actionSoft: alpha(exports.brandRoots.brandAction, 0.18),
    structure: exports.neutralScale[50],
    structureSoft: exports.neutralScale[800],
    success: "#4ADE80",
    successSoft: alpha("#4ADE80", 0.14),
    warning: "#F5C04E",
    warningSoft: alpha("#F5C04E", 0.14),
    danger: "#F2877A",
    dangerSoft: alpha("#F2877A", 0.14),
    info: "#8BB4E8",
    infoSoft: alpha("#8BB4E8", 0.14),
    shadowColor: exports.colorRoles.shadowBase
};
exports.tamaguiColorTokens = {
    ...exports.colorRoles,
    ...exports.statusScale
};
exports.colorPalette = {
    white: "#FFFFFF",
    black: "#000000",
    redMuted: "#E53935",
    orangeMuted: "#F59E0B",
    orangeSoft: "#FFF3E0",
    redSoft: "#FFEBEE",
    yellowSoft: "#FFF8E1",
    greenSoft: "#E6F9F0",
    dangerSoft: "#FEE8E8",
    infoSoft: "#EAF0FB",
    warningSoft: "#FEF6E4",
    graySoft: "#F3F4F6",
    greenStrong: "#0E7A45",
    dangerStrong: "#C0392B",
    warningStrong: "#B45309",
    grayBorder: "#ECECEC",
    tanBg: "#F5ECE3",
};
//# sourceMappingURL=colors.js.map