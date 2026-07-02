export declare const fontFamilies: {
    readonly arabic: "system-ui";
    readonly latin: "system-ui";
    readonly display: "system-ui";
    readonly mono: "ui-monospace";
};
export declare const fontWeights: {
    readonly regular: "400";
    readonly medium: "500";
    readonly semibold: "600";
    readonly bold: "700";
    readonly black: "800";
};
export declare const typography: {
    readonly display: {
        readonly fontSize: 36;
        readonly lineHeight: 44;
        readonly fontWeight: "700";
        readonly letterSpacing: -0.4;
    };
    readonly hero: {
        readonly fontSize: 30;
        readonly lineHeight: 38;
        readonly fontWeight: "700";
        readonly letterSpacing: -0.3;
    };
    readonly titleLg: {
        readonly fontSize: 24;
        readonly lineHeight: 32;
        readonly fontWeight: "700";
        readonly letterSpacing: -0.2;
    };
    readonly titleMd: {
        readonly fontSize: 20;
        readonly lineHeight: 28;
        readonly fontWeight: "600";
        readonly letterSpacing: 0;
    };
    readonly titleSm: {
        readonly fontSize: 18;
        readonly lineHeight: 26;
        readonly fontWeight: "600";
        readonly letterSpacing: 0;
    };
    readonly bodyLg: {
        readonly fontSize: 17;
        readonly lineHeight: 27;
        readonly fontWeight: "400";
        readonly letterSpacing: 0;
    };
    readonly body: {
        readonly fontSize: 15;
        readonly lineHeight: 24;
        readonly fontWeight: "400";
        readonly letterSpacing: 0;
    };
    readonly bodyStrong: {
        readonly fontSize: 15;
        readonly lineHeight: 24;
        readonly fontWeight: "600";
        readonly letterSpacing: 0;
    };
    readonly bodySm: {
        readonly fontSize: 14;
        readonly lineHeight: 21;
        readonly fontWeight: "400";
        readonly letterSpacing: 0;
    };
    readonly label: {
        readonly fontSize: 13;
        readonly lineHeight: 18;
        readonly fontWeight: "600";
        readonly letterSpacing: 0.1;
    };
    readonly caption: {
        readonly fontSize: 12;
        readonly lineHeight: 17;
        readonly fontWeight: "500";
        readonly letterSpacing: 0.1;
    };
    readonly code: {
        readonly fontSize: 13;
        readonly lineHeight: 19;
        readonly fontWeight: "500";
        readonly letterSpacing: 0;
    };
};
export type TypographyRole = keyof typeof typography | "labelLg" | "labelMd" | "bodyMd" | "headingSm" | undefined;
export type FontFamilyToken = keyof typeof fontFamilies;
export type FontWeightToken = keyof typeof fontWeights;
//# sourceMappingURL=typography.d.ts.map