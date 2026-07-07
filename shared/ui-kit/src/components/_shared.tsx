"use client";

import { Button as TamaguiButton, Input, Text as TamaguiText, XStack, YStack } from "tamagui";
import { createUiStyled } from "../internal/tamagui-compat";
import { sizing, spacing, typography } from "../tokens";

export const StyledText = createUiStyled(TamaguiText, {
  color: "$color",
  fontFamily: "$body",
  variants: {
    role: {
      ...typography,
      code: { ...typography.code, fontFamily: "$mono" }
    },
    tone: {
      default: { color: "$color" },
      secondary: { color: "$colorSecondary" },
      muted: { color: "$colorMuted" },
      inverse: { color: "$colorInverse" },
      action: { color: "$action" },
      success: { color: "$success" },
      warning: { color: "$warning" },
      danger: { color: "$danger" },
      info: { color: "$info" }
    }
  } as const,
  defaultVariants: {
    role: "body",
    tone: "default"
  }
});

export const StyledSurface = createUiStyled(YStack, {
  backgroundColor: "$surface",
  borderColor: "$borderColor",
  borderWidth: 1,
  borderRadius: "$lg",
  padding: "$4",
  gap: "$3",
  variants: {
    tone: {
      default: { backgroundColor: "$surface", borderColor: "$borderColor" },
      raised: { backgroundColor: "$surfaceRaised", borderColor: "$borderColorStrong" },
      inset: { backgroundColor: "$surfaceInset", borderColor: "$borderColor" },
      action: { backgroundColor: "$actionSoft", borderColor: "$action" },
      success: { backgroundColor: "$successSoft", borderColor: "$success" },
      warning: { backgroundColor: "$warningSoft", borderColor: "$warning" },
      danger: { backgroundColor: "$dangerSoft", borderColor: "$danger" },
      info: { backgroundColor: "$infoSoft", borderColor: "$info" }
    },
    borderless: {
      true: { borderWidth: 0 }
    },
    fill: {
      true: { flex: 1 }
    }
  } as const,
  defaultVariants: {
    tone: "default"
  }
});

export const StyledButton = createUiStyled(TamaguiButton, {
  borderRadius: "$lg",
  borderWidth: 1,
  fontWeight: "600",
  pressStyle: { opacity: 0.88 },
  focusStyle: { outlineColor: "$focusColor", outlineWidth: 2 },
  variants: {
    tone: {
      primary: {
        backgroundColor: "$action",
        borderColor: "$action",
        color: "$colorInverse",
        hoverStyle: { backgroundColor: "$actionHover", borderColor: "$actionHover" }
      },
      secondary: {
        backgroundColor: "$surface",
        borderColor: "$borderColorStrong",
        color: "$color"
      },
      ghost: {
        backgroundColor: "transparent",
        borderColor: "transparent",
        color: "$action"
      },
      danger: {
        backgroundColor: "$danger",
        borderColor: "$danger",
        color: "$colorInverse"
      },
      success: {
        backgroundColor: "$success",
        borderColor: "$success",
        color: "$colorInverse"
      }
    },
    uiSize: {
      sm: {
        minHeight: sizing.controlSm,
        paddingHorizontal: "$3",
        fontSize: typography.label.fontSize
      },
      md: {
        minHeight: sizing.controlMd,
        paddingHorizontal: "$4",
        fontSize: typography.body.fontSize
      },
      lg: {
        minHeight: sizing.controlLg,
        paddingHorizontal: "$5",
        fontSize: typography.bodyLg.fontSize
      }
    },
    fullWidth: {
      true: { width: "100%" }
    }
  } as const,
  defaultVariants: {
    tone: "primary",
    uiSize: "md"
  }
});

export const StyledInput = createUiStyled(Input, {
  minHeight: sizing.controlMd,
  borderRadius: "$md",
  borderColor: "$borderColorStrong",
  backgroundColor: "$surface",
  color: "$color",
  placeholderTextColor: "$colorMuted",
  focusStyle: {
    borderColor: "$action",
    outlineColor: "$focusColor",
    outlineWidth: 2
  }
});

export const Inline = createUiStyled(XStack, {
  alignItems: "center",
  gap: "$2"
});

export const Block = createUiStyled(YStack, {
  gap: "$2"
});

export const InteractiveRow = createUiStyled(XStack, {
  width: "100%",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "$3",
  padding: "$3",
  borderRadius: "$md",
  pressStyle: { backgroundColor: "$surfaceInset", opacity: 0.9 },
  focusStyle: { outlineColor: "$focusColor", outlineWidth: 2 }
});

export const Dot = createUiStyled(YStack, {
  width: spacing[2],
  height: spacing[2],
  borderRadius: "$round",
  backgroundColor: "$action"
});
