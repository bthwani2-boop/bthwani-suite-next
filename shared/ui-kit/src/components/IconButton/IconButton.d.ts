import type { ReactNode } from "react";
import { type ButtonProps } from "../Button";
export type IconButtonProps = Omit<ButtonProps, "children" | "label" | "leading" | "trailing"> & {
    icon: ReactNode;
    accessibilityLabel: string;
};
export declare function IconButton({ icon, accessibilityLabel, size, ...props }: IconButtonProps): import("react").JSX.Element;
//# sourceMappingURL=IconButton.d.ts.map