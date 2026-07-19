"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Text = Text;
const _shared_1 = require("../_shared");
const tokens_1 = require("../../tokens");
function Text({ align = "start", direction = tokens_1.direction.defaultDirection, ...props }) {
    return (<_shared_1.StyledText textAlign={(0, tokens_1.resolveTextAlign)(align, direction)} dir={direction} {...props}/>);
}
//# sourceMappingURL=Text.js.map