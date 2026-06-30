"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionState = PermissionState;
const StateView_1 = require("../StateView");
function PermissionState({ title = "Permission required", description = "Your current access level does not allow this action.", ...props }) {
    return <StateView_1.StateView title={title} description={description} tone="warning" {...props}/>;
}
//# sourceMappingURL=PermissionState.js.map