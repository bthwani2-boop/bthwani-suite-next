"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoadingState = LoadingState;
const StateView_1 = require("../StateView");
function LoadingState({ title = "Loading", ...props }) {
    return <StateView_1.StateView title={title} loading tone="info" {...props}/>;
}
//# sourceMappingURL=LoadingState.js.map