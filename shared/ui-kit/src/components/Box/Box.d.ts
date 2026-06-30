import React from 'react';
export type BoxProps = {
    children?: React.ReactNode;
    style?: any;
    padding?: number;
    paddingY?: number;
    paddingX?: number;
    gap?: number;
    background?: string;
    radiusToken?: string;
    border?: boolean;
    borderTone?: string;
    layoutDirection?: 'row' | 'column';
    justify?: string;
    align?: string;
};
export declare function Box({ children, style, padding, paddingY, paddingX, gap, background, radiusToken, border, borderTone, layoutDirection, justify, align, }: BoxProps): React.JSX.Element;
//# sourceMappingURL=Box.d.ts.map