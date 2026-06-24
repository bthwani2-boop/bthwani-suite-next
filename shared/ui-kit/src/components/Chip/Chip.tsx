import type { ReactNode } from "react";
import { Button } from "../Button";

export type ChipProps = {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  onPress?: () => void;
};

export function Chip({ label, selected = false, disabled, icon, onPress }: ChipProps) {
  return (
    <Button
      label={label}
      leading={icon}
      size="sm"
      tone={selected ? "primary" : "secondary"}
      fullWidth={false}
      pill
      {...(disabled === undefined ? {} : { disabled })}
      {...(onPress ? { onPress } : {})}
      accessibilityState={{ selected, disabled: Boolean(disabled) }}
    />
  );
}

export type MetricChipProps = {
  readonly icon?: ReactNode;
  readonly label: string;
};

export function MetricChip({ icon, label }: MetricChipProps) {
  return (
    <Chip
      label={label}
      icon={icon}
      disabled
    />
  );
}
