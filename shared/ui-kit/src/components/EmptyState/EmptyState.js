"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmptyState = EmptyState;
const StateView_1 = require("../StateView");
function EmptyState({ title = "Nothing here yet", ...props }) {
    return <StateView_1.StateView title={title} tone="neutral" {...props}/>;
}
//# sourceMappingURL=EmptyState.js.map