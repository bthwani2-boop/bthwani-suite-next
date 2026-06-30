"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dot = exports.InteractiveRow = exports.Block = exports.Inline = exports.StyledInput = exports.StyledButton = exports.StyledSurface = exports.StyledText = void 0;
const tamagui_1 = require("tamagui");
const tamagui_compat_1 = require("../internal/tamagui-compat");
const tokens_1 = require("../tokens");
exports.StyledText = (0, tamagui_compat_1.createUiStyled)(tamagui_1.Text, {
    color: "$color",
    fontFamily: "$body",
    variants: {
        role: {
            ...tokens_1.typography,
            code: { ...tokens_1.typography.code, fontFamily: "$mono" }
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
    },
    defaultVariants: {
        role: "body",
        tone: "default"
    }
});
exports.StyledSurface = (0, tamagui_compat_1.createUiStyled)(tamagui_1.YStack, {
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
    },
    defaultVariants: {
        tone: "default"
    }
});
exports.StyledButton = (0, tamagui_compat_1.createUiStyled)(tamagui_1.Button, {
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
                minHeight: tokens_1.sizing.controlSm,
                paddingHorizontal: "$3",
                fontSize: tokens_1.typography.label.fontSize
            },
            md: {
                minHeight: tokens_1.sizing.controlMd,
                paddingHorizontal: "$4",
                fontSize: tokens_1.typography.body.fontSize
            },
            lg: {
                minHeight: tokens_1.sizing.controlLg,
                paddingHorizontal: "$5",
                fontSize: tokens_1.typography.bodyLg.fontSize
            }
        },
        fullWidth: {
            true: { width: "100%" }
        }
    },
    defaultVariants: {
        tone: "primary",
        uiSize: "md"
    }
});
exports.StyledInput = (0, tamagui_compat_1.createUiStyled)(tamagui_1.Input, {
    minHeight: tokens_1.sizing.controlMd,
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
exports.Inline = (0, tamagui_compat_1.createUiStyled)(tamagui_1.XStack, {
    alignItems: "center",
    gap: "$2"
});
exports.Block = (0, tamagui_compat_1.createUiStyled)(tamagui_1.YStack, {
    gap: "$2"
});
exports.InteractiveRow = (0, tamagui_compat_1.createUiStyled)(tamagui_1.XStack, {
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "$3",
    padding: "$3",
    borderRadius: "$md",
    pressStyle: { backgroundColor: "$surfaceInset", opacity: 0.9 },
    focusStyle: { outlineColor: "$focusColor", outlineWidth: 2 }
});
exports.Dot = (0, tamagui_compat_1.createUiStyled)(tamagui_1.YStack, {
    width: tokens_1.spacing[2],
    height: tokens_1.spacing[2],
    borderRadius: "$round",
    backgroundColor: "$action"
});
//# sourceMappingURL=_shared.js.map