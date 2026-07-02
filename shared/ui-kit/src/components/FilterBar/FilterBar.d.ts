import type { ReactNode } from "react";
export type FilterBarProps = {
    children?: ReactNode;
    trailing?: ReactNode;
};
export declare function FilterBar({ children, trailing }: FilterBarProps): import("react").JSX.Element;
export type FilterRailItem = {
    readonly id: string;
    readonly label: string;
    readonly icon?: ReactNode;
};
export type FilterRailProps = {
    readonly items: readonly FilterRailItem[];
    readonly selectedId: string;
    readonly onChange: (id: string) => void;
};
export declare function FilterRail({ items, selectedId, onChange }: FilterRailProps): import("react").JSX.Element;
//# sourceMappingURL=FilterBar.d.ts.map