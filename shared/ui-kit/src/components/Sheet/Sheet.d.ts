import type { ReactNode } from "react";
export type SheetProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    description?: string;
    children?: ReactNode;
    snapPoints?: readonly number[];
};
export declare function Sheet({ open, onOpenChange, title, description, children, snapPoints }: SheetProps): import("react").JSX.Element;
//# sourceMappingURL=Sheet.d.ts.map