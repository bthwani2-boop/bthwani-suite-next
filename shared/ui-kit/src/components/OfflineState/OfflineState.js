"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfflineState = OfflineState;
const StateView_1 = require("../StateView");
function OfflineState({ title = "You are offline", description = "Reconnect to continue. The current context remains available.", ...props }) {
    return <StateView_1.StateView title={title} description={description} tone="warning" {...props}/>;
}
//# sourceMappingURL=OfflineState.js.map