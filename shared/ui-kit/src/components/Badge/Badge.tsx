import type { ReactNode } from "react";
import { XStack, styled } from "tamagui";
import { Text } from "../Text";

const createStyled = styled as (...args: unknown[]) => any;

const BadgeFrame = createStyled(XStack, {
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
  return (
    <BadgeFrame tone={tone} accessibilityRole="text">
      {icon}
      <Text role="caption" color="currentColor">{label}</Text>
    </BadgeFrame>
  );
}
