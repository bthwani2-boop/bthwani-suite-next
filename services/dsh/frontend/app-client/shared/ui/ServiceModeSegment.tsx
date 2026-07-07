import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colorRoles, spacing, radius } from "@bthwani/ui-kit";

type SegmentOption = {
  readonly id: string;
  readonly label: string;
  readonly icon?: React.ReactNode;
};

type Props = {
  readonly options: readonly SegmentOption[];
  readonly selectedId: string;
  readonly onChange: (id: string) => void;
};

function ServiceModeSegment({ options, selectedId, onChange }: Props) {
  return (
    <View style={styles.container}>
      {options.map((opt) => {
        const active = opt.id === selectedId;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onChange(opt.id)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            {opt.icon ? <View style={styles.icon}>{opt.icon}</View> : null}
            <Text style={[styles.label, active && styles.labelActive]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row-reverse",
    backgroundColor: colorRoles.surfaceMuted,
    borderRadius: radius.lg,
    padding: 3,
    gap: 2,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
    borderRadius: radius.md,
    gap: spacing[1],
  },
  segmentActive: {
    backgroundColor: colorRoles.surfaceBase,
    shadowColor: colorRoles.shadowBase,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  icon: {
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: colorRoles.textSecondary,
  },
  labelActive: {
    color: colorRoles.textPrimary,
    fontWeight: "800",
  },
});
