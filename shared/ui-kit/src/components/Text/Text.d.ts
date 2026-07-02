import type { ReactNode } from "react";
import { type Direction, type LogicalAlignment, type TypographyRole } from "../../tokens";
export type TextProps = {
    children?: ReactNode;
    role?: TypographyRole;
    tone?: "default" | "secondary" | "muted" | "inverse" | "action" | "success" | "warning" | "danger" | "info";
    align?: LogicalAlignment;
    direction?: Direction;
    htmlFor?: string;
    numberOfLines?: number;
    style?: unknown;
    weight?: unknown;
};
export declare function Text({ align, direction, ...props }: TextProps): import("react").JSX.Element;
//# sourceMappingURL=Text.d.ts.map