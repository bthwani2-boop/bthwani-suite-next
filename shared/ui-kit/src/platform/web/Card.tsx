import type { CSSProperties, ReactNode } from "react";
import { lightThemeColors } from "../../tokens/colors";

export type CardProps = {
  readonly children?: ReactNode;
  readonly style?: CSSProperties;
};

const BASE: CSSProperties = {
  background: lightThemeColors.surface,
  border: `1px solid ${lightThemeColors.borderColor}`,
  borderRadius: "0.875rem",
  boxShadow: "0 0.5rem 1.5rem rgba(0,0,0,0.05)",
};

export function Card({ children, style }: CardProps) {
  return <div style={{ ...BASE, ...style }}>{children}</div>;
}
