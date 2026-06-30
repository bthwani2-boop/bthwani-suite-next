"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilterBar = FilterBar;
exports.FilterRail = FilterRail;
const tamagui_1 = require("tamagui");
const tamagui_compat_1 = require("../../internal/tamagui-compat");
const _shared_1 = require("../_shared");
const Chip_1 = require("../Chip/Chip");
const HorizontalScroll = (0, tamagui_compat_1.asUiComponent)(tamagui_1.ScrollView);
function FilterBar({ children, trailing }) {
    return (<_shared_1.Inline width="100%" justifyContent="space-between">
      <HorizontalScroll horizontal showsHorizontalScrollIndicator={false} flex={1}>
        <_shared_1.Inline paddingVertical="$1" paddingHorizontal="$1">{children}</_shared_1.Inline>
      </HorizontalScroll>
      {trailing}
    </_shared_1.Inline>);
}
function FilterRail({ items, selectedId, onChange }) {
    return (<FilterBar>
      {items.map((item) => {
            const isSelected = item.id === selectedId;
            return (<Chip_1.Chip key={item.id} label={item.label} icon={item.icon} selected={isSelected} onPress={() => onChange(item.id)}/>);
        })}
    </FilterBar>);
}
//# sourceMappingURL=FilterBar.js.map