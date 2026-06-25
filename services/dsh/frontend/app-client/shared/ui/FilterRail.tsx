import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { colorRoles, spacing, radius } from "@bthwani/ui-kit";

export type FilterRailItem = {
  readonly id: string;
  readonly label: string;
  readonly icon?: React.ReactNode;
};

type Props = {
  readonly items: readonly FilterRailItem[];
  readonly selectedId: string;
  readonly onChange: (id: string) => void;
};

export function FilterRail({ items, selectedId, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {items.map((item) => {
        const active = item.id === selectedId;
        return (
          <Pressable
            key={item.id}
            onPress={() => onChange(item.id)}
            style={[styles.chip, active && styles.chipActive]}
          >
            {item.icon ? <View style={styles.icon}>{item.icon}</View> : null}
            <Text style={[styles.label, active && styles.labelActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing[4],
    gap: spacing[2],
    paddingVertical: spacing[2],
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.round,
    borderWidth: 1.5,
    borderColor: colorRoles.borderSubtle,
    backgroundColor: colorRoles.surfaceBase,
  },
  chipActive: {
    backgroundColor: colorRoles.brandAction,
    borderColor: colorRoles.brandAction,
  },
  icon: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: colorRoles.textSecondary,
  },
  labelActive: {
    color: colorRoles.textInverse,
  },
});
