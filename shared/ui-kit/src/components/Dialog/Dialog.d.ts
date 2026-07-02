import type { ReactNode } from "react";
export type DialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    children?: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => void;
};
export declare function Dialog({ open, onOpenChange, title, description, children, confirmLabel, cancelLabel, onConfirm }: DialogProps): import("react").JSX.Element;
//# sourceMappingURL=Dialog.d.ts.map