import type { ReactNode } from "react";
import { Block, Inline } from "../_shared";
import { Text } from "../Text";

export type HeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

export function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <Inline
      width="100%"
      minHeight={64}
      justifyContent="space-between"
      paddingVertical="$3"
      paddingHorizontal="$4"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
      flexDirection="row-reverse"
    >
      <Block flex={1} gap="$1" style={{ alignItems: "flex-end" }}>
        <Text role="titleMd" style={{ textAlign: "right" }}>{title}</Text>
        {subtitle ? <Text role="bodySm" tone="secondary" style={{ textAlign: "right" }}>{subtitle}</Text> : null}
      </Block>
      {actions}
    </Inline>
  );
}
