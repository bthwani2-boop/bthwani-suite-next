import React, { type ReactNode } from "react";
export type ChipProps = {
    label: string;
    selected?: boolean;
    disabled?: boolean;
    icon?: ReactNode;
    onPress?: () => void;
};
export declare function Chip({ label, selected, disabled, icon, onPress }: ChipProps): React.JSX.Element;
export type MetricChipProps = {
    readonly icon?: ReactNode;
    readonly label: string;
    readonly accent?: boolean;
};
export declare function MetricChip({ icon, label, accent }: MetricChipProps): React.JSX.Element;
//# sourceMappingURL=Chip.d.ts.map