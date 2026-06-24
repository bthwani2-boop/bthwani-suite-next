import type { CSSProperties, ReactNode } from "react";
import { lightThemeColors } from "../tokens/colors";

export type BadgeTone = "neutral" | "action" | "success" | "warning" | "danger" | "info";

export type BadgeProps = {
  readonly label: string;
  readonly tone?: BadgeTone;
  readonly icon?: ReactNode;
};

const TONE_STYLES: Record<BadgeTone, CSSProperties> = {
  neutral: { background: lightThemeColors.surfaceInset, borderColor: lightThemeColors.borderColor, color: lightThemeColors.colorSecondary },
  action: { background: lightThemeColors.actionSoft, borderColor: lightThemeColors.action, color: lightThemeColors.action },
  success: { background: lightThemeColors.successSoft, borderColor: lightThemeColors.success, color: lightThemeColors.success },
  warning: { background: lightThemeColors.warningSoft, borderColor: lightThemeColors.warning, color: lightThemeColors.warning },
  danger: { background: lightThemeColors.dangerSoft, borderColor: lightThemeColors.danger, color: lightThemeColors.danger },
  info: { background: lightThemeColors.infoSoft, borderColor: lightThemeColors.info, color: lightThemeColors.info },
};

const BASE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.25rem",
  padding: "0.125rem 0.5rem",
  borderRadius: "9999px",
  borderWidth: 1,
  borderStyle: "solid",
  fontSize: "0.75rem",
  fontWeight: 500,
  lineHeight: "1.25rem",
  whiteSpace: "nowrap",
};

export function Badge({ label, tone = "neutral", icon }: BadgeProps) {
  return (
    <span style={{ ...BASE, ...TONE_STYLES[tone] }}>
      {icon}
      {label}
    </span>
  );
}
