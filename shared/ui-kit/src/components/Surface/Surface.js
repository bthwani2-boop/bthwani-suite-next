"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Surface = Surface;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const colors_1 = require("../../tokens/colors");
const radius_1 = require("../../tokens/radius");
const toneBg = {
    default: colors_1.colorRoles.surfaceBase,
    raised: colors_1.colorRoles.surfaceMuted,
    inset: colors_1.colorRoles.surfaceInset,
    action: colors_1.colorRoles.brandActionSoft,
    success: colors_1.colorRoles.surfaceBase,
    warning: colors_1.colorRoles.surfaceBase,
    danger: colors_1.colorRoles.surfaceBase,
    info: colors_1.colorRoles.surfaceBase,
};
const toneBorder = {
    default: colors_1.colorRoles.borderSubtle,
    raised: colors_1.colorRoles.borderStrong,
    inset: colors_1.colorRoles.borderSubtle,
    action: colors_1.colorRoles.brandAction,
    success: colors_1.colorRoles.success,
    warning: colors_1.colorRoles.warning,
    danger: colors_1.colorRoles.danger,
    info: colors_1.colorRoles.info,
};
function Surface({ centered, tone = "default", borderless, fill, padding, gap, width, maxWidth, children, style }) {
    return (<react_native_1.View style={[
            {
                backgroundColor: toneBg[tone] ?? colors_1.colorRoles.surfaceBase,
                borderColor: toneBorder[tone] ?? colors_1.colorRoles.borderSubtle,
                borderWidth: borderless ? 0 : 1,
                borderRadius: radius_1.radius.lg ?? 12,
                padding: typeof padding === "number" ? padding * 4 : 16,
                gap: typeof gap === "number" ? gap * 4 : 12,
                flex: fill ? 1 : undefined,
                width: width,
                maxWidth: maxWidth,
                alignItems: centered ? "center" : undefined,
            },
            style,
        ]}>
      {children}
    </react_native_1.View>);
}
//# sourceMappingURL=Surface.js.map