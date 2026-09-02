import type { CSSProperties, ReactNode } from "react";
import { Button } from "@bthwani/ui-kit";

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
  return (
    <Button
      type={type}
      onPress={onClick}
      style={style}
      disabled={disabled}
      tone={variant}
      accessibilityLabel={ariaLabel}
    >
      {children}
    </Button>
  );
}
