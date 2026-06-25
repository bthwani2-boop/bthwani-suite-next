import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colorRoles, spacing, radius } from "@bthwani/ui-kit";

type BadgeType = "success" | "danger" | "brand" | "warning" | "muted";

type Props = {
  readonly label: string;
  readonly type?: BadgeType;
};

const BG: Record<BadgeType, string> = {
  success: "#E6F9F0",
  danger: "#FEE8E8",
  brand: "#EAF0FB",
  warning: "#FEF6E4",
  muted: "#F3F4F6",
};

const FG: Record<BadgeType, string> = {
  success: "#0E7A45",
  danger: "#C0392B",
  brand: colorRoles.brandAction,
  warning: "#B45309",
  muted: colorRoles.textSecondary,
};

export function StatusBadge({ label, type = "muted" }: Props) {
  return (
    <View style={[styles.badge, { backgroundColor: BG[type] }]}>
      <Text style={[styles.label, { color: FG[type] }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.round,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
  },
});
