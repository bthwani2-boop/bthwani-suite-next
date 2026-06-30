export type Direction = "rtl" | "ltr";
export type LogicalAlignment = "start" | "center" | "end";
export declare const direction: {
    readonly defaultDirection: Direction;
    readonly defaultLanguage: "ar";
    readonly rtlLanguages: readonly ["ar", "fa", "he", "ur"];
    readonly useLogicalProperties: true;
    readonly mirrorDirectionalIcons: true;
};
export declare function isRtlLanguage(language: string): boolean;
export declare function resolveDirection(language?: string, fallback?: Direction): Direction;
export declare function resolveTextAlign(value: "center", activeDirection: Direction): "center";
export declare function resolveTextAlign(value: "start", activeDirection: "rtl"): "right";
export declare function resolveTextAlign(value: "start", activeDirection: "ltr"): "left";
export declare function resolveTextAlign(value: "end", activeDirection: "rtl"): "left";
export declare function resolveTextAlign(value: "end", activeDirection: "ltr"): "right";
export declare function resolveTextAlign(value: LogicalAlignment, activeDirection: Direction): "left" | "center" | "right";
export declare function resolveRowDirection(direction: Direction): "row" | "row-reverse";
//# sourceMappingURL=direction.d.ts.map