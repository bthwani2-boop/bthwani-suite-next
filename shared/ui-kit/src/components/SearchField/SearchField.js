"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchField = SearchField;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const colors_1 = require("../../tokens/colors");
const spacing_1 = require("../../tokens/spacing");
function SearchField({ value, onChangeText, placeholder, style }) {
    return (<react_native_1.View style={[
            {
                borderWidth: 1,
                borderColor: colors_1.colorRoles.borderSubtle,
                borderRadius: 8,
                paddingHorizontal: spacing_1.spacing[3],
                paddingVertical: spacing_1.spacing[2],
                backgroundColor: colors_1.colorRoles.surfaceBase,
            },
            style,
        ]}>
      <react_native_1.TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors_1.colorRoles.textMuted} style={{ color: colors_1.colorRoles.textPrimary, fontSize: 14 }}/>
    </react_native_1.View>);
}
//# sourceMappingURL=SearchField.js.map