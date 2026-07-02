export declare const breakpoints: {
    readonly xs: 0;
    readonly sm: 480;
    readonly md: 768;
    readonly lg: 1024;
    readonly xl: 1280;
    readonly wide: 1440;
};
export declare const media: {
    readonly xs: {
        readonly minWidth: 0;
    };
    readonly sm: {
        readonly minWidth: 480;
    };
    readonly md: {
        readonly minWidth: 768;
    };
    readonly lg: {
        readonly minWidth: 1024;
    };
    readonly xl: {
        readonly minWidth: 1280;
    };
    readonly wide: {
        readonly minWidth: 1440;
    };
    readonly smOnly: {
        readonly minWidth: 480;
        readonly maxWidth: number;
    };
    readonly mdOnly: {
        readonly minWidth: 768;
        readonly maxWidth: number;
    };
    readonly mobile: {
        readonly maxWidth: number;
    };
};
export type BreakpointToken = keyof typeof breakpoints;
export type MediaToken = keyof typeof media;
//# sourceMappingURL=breakpoints.d.ts.map