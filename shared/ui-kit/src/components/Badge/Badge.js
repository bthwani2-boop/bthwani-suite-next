"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Badge = Badge;
exports.StatusBadge = StatusBadge;
const tamagui_1 = require("tamagui");
const tamagui_compat_1 = require("../../internal/tamagui-compat");
const Text_1 = require("../Text");
const BadgeFrame = (0, tamagui_compat_1.createUiStyled)(tamagui_1.XStack, {
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
    },
    defaultVariants: { tone: "neutral" }
});
function Badge({ label, tone = "neutral", icon }) {
    const textTone = tone === "neutral" ? "secondary" : tone === "action" ? "action" : tone;
    return (<BadgeFrame tone={tone} accessibilityRole="text">
      {icon}
      <Text_1.Text role="caption" tone={textTone}>{label}</Text_1.Text>
    </BadgeFrame>);
}
function StatusBadge({ label, type = "brand", icon }) {
    const tone = type === "success" ? "success" : type === "danger" ? "danger" : "action";
    return <Badge label={label} tone={tone} icon={icon}/>;
}
//# sourceMappingURL=Badge.js.map