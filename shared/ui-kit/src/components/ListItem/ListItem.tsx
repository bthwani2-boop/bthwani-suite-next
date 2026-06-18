import type { ReactNode } from "react";
import { Block, InteractiveRow } from "../_shared";
import { Text } from "../Text";

export type ListItemProps = {
  title: string;
  subtitle?: string;
  meta?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  disabled?: boolean;
  selected?: boolean;
  onPress?: () => void;
};

export function ListItem({ title, subtitle, meta, leading, trailing, disabled, selected, onPress }: ListItemProps) {
  return (
    <InteractiveRow
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityState={{ disabled: Boolean(disabled), selected: Boolean(selected) }}
      opacity={disabled ? 0.48 : 1}
      backgroundColor={selected ? "$actionSoft" : "transparent"}
      pointerEvents={disabled ? "none" : "auto"}
      onPress={disabled ? undefined : onPress}
    >
      {leading}
      <Block flex={1} gap="$1">
        <Text role="bodyStrong">{title}</Text>
        {subtitle ? <Text role="bodySm" tone="secondary">{subtitle}</Text> : null}
        {meta ? <Text role="caption" tone="muted">{meta}</Text> : null}
      </Block>
      {trailing}
    </InteractiveRow>
  );
}
