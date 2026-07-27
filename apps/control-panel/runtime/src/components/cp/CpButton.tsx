import type { CSSProperties, ReactNode } from "react";
import { cpRadius, cpSpace, cpType } from "./cpScale";
import { shadowToBoxShadow, useCpTokens } from "./cpTokens";

export type CpButtonVariant = "primary" | "brand" | "secondary" | "ghost" | "danger";

export type CpButtonProps = {
  readonly type?: "button" | "submit" | "reset";
  readonly onClick?: () => void;
  readonly style?: CSSProperties;
  readonly disabled?: boolean;
  readonly variant?: CpButtonVariant;
  readonly "aria-label"?: string;
  readonly children: ReactNode;
};

export function CpButton({
  type = "button",
  onClick,
  style,
  disabled,
  variant = "secondary",
  "aria-label": ariaLabel,
  children,
}: CpButtonProps) {
  const { tokens } = useCpTokens();
  const state = disabled ? tokens.components.buttons[variant].disabled : tokens.components.buttons[variant].default;
  const buttonStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.375rem",
    padding: `${cpSpace[2]} ${cpSpace[4]}`,
    borderRadius: cpRadius.md,
    fontSize: cpType.body.fontSize,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    backgroundColor: state.backgroundColor,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: state.borderColor,
    color: state.textColor,
    boxShadow: state.shadow ? shadowToBoxShadow(state.shadow) : undefined,
    ...style,
  };
  return (
    <button type={type} onClick={onClick} style={buttonStyle} disabled={disabled} aria-label={ariaLabel}>
      {children}
    </button>
  );
}
