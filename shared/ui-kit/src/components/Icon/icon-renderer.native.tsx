import React from "react";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { configureIconRenderer, type IconRendererProps } from "./Icon";

/** Native owner-level binding for the shared Icon contract. */
export function NativeIconRenderer({
  name,
  size,
  color,
  style,
  accessibilityLabel,
}: IconRendererProps): React.ReactElement {
  return (
    <Ionicons
      name={name as React.ComponentProps<typeof Ionicons>["name"]}
      size={size}
      color={color}
      style={style as React.ComponentProps<typeof Ionicons>["style"]}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

export function configureNativeIconRenderer(): void {
  configureIconRenderer(NativeIconRenderer);
}
