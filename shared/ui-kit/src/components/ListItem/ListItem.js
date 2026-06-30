"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ListItem = ListItem;
const _shared_1 = require("../_shared");
const Text_1 = require("../Text");
function ListItem({ title, subtitle, meta, leading, trailing, disabled, selected, onPress }) {
    return (<_shared_1.InteractiveRow accessibilityRole={onPress ? "button" : undefined} accessibilityState={{ disabled: Boolean(disabled), selected: Boolean(selected) }} opacity={disabled ? 0.48 : 1} backgroundColor={selected ? "$actionSoft" : "transparent"} pointerEvents={disabled ? "none" : "auto"} onPress={disabled ? undefined : onPress}>
      {leading}
      <_shared_1.Block flex={1} gap="$1">
        <Text_1.Text role="bodyStrong">{title}</Text_1.Text>
        {subtitle ? <Text_1.Text role="bodySm" tone="secondary">{subtitle}</Text_1.Text> : null}
        {meta ? <Text_1.Text role="caption" tone="muted">{meta}</Text_1.Text> : null}
      </_shared_1.Block>
      {trailing}
    </_shared_1.InteractiveRow>);
}
//# sourceMappingURL=ListItem.js.map