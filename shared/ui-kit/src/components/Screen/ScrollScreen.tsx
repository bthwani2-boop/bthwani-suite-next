import type { ReactNode } from "react";
import { ScrollView } from "react-native";
import { colorRoles, spacing } from "../../tokens";

export type ScrollScreenProps = {
  readonly children?: ReactNode;
  readonly padded?: boolean;
  readonly gap?: number;
};

export function ScrollScreen({
  children,
  padded = true,
  gap = spacing[4],
}: ScrollScreenProps) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colorRoles.surfaceBase }}
      contentContainerStyle={{
        padding: padded ? spacing[4] : 0,
        paddingBottom: spacing[8],
        gap,
      }}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}
