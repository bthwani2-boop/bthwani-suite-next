import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colorRoles, spacing, radius, colorPalette } from "@bthwani/ui-kit";

type BadgeType = "success" | "danger" | "brand" | "warning" | "muted";

type Props = {
  readonly label: string;
  readonly type?: BadgeType;
};

const BG: Record<BadgeType, string> = {
  success: colorPalette.greenSoft,
  danger: colorPalette.dangerSoft,
  brand: colorPalette.infoSoft,
  warning: colorPalette.warningSoft,
  muted: colorPalette.graySoft,
};

const FG: Record<BadgeType, string> = {
  success: colorPalette.greenStrong,
  danger: colorPalette.dangerStrong,
  brand: colorRoles.brandAction,
  warning: colorPalette.warningStrong,
  muted: colorRoles.textSecondary,
};

function StatusBadge({ label, type = "muted" }: Props) {
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
