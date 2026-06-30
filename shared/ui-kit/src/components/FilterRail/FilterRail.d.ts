import React from "react";
export type BThwaniFilterRailItem = {
    value: string;
    label: string;
};
export type BThwaniFilterRailProps = {
    items: readonly BThwaniFilterRailItem[];
    value: string;
    onValueChange: (value: string) => void;
    style?: unknown;
};
export declare function BThwaniFilterRail({ items, value, onValueChange, style }: BThwaniFilterRailProps): React.JSX.Element;
//# sourceMappingURL=FilterRail.d.ts.map