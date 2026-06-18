import type { ReactNode } from "react";
import { Spinner } from "tamagui";
import { StyledButton } from "../_shared";

export type ButtonProps = {
  children?: ReactNode;
  label?: string;
  size?: "sm" | "md" | "lg";
  tone?: "primary" | "secondary" | "ghost" | "danger" | "success";
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  accessibilityLabel?: string;
  accessibilityState?: Record<string, boolean>;
  onPress?: () => void;
  circular?: boolean;
  pill?: boolean;
};

export function Button({
  children,
  label,
  size = "md",
  loading = false,
  disabled,
  leading,
  trailing,
  ...props
}: ButtonProps) {
  return (
    <StyledButton
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: loading }}
      disabled={disabled || loading}
      uiSize={size}
      icon={loading ? <Spinner size="small" color="currentColor" /> : leading}
      iconAfter={trailing}
      borderRadius={props.circular || props.pill ? "$round" : undefined}
      paddingHorizontal={props.circular ? 0 : undefined}
      {...props}
    >
      {label ?? children}
    </StyledButton>
  );
}
