"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BThwaniFilterRail = BThwaniFilterRail;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const colors_1 = require("../../tokens/colors");
const spacing_1 = require("../../tokens/spacing");
const Text_1 = require("../Text/Text");
function BThwaniFilterRail({ items, value, onValueChange, style }) {
    return (<react_native_1.ScrollView horizontal showsHorizontalScrollIndicator={false} style={style}>
      <react_native_1.View style={{ flexDirection: "row", gap: spacing_1.spacing[2] }}>
        {items.map((item) => {
            const selected = item.value === value;
            return (<react_native_1.Pressable key={item.value} onPress={() => onValueChange(item.value)} style={{
                    paddingHorizontal: spacing_1.spacing[3],
                    paddingVertical: spacing_1.spacing[1],
                    borderRadius: 20,
                    backgroundColor: selected ? colors_1.colorRoles.brandAction : colors_1.colorRoles.surfaceInset,
                    borderWidth: 1,
                    borderColor: selected ? colors_1.colorRoles.brandAction : colors_1.colorRoles.borderSubtle,
                }}>
              <Text_1.Text role="caption" style={{ color: selected ? colors_1.colorRoles.textInverse : colors_1.colorRoles.textPrimary }}>
                {item.label}
              </Text_1.Text>
            </react_native_1.Pressable>);
        })}
      </react_native_1.View>
    </react_native_1.ScrollView>);
}
//# sourceMappingURL=FilterRail.js.map