export * from "./tokens";
export * from "./theme";
export * from "./components";
export * from "./primitives";
export * from "./patterns";
export { default as tamaguiConfig, tamaguiConfig as bthwaniTamaguiConfig } from "./tamagui-config";
export type { TamaguiConfig } from "./tamagui-config";
export { BthwaniUiProvider } from "./provider";
export { useTheme } from "tamagui";
export declare function useDirection(): {
    direction: "rtl" | "ltr";
    isRTL: boolean;
};
export { resolveRowDirection } from "./tokens/direction";
//# sourceMappingURL=index.d.ts.map