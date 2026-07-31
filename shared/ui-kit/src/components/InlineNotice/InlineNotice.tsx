import type { ReactNode } from "react";
import { View } from "react-native";
import { Text } from "../Text";
import { Icon } from "../Icon/Icon";
import { colorRoles } from "../../tokens/colors";
import { spacing } from "../../tokens/spacing";

export type InlineNoticeTone = "success" | "info" | "warning" | "danger";

export type InlineNoticeProps = {
  tone: InlineNoticeTone;
  title: string;
  description?: string;
  action?: ReactNode;
};

const TONE_ICON: Record<InlineNoticeTone, string> = {
  success: "checkmark-circle",
  info: "sync-outline",
  warning: "alert-circle-outline",
  danger: "close-circle-outline",
};

const TONE_BG: Record<InlineNoticeTone, string> = {
  success: colorRoles.surfaceBase,
  info: colorRoles.brandActionSoft,
  warning: colorRoles.surfaceBase,
  danger: colorRoles.surfaceBase,
};

const TONE_BORDER: Record<InlineNoticeTone, string> = {
  success: colorRoles.success,
  info: colorRoles.brandAction,
  warning: colorRoles.warning,
  danger: colorRoles.danger,
};

const TONE_ICON_COLOR: Record<InlineNoticeTone, "success" | "brand" | "warning" | "danger"> = {
  success: "success",
  info: "brand",
  warning: "warning",
  danger: "danger",
};

/**
 * Compact inline banner for in-page success/queued/error/info feedback —
 * distinct from `StateView`, which is for a full page's loading/empty/error
 * state. Every screen that hand-rolled its own "notice card" should use this.
 */
export function InlineNotice({ tone, title, description, action }: InlineNoticeProps) {
  return (
    <View
      style={{
        flexDirection: "row-reverse",
        alignItems: "flex-start",
        gap: spacing[2],
        padding: spacing[3],
        borderRadius: 12,
        borderWidth: 1,
        borderColor: TONE_BORDER[tone],
        backgroundColor: TONE_BG[tone],
      }}
    >
      <Icon name={TONE_ICON[tone]} size={20} tone={TONE_ICON_COLOR[tone]} />
      <View style={{ flex: 1, gap: spacing[1] }}>
        <Text role="bodyStrong" style={{ textAlign: "right" }}>{title}</Text>
        {description ? <Text role="bodySm" tone="muted" style={{ textAlign: "right" }}>{description}</Text> : null}
        {action ? <View style={{ alignItems: "flex-end", marginTop: spacing[1] }}>{action}</View> : null}
      </View>
    </View>
  );
}
