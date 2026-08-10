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
  /** Stable reason code shown as a support reference, e.g. `CHECKLIST_INCOMPLETE`. */
  code?: string;
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
export function InlineNotice({ tone, title, description, code, action }: InlineNoticeProps) {
  // Screen readers must announce a notice when it appears; a colored border is
  // not perceivable feedback on its own.
  const isUrgent = tone === "danger" || tone === "warning";
  const announcement = [title, description, code ? `رمز السبب: ${code}` : null]
    .filter(Boolean)
    .join(". ");

  return (
    <View
      // Live region on the container announces the notice when it appears.
      // `accessible` is deliberately NOT set here: it would collapse the action
      // buttons into the label and make them unreachable.
      accessibilityLiveRegion={isUrgent ? "assertive" : "polite"}
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
      {/* Decorative: the tone is already carried by the announced label. */}
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Icon name={TONE_ICON[tone]} size={20} tone={TONE_ICON_COLOR[tone]} />
      </View>
      <View style={{ flex: 1, gap: spacing[1] }}>
        <View
          accessible
          accessibilityRole={isUrgent ? "alert" : "text"}
          accessibilityLabel={announcement}
          style={{ gap: spacing[1] }}
        >
          <Text role="bodyStrong" style={{ textAlign: "right" }}>{title}</Text>
          {description ? <Text role="bodySm" tone="muted" style={{ textAlign: "right" }}>{description}</Text> : null}
          {code ? (
            <Text role="caption" tone="muted" style={{ textAlign: "right" }}>{`رمز السبب: ${code}`}</Text>
          ) : null}
        </View>
        {action ? <View style={{ alignItems: "flex-end", marginTop: spacing[1] }}>{action}</View> : null}
      </View>
    </View>
  );
}
