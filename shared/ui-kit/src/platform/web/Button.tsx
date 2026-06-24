import type { CSSProperties, ReactNode } from "react";
import { lightThemeColors } from "../../tokens/colors";

export type ButtonTone = "primary" | "secondary" | "ghost" | "danger" | "success";
export type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = {
  readonly children?: ReactNode;
  readonly label?: string;
  readonly size?: ButtonSize;
  readonly tone?: ButtonTone;
  readonly loading?: boolean;
  readonly disabled?: boolean;
  readonly fullWidth?: boolean;
  readonly onPress?: () => void;
};

const SIZE_STYLE: Record<ButtonSize, CSSProperties> = {
  sm: { padding: "0.25rem 0.75rem", fontSize: "0.8125rem" },
  md: { padding: "0.5rem 1.25rem", fontSize: "0.9375rem" },
  lg: { padding: "0.75rem 1.75rem", fontSize: "1rem" },
};

const TONE_STYLE: Record<ButtonTone, CSSProperties> = {
  primary: { background: lightThemeColors.action, color: lightThemeColors.colorInverse, borderColor: lightThemeColors.action },
  secondary: { background: lightThemeColors.surfaceInset, color: lightThemeColors.color, borderColor: lightThemeColors.borderColor },
  ghost: { background: "transparent", color: lightThemeColors.action, borderColor: "transparent" },
  danger: { background: lightThemeColors.danger, color: lightThemeColors.colorInverse, borderColor: lightThemeColors.danger },
  success: { background: lightThemeColors.success, color: lightThemeColors.colorInverse, borderColor: lightThemeColors.success },
};

const BASE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderWidth: 1,
  borderStyle: "solid",
  borderRadius: "0.5rem",
  fontWeight: 600,
  cursor: "pointer",
  lineHeight: 1.25,
};

export function Button({ children, label, size = "md", tone = "primary", disabled, loading, fullWidth, onPress }: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onPress}
      style={{ ...BASE, ...SIZE_STYLE[size], ...TONE_STYLE[tone], width: fullWidth ? "100%" : undefined, opacity: disabled || loading ? 0.5 : 1 }}
    >
      {label ?? children}
    </button>
  );
}
