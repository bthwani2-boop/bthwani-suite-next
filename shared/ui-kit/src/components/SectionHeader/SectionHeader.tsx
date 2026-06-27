import React from "react";
import { View } from "react-native";
import { Text } from "../Text/Text";

export type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  style?: unknown;
};

export function SectionHeader({ title, subtitle, style }: SectionHeaderProps) {
  return (
    <View style={[{ gap: 2 }, style as any]}>
      <Text role="bodyStrong">{title}</Text>
      {subtitle ? <Text role="caption" tone="muted">{subtitle}</Text> : null}
    </View>
  );
}
