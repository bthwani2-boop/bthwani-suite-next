"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Screen = Screen;
const _shared_1 = require("../_shared");
function Screen({ children, padded = true, centered = false, maxWidth = 1280 }) {
    return (<_shared_1.Block flex={1} width="100%" maxWidth={maxWidth} alignSelf="center" backgroundColor="$background" padding={padded ? "$4" : 0} alignItems={centered ? "center" : "stretch"} gap="$4">
      {children}
    </_shared_1.Block>);
}
//# sourceMappingURL=Screen.js.map