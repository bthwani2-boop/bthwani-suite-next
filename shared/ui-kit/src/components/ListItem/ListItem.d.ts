import type { ReactNode } from "react";
export type ListItemProps = {
    title: string;
    subtitle?: string;
    meta?: string;
    leading?: ReactNode;
    trailing?: ReactNode;
    disabled?: boolean;
    selected?: boolean;
    onPress?: () => void;
};
export declare function ListItem({ title, subtitle, meta, leading, trailing, disabled, selected, onPress }: ListItemProps): import("react").JSX.Element;
//# sourceMappingURL=ListItem.d.ts.map