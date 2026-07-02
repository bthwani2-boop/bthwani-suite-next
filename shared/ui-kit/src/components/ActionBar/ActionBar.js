"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionBar = ActionBar;
const _shared_1 = require("../_shared");
function ActionBar({ primary, secondary, sticky = false }) {
    return (<_shared_1.Inline width="100%" justifyContent="flex-end" flexWrap="wrap" padding="$3" backgroundColor="$surfaceOverlay" borderTopWidth={1} borderTopColor="$borderColor" position="relative" bottom={sticky ? 0 : undefined} zIndex={sticky ? "$sticky" : "$base"}>
      {secondary}
      {primary}
    </_shared_1.Inline>);
}
//# sourceMappingURL=ActionBar.js.map