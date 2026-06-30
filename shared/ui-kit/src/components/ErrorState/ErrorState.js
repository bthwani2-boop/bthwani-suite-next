"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorState = ErrorState;
const StateView_1 = require("../StateView");
function ErrorState({ title = "Something went wrong", ...props }) {
    return <StateView_1.StateView title={title} tone="danger" {...props}/>;
}
//# sourceMappingURL=ErrorState.js.map