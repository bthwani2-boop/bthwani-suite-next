import type { ReactNode } from "react";
export type StateTone = "neutral" | "info" | "success" | "warning" | "danger";
export type StateViewProps = {
    title: string;
    description?: string | undefined;
    tone?: StateTone | undefined;
    loading?: boolean | undefined;
    icon?: ReactNode | undefined;
    actionLabel?: string | undefined;
    onActionPress?: (() => void) | undefined;
};
export declare function StateView({ title, description, tone, loading, icon, actionLabel, onActionPress }: StateViewProps): import("react").JSX.Element;
//# sourceMappingURL=StateView.d.ts.map