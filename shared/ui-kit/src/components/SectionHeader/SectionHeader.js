"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SectionHeader = SectionHeader;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const Text_1 = require("../Text/Text");
function SectionHeader({ title, subtitle, style }) {
    return (<react_native_1.View style={[{ gap: 2 }, style]}>
      <Text_1.Text role="bodyStrong">{title}</Text_1.Text>
      {subtitle ? <Text_1.Text role="caption" tone="muted">{subtitle}</Text_1.Text> : null}
    </react_native_1.View>);
}
//# sourceMappingURL=SectionHeader.js.map