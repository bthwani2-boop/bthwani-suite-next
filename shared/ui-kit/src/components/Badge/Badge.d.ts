import type { ReactNode } from "react";
export type BadgeProps = {
    label: string;
    tone?: "neutral" | "action" | "success" | "warning" | "danger" | "info";
    icon?: ReactNode;
};
export declare function Badge({ label, tone, icon }: BadgeProps): import("react").JSX.Element;
export type StatusBadgeProps = {
    readonly label: string;
    readonly type?: "success" | "danger" | "brand";
    readonly icon?: ReactNode;
};
export declare function StatusBadge({ label, type, icon }: StatusBadgeProps): import("react").JSX.Element;
//# sourceMappingURL=Badge.d.ts.map