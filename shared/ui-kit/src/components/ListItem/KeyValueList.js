"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyValueList = KeyValueList;
const ui_kit_1 = require("@bthwani/ui-kit");
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const Text_1 = require("../Text");
const spacing_1 = require("../../tokens/spacing");
function KeyValueList({ items, dense }) {
    return (<react_native_1.View style={{ gap: spacing_1.spacing[2], backgroundColor: ui_kit_1.colorRoles.surfaceBase, padding: spacing_1.spacing[3], borderRadius: 12 }}>
      {items.map((item, index) => (<react_native_1.View key={index} style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: dense ? 2 : 6 }}>
          <Text_1.Text role="bodySm" tone="muted">{item.label}</Text_1.Text>
          <Text_1.Text role="bodySm" tone={item.tone === 'brand' ? 'action' : (item.tone || 'default')}>{item.value}</Text_1.Text>
        </react_native_1.View>))}
    </react_native_1.View>);
}
//# sourceMappingURL=KeyValueList.js.map