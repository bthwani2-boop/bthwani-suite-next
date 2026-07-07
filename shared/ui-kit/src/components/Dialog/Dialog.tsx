"use client";

import type { ReactNode } from "react";
import { Dialog as TamaguiDialog } from "tamagui";
import { asUiCompoundComponent } from "../../internal/tamagui-compat";
import { Block, Inline } from "../_shared";
import { Button } from "../Button";
import { Text } from "../Text";

const DialogRoot = asUiCompoundComponent(
  TamaguiDialog,
  ["Portal", "Overlay", "Content", "Title", "Description", "Close"] as const
);

export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
};

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm
}: DialogProps) {
  return (
    <DialogRoot modal open={open} onOpenChange={onOpenChange}>
      <DialogRoot.Portal>
        <DialogRoot.Overlay
          key="overlay"
          backgroundColor="$shadowColor"
          opacity={0.44}
          position="absolute"
          inset={0}
        />
        <DialogRoot.Content
          key="content"
          elevate
          bordered
          width="92%"
          maxWidth={560}
          padding="$5"
          borderRadius="$xl"
          backgroundColor="$surface"
          borderColor="$borderColorStrong"
          gap="$4"
        >
          <Block gap="$2">
            <DialogRoot.Title asChild><Text role="titleMd">{title}</Text></DialogRoot.Title>
            {description ? (
              <DialogRoot.Description asChild><Text role="body" tone="secondary">{description}</Text></DialogRoot.Description>
            ) : null}
          </Block>
          {children}
          <Inline justifyContent="flex-end" flexWrap="wrap">
            <DialogRoot.Close asChild><Button label={cancelLabel} tone="secondary" fullWidth={false} /></DialogRoot.Close>
            {confirmLabel && onConfirm ? <Button label={confirmLabel} onPress={onConfirm} fullWidth={false} /> : null}
          </Inline>
        </DialogRoot.Content>
      </DialogRoot.Portal>
    </DialogRoot>
  );
}
