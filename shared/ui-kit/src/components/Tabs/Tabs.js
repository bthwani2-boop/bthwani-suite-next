"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tabs = Tabs;
const _shared_1 = require("../_shared");
const Button_1 = require("../Button");
function Tabs({ items, value, onValueChange, accessibilityLabel = "Tabs" }) {
    return (<_shared_1.Inline accessibilityRole="tablist" accessibilityLabel={accessibilityLabel} width="100%" padding="$1" borderRadius="$lg" backgroundColor="$surfaceInset" borderWidth={1} borderColor="$borderColor">
      {items.map((item) => (<Button_1.Button key={item.id} label={item.label} tone={item.id === value ? "primary" : "ghost"} size="sm" fullWidth {...(item.disabled === undefined ? {} : { disabled: item.disabled })} onPress={() => onValueChange(item.id)} accessibilityState={{ selected: item.id === value, disabled: Boolean(item.disabled) }}/>))}
    </_shared_1.Inline>);
}
//# sourceMappingURL=Tabs.js.map