"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BthwaniUiProvider = BthwaniUiProvider;
const react_1 = __importDefault(require("react"));
const tamagui_1 = require("tamagui");
const tamagui_config_1 = require("./tamagui-config");
function BthwaniUiProvider({ children, defaultTheme = "light" }) {
    return react_1.default.createElement(tamagui_1.TamaguiProvider, {
        config: tamagui_config_1.tamaguiConfig,
        defaultTheme
    }, react_1.default.createElement(tamagui_1.Theme, {
        name: defaultTheme
    }, children));
}
//# sourceMappingURL=provider.js.map