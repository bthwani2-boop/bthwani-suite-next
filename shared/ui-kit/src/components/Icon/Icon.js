"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Icon = Icon;
// shared/ui-kit — Icon Component
const react_1 = __importDefault(require("react"));
// We import from @expo/vector-icons/Ionicons since the platform runtime is Expo/React Native.
// Direct dependency is bypassed for this specific UI Kit Component.
const Ionicons_1 = __importDefault(require("@expo/vector-icons/Ionicons"));
const tokens_1 = require("../../tokens");
function Icon({ name, size = 24, tone, color, style, mirrored }) {
    let resolvedColor = color;
    if (!resolvedColor && tone) {
        if (tone === 'brand' || tone === 'action')
            resolvedColor = tokens_1.colorRoles.brandAction;
        else if (tone === 'success')
            resolvedColor = tokens_1.colorRoles.success;
        else if (tone === 'warning')
            resolvedColor = tokens_1.colorRoles.warning;
        else if (tone === 'danger')
            resolvedColor = tokens_1.colorRoles.danger;
        else if (tone === 'muted')
            resolvedColor = tokens_1.colorRoles.textMuted;
    }
    if (!resolvedColor) {
        resolvedColor = tokens_1.colorRoles.textPrimary;
    }
    const transform = mirrored ? [{ scaleX: -1 }] : undefined;
    return (<Ionicons_1.default name={name} size={size} color={resolvedColor} style={[transform ? { transform } : null, style]}/>);
}
exports.default = Icon;
//# sourceMappingURL=Icon.js.map