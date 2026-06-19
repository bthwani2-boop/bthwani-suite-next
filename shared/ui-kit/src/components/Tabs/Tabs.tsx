import { Inline } from "../_shared";
import { Button } from "../Button";

export type TabItem<TId extends string = string> = {
  id: TId;
  label: string;
  disabled?: boolean;
};

export type TabsProps<TId extends string = string> = {
  items: readonly TabItem<TId>[];
  value: TId;
  onValueChange: (value: TId) => void;
  accessibilityLabel?: string;
};

export function Tabs<TId extends string>({
  items,
  value,
  onValueChange,
  accessibilityLabel = "Tabs"
}: TabsProps<TId>) {
  return (
    <Inline
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      width="100%"
      padding="$1"
      borderRadius="$lg"
      backgroundColor="$surfaceInset"
      borderWidth={1}
      borderColor="$borderColor"
    >
      {items.map((item) => (
        <Button
          key={item.id}
          label={item.label}
          tone={item.id === value ? "primary" : "ghost"}
          size="sm"
          fullWidth
          {...(item.disabled === undefined ? {} : { disabled: item.disabled })}
          onPress={() => onValueChange(item.id)}
          accessibilityState={{ selected: item.id === value, disabled: Boolean(item.disabled) }}
        />
      ))}
    </Inline>
  );
}
