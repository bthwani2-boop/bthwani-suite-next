import React, { type ReactNode } from "react";
import { Pressable, View, Text, I18nManager, StyleSheet } from "react-native";
import { colorRoles } from "../../tokens/colors";

export type ChipProps = {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  onPress?: () => void;
};

export function Chip({ label, selected = false, disabled = false, icon, onPress }: ChipProps) {
  const isRtl = I18nManager.isRTL;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={[
        styles.chip,
        selected ? styles.chipSelected : styles.chipUnselected,
        disabled && { opacity: 0.5 },
      ]}
    >
      <View style={[styles.innerContainer, isRtl && styles.rowReverse]}>
        {icon != null && (
          <View style={styles.iconContainer}>
            {icon}
          </View>
        )}
        <Text
          style={[
            styles.chipText,
            selected ? styles.textSelected : styles.textUnselected,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export type MetricChipProps = {
  readonly icon?: ReactNode;
  readonly label: string;
  readonly accent?: boolean;
};

export function MetricChip({ icon, label, accent = false }: MetricChipProps) {
  return (
    <Chip
      label={label}
      icon={icon}
      disabled
      selected={accent}
    />
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 34,
    borderRadius: 12, // Soft rounded corners matching donor design spec
    paddingHorizontal: 14,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  chipSelected: {
    // Selected state: Light orange/cream tint background, solid orange border
    backgroundColor: "rgba(255, 80, 13, 0.12)",
    borderColor: colorRoles.brandAction,
  },
  chipUnselected: {
    // Unselected state: Solid white background, subtle border
    backgroundColor: colorRoles.surfaceBase,
    borderColor: "rgba(10, 47, 92, 0.08)",
  },
  innerContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  iconContainer: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Outfit-Bold",
  },
  textSelected: {
    color: colorRoles.brandAction,
  },
  textUnselected: {
    color: colorRoles.brandStructure,
  },
});
