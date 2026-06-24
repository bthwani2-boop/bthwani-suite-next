import type { ReactNode } from "react";
import { lightThemeColors } from "../tokens/colors";

export type ScrollScreenProps = {
  readonly children?: ReactNode;
};

export function ScrollScreen({ children }: ScrollScreenProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflowY: "auto",
        background: lightThemeColors.background,
      }}
    >
      {children}
    </div>
  );
}
