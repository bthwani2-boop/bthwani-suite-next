import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { colorRoles, radius } from "@bthwani/ui-kit";

type Props = {
  readonly icon: React.ReactNode;
  readonly accessibilityLabel: string;
  readonly onPress?: () => void;
};

function FloatingActionCircle({ icon, accessibilityLabel, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      style={styles.circle}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: 40,
    height: 40,
    borderRadius: radius.round,
    backgroundColor: colorRoles.surfaceBase,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colorRoles.shadowBase,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
});
