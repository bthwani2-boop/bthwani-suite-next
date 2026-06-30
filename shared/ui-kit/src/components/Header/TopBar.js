"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopBar = TopBar;
const ui_kit_1 = require("@bthwani/ui-kit");
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const Text_1 = require("../Text");
const spacing_1 = require("../../tokens/spacing");
function TopBar({ title, subtitle, variant = 'primary', onBack, style }) {
    const isRTL = react_native_1.I18nManager.isRTL;
    const rowDirection = isRTL ? 'row-reverse' : 'row';
    return (<react_native_1.View style={[
            {
                flexDirection: rowDirection,
                alignItems: 'center',
                justifyContent: 'space-between',
                minHeight: 56,
                paddingHorizontal: spacing_1.spacing[4],
                paddingVertical: spacing_1.spacing[3],
                backgroundColor: variant === 'secondary' ? ui_kit_1.colorRoles.surfaceBase : ui_kit_1.colorRoles.surfaceBase,
                borderBottomWidth: 1,
                borderBottomColor: ui_kit_1.colorRoles.surfaceBase,
            },
            style,
        ]}>
      <react_native_1.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text_1.Text role="titleMd" style={{ textAlign: 'center' }}>{title}</Text_1.Text>
        {subtitle ? (<Text_1.Text role="bodySm" tone="muted" style={{ marginTop: 2, textAlign: 'center' }}>
            {subtitle}
          </Text_1.Text>) : null}
      </react_native_1.View>
      {onBack ? (<react_native_1.Pressable onPress={onBack} style={{ padding: spacing_1.spacing[2] }}>
          <Text_1.Text role="bodySm" tone="action">
            {isRTL ? '→' : '←'}
          </Text_1.Text>
        </react_native_1.Pressable>) : null}
    </react_native_1.View>);
}
//# sourceMappingURL=TopBar.js.map