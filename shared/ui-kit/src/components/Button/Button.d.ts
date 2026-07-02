import type { ReactNode } from "react";
export type ButtonProps = {
    children?: ReactNode | undefined;
    label?: string | undefined;
    size?: ("sm" | "md" | "lg") | undefined;
    tone?: ("primary" | "secondary" | "ghost" | "danger" | "success" | "brand") | undefined;
    loading?: boolean | undefined;
    disabled?: boolean | undefined;
    fullWidth?: boolean | undefined;
    leading?: ReactNode | undefined;
    trailing?: ReactNode | undefined;
    accessibilityLabel?: string | undefined;
    accessibilityState?: {
        selected?: boolean | undefined;
        checked?: boolean | undefined;
        expanded?: boolean | undefined;
        disabled?: boolean | undefined;
        busy?: boolean | undefined;
    } | undefined;
    onPress?: (() => void) | undefined;
    circular?: boolean | undefined;
    pill?: boolean | undefined;
    style?: unknown | undefined;
};
export declare function Button({ children, label, size, loading, disabled, leading, trailing, fullWidth, tone, accessibilityLabel, accessibilityState, onPress, circular, pill, style }: ButtonProps): import("react").JSX.Element;
export type FloatingActionCircleProps = {
    readonly icon: ReactNode;
    readonly onPress?: () => void;
    readonly accessibilityLabel: string;
};
export declare function FloatingActionCircle({ icon, onPress, accessibilityLabel }: FloatingActionCircleProps): import("react").JSX.Element;
//# sourceMappingURL=Button.d.ts.map