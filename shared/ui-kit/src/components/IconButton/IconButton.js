"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IconButton = IconButton;
const Button_1 = require("../Button");
function IconButton({ icon, accessibilityLabel, size = "md", ...props }) {
    return (<Button_1.Button accessibilityLabel={accessibilityLabel} size={size} circular {...props}>
      {icon}
    </Button_1.Button>);
}
//# sourceMappingURL=IconButton.js.map