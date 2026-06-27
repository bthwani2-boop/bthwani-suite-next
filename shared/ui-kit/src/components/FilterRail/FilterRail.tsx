import React from "react";
import { Pressable, ScrollView, View } from "react-native";
import { colorRoles } from "../../tokens/colors";
import { spacing } from "../../tokens/spacing";
import { Text } from "../Text/Text";

export type BThwaniFilterRailItem = {
  value: string;
  label: string;
};

export type BThwaniFilterRailProps = {
  items: readonly BThwaniFilterRailItem[];
  value: string;
  onValueChange: (value: string) => void;
  style?: unknown;
};

export function BThwaniFilterRail({ items, value, onValueChange, style }: BThwaniFilterRailProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={style as any}>
      <View style={{ flexDirection: "row", gap: spacing[2] }}>
        {items.map((item) => {
          const selected = item.value === value;
          return (
            <Pressable
              key={item.value}
              onPress={() => onValueChange(item.value)}
              style={{
                paddingHorizontal: spacing[3],
                paddingVertical: spacing[1],
                borderRadius: 20,
                backgroundColor: selected ? colorRoles.brandAction : colorRoles.surfaceInset,
                borderWidth: 1,
                borderColor: selected ? colorRoles.brandAction : colorRoles.borderSubtle,
              }}
            >
              <Text role="caption" style={{ color: selected ? colorRoles.textInverse : colorRoles.textPrimary }}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
