"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveRowDirection = exports.useTheme = exports.BthwaniUiProvider = exports.bthwaniTamaguiConfig = exports.tamaguiConfig = void 0;
exports.useDirection = useDirection;
__exportStar(require("./tokens"), exports);
__exportStar(require("./theme"), exports);
__exportStar(require("./components"), exports);
__exportStar(require("./primitives"), exports);
__exportStar(require("./patterns"), exports);
var tamagui_config_1 = require("./tamagui-config");
Object.defineProperty(exports, "tamaguiConfig", { enumerable: true, get: function () { return __importDefault(tamagui_config_1).default; } });
Object.defineProperty(exports, "bthwaniTamaguiConfig", { enumerable: true, get: function () { return tamagui_config_1.tamaguiConfig; } });
var provider_1 = require("./provider");
Object.defineProperty(exports, "BthwaniUiProvider", { enumerable: true, get: function () { return provider_1.BthwaniUiProvider; } });
const react_native_1 = require("react-native");
var tamagui_1 = require("tamagui");
Object.defineProperty(exports, "useTheme", { enumerable: true, get: function () { return tamagui_1.useTheme; } });
function useDirection() {
    const isRTL = react_native_1.I18nManager.isRTL;
    return {
        direction: isRTL ? "rtl" : "ltr",
        isRTL,
    };
}
var direction_1 = require("./tokens/direction");
Object.defineProperty(exports, "resolveRowDirection", { enumerable: true, get: function () { return direction_1.resolveRowDirection; } });
//# sourceMappingURL=index.js.map