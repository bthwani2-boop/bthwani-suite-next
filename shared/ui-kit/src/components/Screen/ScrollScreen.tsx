"use client";

import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { ScrollView } from "tamagui";
import { asUiComponent } from "../../internal/tamagui-compat";
import { colorRoles, spacing } from "../../tokens";

const StyledScrollView = asUiComponent(ScrollView);

export type ScrollScreenProps = {
  readonly children?: ReactNode;
  readonly padded?: boolean;
  readonly gap?: number;
  readonly contentContainerStyle?: StyleProp<ViewStyle>;
};

export function ScrollScreen({
  children,
  padded = true,
  gap = spacing[4],
  contentContainerStyle,
}: ScrollScreenProps) {
  return (
    <StyledScrollView
      style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}
      contentContainerStyle={[
        {
          padding: padded ? spacing[4] : 0,
          paddingBottom: spacing[8],
          gap,
        },
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </StyledScrollView>
  );
}
