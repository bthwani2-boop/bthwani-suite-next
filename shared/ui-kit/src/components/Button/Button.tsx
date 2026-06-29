import type { ReactNode } from "react";
import { Spinner } from "tamagui";
import { StyledButton } from "../_shared";

export type ButtonProps = {
  children?: ReactNode | undefined;
  label?: string | undefined;
  size?: ("sm" | "md" | "lg") | undefined;
  tone?: ("primary" | "secondary" | "ghost" | "danger" | "success" | "brand") | undefined;
  loading?: boolean | undefined;
  disabled?: boolean | undefined;
  fullWidth?: boolean | undefined;
  leading?: ReactNode | undefined;
  trailing?: ReactNode | undefined;
  accessibilityLabel?: string | undefined;
  accessibilityState?: {
    selected?: boolean | undefined;
    checked?: boolean | undefined;
    expanded?: boolean | undefined;
    disabled?: boolean | undefined;
    busy?: boolean | undefined;
  } | undefined;
  onPress?: (() => void) | undefined;
  circular?: boolean | undefined;
  pill?: boolean | undefined;
  style?: unknown | undefined;
};

export function Button({
  children,
  label,
  size = "md",
  loading = false,
  disabled,
  leading,
  trailing,
  fullWidth,
  tone,
  accessibilityLabel,
  accessibilityState,
  onPress,
  circular = false,
  pill = false,
  style
}: ButtonProps) {
  const resolvedDisabled = Boolean(disabled || loading);

  return (
    <StyledButton
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{
        ...accessibilityState,
        disabled: resolvedDisabled,
        busy: loading
      }}
      disabled={resolvedDisabled}
      uiSize={size}
      icon={loading ? <Spinner size="small" color="currentColor" /> : leading}
      iconAfter={trailing}
      borderRadius={circular || pill ? "$round" : undefined}
      paddingHorizontal={circular ? 0 : undefined}
      fullWidth={fullWidth}
      tone={tone}
      onPress={onPress}
      style={style}
    >
      {label ?? children}
    </StyledButton>
  );
}

export type FloatingActionCircleProps = {
  readonly icon: ReactNode;
  readonly onPress?: () => void;
  readonly accessibilityLabel: string;
};

export function FloatingActionCircle({ icon, onPress, accessibilityLabel }: FloatingActionCircleProps) {
  return (
    <Button
      accessibilityLabel={accessibilityLabel}
      circular
      tone="secondary"
      {...(onPress ? { onPress } : {})}
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.45)",
        borderColor: "rgba(0, 0, 0, 0.12)",
        borderWidth: 1.5,
        width: 44,
        height: 44,
        paddingHorizontal: 0,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {icon}
    </Button>
  );
}
