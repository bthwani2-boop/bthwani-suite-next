import React from "react";
export type SurfaceProps = {
    children?: React.ReactNode;
    tone?: "default" | "raised" | "inset" | "action" | "success" | "warning" | "danger" | "info" | undefined;
    borderless?: boolean | undefined;
    fill?: boolean | undefined;
    centered?: boolean | undefined;
    padding?: string | number | undefined;
    gap?: string | number | undefined;
    width?: string | number | undefined;
    maxWidth?: string | number | undefined;
    onPress?: (() => void) | undefined;
    hoverStyle?: Record<string, unknown> | undefined;
    pressStyle?: Record<string, unknown> | undefined;
    style?: unknown;
    radiusToken?: string | undefined;
    elevationToken?: string | undefined;
    border?: boolean | undefined;
};
export declare function Surface({ centered, tone, borderless, fill, padding, gap, width, maxWidth, children, style }: SurfaceProps): React.JSX.Element;
//# sourceMappingURL=Surface.d.ts.map