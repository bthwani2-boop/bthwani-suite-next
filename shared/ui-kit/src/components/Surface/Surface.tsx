import React from "react";
import { View, type ViewProps } from "react-native";
import { colorRoles } from "../../tokens/colors";
import { radius } from "../../tokens/radius";

export type SurfaceProps = Omit<ViewProps, "children" | "style"> & {
  children?: React.ReactNode;
  tone?: "default" | "raised" | "inset" | "action" | "success" | "warning" | "danger" | "info" | undefined;
  borderless?: boolean | undefined;
  fill?: boolean | undefined;
  centered?: boolean | undefined;
  padding?: string | number | undefined;
  gap?: string | number | undefined;
  width?: string | number | undefined;
  maxWidth?: string | number | undefined;
  onPress?: (() => void) | undefined;
  hoverStyle?: Record<string, unknown> | undefined;
  pressStyle?: Record<string, unknown> | undefined;
  style?: ViewProps["style"];
  radiusToken?: string | undefined;
  elevationToken?: string | undefined;
  border?: boolean | undefined;
};

const toneBg: Record<string, string> = {
  default: colorRoles.surfaceBase,
  raised: colorRoles.surfaceMuted,
  inset: colorRoles.surfaceInset,
  action: colorRoles.brandActionSoft,
  success: colorRoles.surfaceBase,
  warning: colorRoles.surfaceBase,
  danger: colorRoles.surfaceBase,
  info: colorRoles.surfaceBase,
};

const toneBorder: Record<string, string> = {
  default: colorRoles.borderSubtle,
  raised: colorRoles.borderStrong,
  inset: colorRoles.borderSubtle,
  action: colorRoles.brandAction,
  success: colorRoles.success,
  warning: colorRoles.warning,
  danger: colorRoles.danger,
  info: colorRoles.info,
};

export function Surface({
  centered,
  tone = "default",
  borderless,
  fill,
  padding,
  gap,
  width,
  maxWidth,
  children,
  style,
  onPress: _onPress,
  hoverStyle: _hoverStyle,
  pressStyle: _pressStyle,
  radiusToken: _radiusToken,
  elevationToken: _elevationToken,
  border: _border,
  ...viewProps
}: SurfaceProps) {
  return (
    <View
      {...viewProps}
      style={[
        {
          backgroundColor: toneBg[tone] ?? colorRoles.surfaceBase,
          borderColor: toneBorder[tone] ?? colorRoles.borderSubtle,
          borderWidth: borderless ? 0 : 1,
          borderRadius: (radius as Record<string, number>).lg ?? 12,
          padding: typeof padding === "number" ? padding * 4 : 16,
          gap: typeof gap === "number" ? gap * 4 : 12,
          flex: fill ? 1 : undefined,
          width,
          maxWidth,
          alignItems: centered ? "center" : undefined,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
