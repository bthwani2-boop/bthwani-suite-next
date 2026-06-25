import React, { type ReactNode } from "react";
import { XStack, YStack } from "tamagui";
import { Text } from "../Text";
import { colorRoles } from "../../tokens/colors";

// Safe dynamic resolve for React Native's I18nManager
let isRtl = false;
try {
  const rn = require("react" + "-native");
  isRtl = rn.I18nManager.isRTL;
} catch {
  // Web/Next.js fallback
}

export type ChipProps = {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  onPress?: () => void;
};

export function Chip({ label, selected = false, disabled = false, icon, onPress }: ChipProps) {
  return (
    <XStack
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      style={{
        ...styles.chip,
        ...(selected ? styles.chipSelected : styles.chipUnselected),
        ...(disabled ? { opacity: 0.5 } : {}),
      }}
    >
      <XStack style={{
        ...styles.innerContainer,
        ...(isRtl ? styles.rowReverse : {}),
      }}>
        {icon != null && (
          <YStack style={styles.iconContainer}>
            {icon}
          </YStack>
        )}
        <Text
          style={{
            ...styles.chipText,
            ...(selected ? styles.textSelected : styles.textUnselected),
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
      </XStack>
    </XStack>
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

const styles = {
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
} as const;
