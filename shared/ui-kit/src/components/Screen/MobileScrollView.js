"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MobileScrollView = MobileScrollView;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const spacing_1 = require("../../tokens/spacing");
function MobileScrollView({ children, fill, padding, gap, contentContainerStyle, }) {
    return (<react_native_1.ScrollView style={{ flex: fill ? 1 : undefined }} contentContainerStyle={[
            {
                padding: padding ? spacing_1.spacing[padding] || padding * 4 : undefined,
                gap: gap ? spacing_1.spacing[gap] || gap * 4 : undefined,
            },
            contentContainerStyle,
        ]}>
      {children}
    </react_native_1.ScrollView>);
}
//# sourceMappingURL=MobileScrollView.js.map