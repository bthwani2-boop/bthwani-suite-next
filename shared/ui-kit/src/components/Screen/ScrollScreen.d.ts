import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
export type ScrollScreenProps = {
    readonly children?: ReactNode;
    readonly padded?: boolean;
    readonly gap?: number;
    readonly contentContainerStyle?: StyleProp<ViewStyle>;
};
export declare function ScrollScreen({ children, padded, gap, contentContainerStyle, }: ScrollScreenProps): import("react").JSX.Element;
//# sourceMappingURL=ScrollScreen.d.ts.map
