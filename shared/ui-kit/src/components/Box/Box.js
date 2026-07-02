"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Box = Box;
const ui_kit_1 = require("@bthwani/ui-kit");
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const spacing_1 = require("../../tokens/spacing");
function Box({ children, style, padding, paddingY, paddingX, gap, background, radiusToken, border, borderTone, layoutDirection, justify, align, }) {
    const isRTL = react_native_1.I18nManager.isRTL;
    const rowDir = isRTL ? 'row-reverse' : 'row';
    const boxStyle = {
        flexDirection: layoutDirection === 'row' ? rowDir : 'column',
        gap: gap ? spacing_1.spacing[gap] || gap * 4 : undefined,
        padding: padding ? spacing_1.spacing[padding] || padding * 4 : undefined,
        paddingVertical: paddingY ? spacing_1.spacing[paddingY] || paddingY * 4 : undefined,
        paddingHorizontal: paddingX ? spacing_1.spacing[paddingX] || paddingX * 4 : undefined,
        backgroundColor: background === 'surfaceInset' ? ui_kit_1.colorRoles.surfaceBase : background === 'surface' ? ui_kit_1.colorRoles.surfaceBase : undefined,
        borderRadius: radiusToken === 'md' ? 8 : radiusToken === 'lg' ? 12 : undefined,
        borderWidth: border ? 1 : undefined,
        borderColor: borderTone === 'line' ? ui_kit_1.colorRoles.surfaceBase : undefined,
        justifyContent: justify === 'space-between' ? 'space-between' : justify,
        alignItems: align === 'center' ? 'center' : align,
    };
    return <react_native_1.View style={[boxStyle, style]}>{children}</react_native_1.View>;
}
//# sourceMappingURL=Box.js.map