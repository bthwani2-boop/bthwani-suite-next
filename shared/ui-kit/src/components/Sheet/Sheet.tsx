"use client";

import type { ReactNode } from "react";
import { Sheet as TamaguiSheet } from "tamagui";
import { asUiCompoundComponent } from "../../internal/tamagui-compat";
import { Block } from "../_shared";
import { Text } from "../Text";

const SheetRoot = asUiCompoundComponent(
  TamaguiSheet,
  ["Overlay", "Handle", "Frame", "ScrollView"] as const
);

export type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  snapPoints?: readonly number[];
};

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  snapPoints = [45, 80]
}: SheetProps) {
  return (
    <SheetRoot modal open={open} onOpenChange={onOpenChange} snapPoints={snapPoints} dismissOnSnapToBottom>
      <SheetRoot.Overlay backgroundColor="$shadowColor" opacity={0.44} />
      <SheetRoot.Handle backgroundColor="$borderColorStrong" />
      <SheetRoot.Frame padding="$5" gap="$4" backgroundColor="$surface">
        {title || description ? (
          <Block gap="$1">
            {title ? <Text role="titleMd">{title}</Text> : null}
            {description ? <Text role="body" tone="secondary">{description}</Text> : null}
          </Block>
        ) : null}
        <SheetRoot.ScrollView>{children}</SheetRoot.ScrollView>
      </SheetRoot.Frame>
    </SheetRoot>
  );
}
