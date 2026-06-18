import { Button as TamaguiButton, Input, Text as TamaguiText, XStack, YStack, styled } from "tamagui";

// Tamagui 2.0.0-rc.41 has incomplete styled-prop inference under strict
// cross-platform TS settings. Keep the compatibility cast private so the
// exported component contracts remain explicit and stable.
const createStyled = styled as (...args: unknown[]) => any;

export const StyledText = createStyled(TamaguiText, {
  color: "$color",
  fontFamily: "$body",
  variants: {
    role: {
      display: { fontSize: 36, lineHeight: 44, fontWeight: "700" },
      hero: { fontSize: 30, lineHeight: 38, fontWeight: "700" },
      titleLg: { fontSize: 24, lineHeight: 32, fontWeight: "700" },
      titleMd: { fontSize: 20, lineHeight: 28, fontWeight: "600" },
      titleSm: { fontSize: 18, lineHeight: 26, fontWeight: "600" },
      bodyLg: { fontSize: 17, lineHeight: 27, fontWeight: "400" },
      body: { fontSize: 15, lineHeight: 24, fontWeight: "400" },
      bodyStrong: { fontSize: 15, lineHeight: 24, fontWeight: "600" },
      bodySm: { fontSize: 14, lineHeight: 21, fontWeight: "400" },
      label: { fontSize: 13, lineHeight: 18, fontWeight: "600" },
      caption: { fontSize: 12, lineHeight: 17, fontWeight: "500" },
      code: { fontSize: 13, lineHeight: 19, fontWeight: "500", fontFamily: "$mono" }
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
    },
    align: {
      start: { textAlign: "left" },
      center: { textAlign: "center" },
      end: { textAlign: "right" }
    }
  } as const,
  defaultVariants: {
    role: "body",
    tone: "default",
    align: "start"
  }
});

export const StyledSurface = createStyled(YStack, {
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

export const StyledButton = createStyled(TamaguiButton, {
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
      sm: { minHeight: 36, paddingHorizontal: "$3", fontSize: 13 },
      md: { minHeight: 44, paddingHorizontal: "$4", fontSize: 15 },
      lg: { minHeight: 52, paddingHorizontal: "$5", fontSize: 16 }
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

export const StyledInput = createStyled(Input, {
  minHeight: 44,
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

export const Inline = createStyled(XStack, {
  alignItems: "center",
  gap: "$2"
});

export const Block = createStyled(YStack, {
  gap: "$2"
});

export const InteractiveRow = createStyled(XStack, {
  width: "100%",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "$3",
  padding: "$3",
  borderRadius: "$md",
  pressStyle: { backgroundColor: "$surfaceInset", opacity: 0.9 },
  focusStyle: { outlineColor: "$focusColor", outlineWidth: 2 }
});

export const Dot = createStyled(YStack, {
  width: 8,
  height: 8,
  borderRadius: "$round",
  backgroundColor: "$action"
});
