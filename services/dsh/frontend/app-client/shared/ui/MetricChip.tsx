import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colorRoles, spacing, radius } from "@bthwani/ui-kit";

type Props = {
  readonly label: string;
};

export function MetricChip({ label }: Props) {
  return (
    <View style={styles.chip}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.sm,
    backgroundColor: colorRoles.surfaceMuted,
    borderWidth: 1,
    borderColor: colorRoles.borderSubtle,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: colorRoles.textSecondary,
  },
});
