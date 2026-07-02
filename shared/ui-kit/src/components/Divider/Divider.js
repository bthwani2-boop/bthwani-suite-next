"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Divider = Divider;
const ui_kit_1 = require("@bthwani/ui-kit");
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
function Divider({ style }) {
    return <react_native_1.View style={[{ height: 1, backgroundColor: ui_kit_1.colorRoles.surfaceBase, marginVertical: 8 }, style]}/>;
}
//# sourceMappingURL=Divider.js.map