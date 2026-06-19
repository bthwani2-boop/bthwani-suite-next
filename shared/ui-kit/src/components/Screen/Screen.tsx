import type { ReactNode } from "react";
import { Block } from "../_shared";

export type ScreenProps = {
  children?: ReactNode;
  padded?: boolean;
  centered?: boolean;
  maxWidth?: number;
};

export function Screen({ children, padded = true, centered = false, maxWidth = 1280 }: ScreenProps) {
  return (
    <Block
      flex={1}
      width="100%"
      maxWidth={maxWidth}
      alignSelf="center"
      backgroundColor="$background"
      padding={padded ? "$4" : 0}
      alignItems={centered ? "center" : "stretch"}
      gap="$4"
    >
      {children}
    </Block>
  );
}
