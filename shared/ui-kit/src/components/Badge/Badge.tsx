"use client";

import type { ReactNode } from "react";
import { XStack } from "tamagui";
import { createUiStyled } from "../../internal/tamagui-compat";
import { Text } from "../Text";

const BadgeFrame = createUiStyled(XStack, {
  alignSelf: "flex-start",
  alignItems: "center",
  gap: "$1",
  minHeight: 24,
  paddingHorizontal: "$2",
  borderRadius: "$round",
  borderWidth: 1,
  variants: {
    tone: {
      neutral: { backgroundColor: "$surfaceInset", borderColor: "$borderColor", color: "$colorSecondary" },
      action: { backgroundColor: "$actionSoft", borderColor: "$action", color: "$action" },
      success: { backgroundColor: "$successSoft", borderColor: "$success", color: "$success" },
      warning: { backgroundColor: "$warningSoft", borderColor: "$warning", color: "$warning" },
      danger: { backgroundColor: "$dangerSoft", borderColor: "$danger", color: "$danger" },
      info: { backgroundColor: "$infoSoft", borderColor: "$info", color: "$info" }
    }
  } as const,
  defaultVariants: { tone: "neutral" }
});

export type BadgeProps = {
  label: string;
  tone?: "neutral" | "action" | "success" | "warning" | "danger" | "info";
  icon?: ReactNode;
};

export function Badge({ label, tone = "neutral", icon }: BadgeProps) {
  const textTone = tone === "neutral" ? "secondary" : tone === "action" ? "action" : tone;

  return (
    <BadgeFrame tone={tone} accessibilityRole="text">
      {icon}
      <Text role="caption" tone={textTone}>{label}</Text>
    </BadgeFrame>
  );
}

export type StatusBadgeProps = {
  readonly label: string;
  readonly type?: "success" | "danger" | "brand";
  readonly icon?: ReactNode;
};

export function StatusBadge({ label, type = "brand", icon }: StatusBadgeProps) {
  const tone = type === "success" ? "success" : type === "danger" ? "danger" : "action";
  return <Badge label={label} tone={tone} icon={icon} />;
}
