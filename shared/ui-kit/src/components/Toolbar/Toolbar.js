"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Toolbar = Toolbar;
const _shared_1 = require("../_shared");
function Toolbar({ children, wrap = true }) {
    return (<_shared_1.Inline width="100%" minHeight={48} flexWrap={wrap ? "wrap" : "nowrap"} justifyContent="space-between" padding="$2" borderRadius="$md" backgroundColor="$surfaceRaised" borderWidth={1} borderColor="$borderColor">
      {children}
    </_shared_1.Inline>);
}
//# sourceMappingURL=Toolbar.js.map