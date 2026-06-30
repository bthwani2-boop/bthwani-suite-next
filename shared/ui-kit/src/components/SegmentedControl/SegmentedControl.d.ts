import React from "react";
export type SegmentedControlItem = {
    value: string;
    label: string;
};
export type SegmentedControlProps = {
    items: readonly SegmentedControlItem[];
    value: string;
    onValueChange: (value: string) => void;
    style?: unknown;
};
export declare function SegmentedControl({ items, value, onValueChange, style }: SegmentedControlProps): React.JSX.Element;
//# sourceMappingURL=SegmentedControl.d.ts.map