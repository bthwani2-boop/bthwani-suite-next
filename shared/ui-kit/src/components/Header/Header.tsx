import type { ReactNode } from "react";
import { Block, Inline } from "../_shared";
import { Text } from "../Text";
import { IconButton } from "../IconButton";
import { Icon } from "../Icon/Icon";
import { colorRoles } from "../../tokens/colors";

export type HeaderTone = "surface" | "brand";

export type HeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** "brand" gives the header a filled brandAction background (e.g. the home screen). Defaults to "surface". */
  tone?: HeaderTone;
  /** Renders a single, consistent back affordance (arrow-back icon, RTL-mirrored) in the leading slot. */
  onBack?: () => void;
  backAccessibilityLabel?: string;
};

export function Header({
  title,
  subtitle,
  actions,
  tone = "surface",
  onBack,
  backAccessibilityLabel = "رجوع",
}: HeaderProps) {
  const isBrand = tone === "brand";
  const titleColor = isBrand ? colorRoles.textInverse : undefined;
  const subtitleTone = isBrand ? "inverse" : "secondary";

  return (
    <Inline
      width="100%"
      minHeight={64}
      justifyContent="space-between"
      paddingVertical="$3"
      paddingHorizontal="$4"
      borderBottomWidth={isBrand ? 0 : 1}
      borderBottomColor="$borderColor"
      backgroundColor={isBrand ? colorRoles.brandAction : undefined}
      flexDirection="row-reverse"
    >
      {onBack ? (
        <IconButton
          icon={<Icon name="arrow-back" mirrored {...(isBrand ? { color: colorRoles.textInverse } : {})} />}
          accessibilityLabel={backAccessibilityLabel}
          tone="ghost"
          onPress={onBack}
        />
      ) : null}
      <Block flex={1} gap="$1" style={{ alignItems: "flex-end" }}>
        <Text role="titleMd" style={{ textAlign: "right", ...(titleColor ? { color: titleColor } : {}) }}>{title}</Text>
        {subtitle ? <Text role="bodySm" tone={subtitleTone} style={{ textAlign: "right" }}>{subtitle}</Text> : null}
      </Block>
      {actions}
    </Inline>
  );
}
