import type { CSSProperties, ReactNode } from "react";
import { typography, type TypographyRole } from "../../tokens/typography";
import { lightThemeColors } from "../../tokens/colors";

export type TextProps = {
  readonly children?: ReactNode;
  readonly role?: TypographyRole;
  readonly tone?: "default" | "secondary" | "muted" | "inverse" | "action" | "success" | "warning" | "danger" | "info";
  readonly style?: CSSProperties;
};

const TONE_COLOR: Partial<Record<NonNullable<TextProps["tone"]>, string>> = {
  secondary: lightThemeColors.colorSecondary,
  muted: lightThemeColors.colorMuted,
  success: lightThemeColors.success,
  warning: lightThemeColors.warning,
  danger: lightThemeColors.danger,
  info: lightThemeColors.info,
  action: lightThemeColors.action,
  inverse: lightThemeColors.colorInverse,
};

export function Text({ children, role = "body", tone = "default", style }: TextProps) {
  const typo = typography[role] ?? typography.body;
  const merged: CSSProperties = {
    fontSize: typo.fontSize,
    lineHeight: `${typo.lineHeight}px`,
    fontWeight: typo.fontWeight as CSSProperties["fontWeight"],
    color: tone !== "default" ? TONE_COLOR[tone] : undefined,
    margin: 0,
    ...style,
  };
  return <span style={merged}>{children}</span>;
}
