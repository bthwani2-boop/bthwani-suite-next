"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUiStyled = createUiStyled;
exports.asUiComponent = asUiComponent;
exports.asUiCompoundComponent = asUiCompoundComponent;
const tamagui_1 = require("tamagui");
const styledFactory = tamagui_1.styled;
function createUiStyled(component, configuration) {
    return styledFactory(component, configuration);
}
function asUiComponent(component) {
    return component;
}
function asUiCompoundComponent(component, _keys) {
    return component;
}
//# sourceMappingURL=tamagui-compat.js.map