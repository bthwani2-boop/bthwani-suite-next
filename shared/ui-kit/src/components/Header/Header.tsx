import type { ReactNode } from "react";
import { Block, Inline } from "../_shared";
import { Text } from "../Text";

export type HeaderProps = {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  actions?: ReactNode;
};

export function Header({ title, subtitle, leading, actions }: HeaderProps) {
  return (
    <Inline
      width="100%"
      minHeight={64}
      justifyContent="space-between"
      paddingVertical="$3"
      borderBottomWidth={1}
      borderBottomColor="$borderColor"
    >
      {leading}
      <Block flex={1} gap="$1">
        <Text role="titleMd">{title}</Text>
        {subtitle ? <Text role="bodySm" tone="secondary">{subtitle}</Text> : null}
      </Block>
      {actions}
    </Inline>
  );
}
