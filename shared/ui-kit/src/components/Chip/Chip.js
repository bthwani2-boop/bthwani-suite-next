"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Chip = Chip;
exports.MetricChip = MetricChip;
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const Text_1 = require("../Text");
const colors_1 = require("../../tokens/colors");
// Platform-safe RTL detection: reads document.dir on web, false on SSR / mobile fallback.
// Intentionally avoids importing react-native so this module is safe for Turbopack / Next.js.
const isRtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";
function Chip({ label, selected = false, disabled = false, icon, onPress }) {
    return (<react_native_1.Pressable onPress={disabled ? undefined : onPress} disabled={disabled} accessibilityRole="button" accessibilityState={{ selected, disabled }} style={{
            ...styles.chip,
            ...(selected ? styles.chipSelected : styles.chipUnselected),
            ...(disabled ? { opacity: 0.5 } : {}),
        }}>
      <react_native_1.View style={{
            ...styles.innerContainer,
            ...(isRtl ? styles.rowReverse : {}),
        }}>
        {icon != null && (<react_native_1.View style={styles.iconContainer}>
            {icon}
          </react_native_1.View>)}
        <Text_1.Text style={{
            ...styles.chipText,
            ...(selected ? styles.textSelected : styles.textUnselected),
        }} numberOfLines={1}>
          {label}
        </Text_1.Text>
      </react_native_1.View>
    </react_native_1.Pressable>);
}
function MetricChip({ icon, label, accent = false }) {
    return (<Chip label={label} icon={icon} disabled selected={accent}/>);
}
const styles = {
    chip: {
        height: 34,
        borderRadius: 12, // Soft rounded corners matching donor design spec
        paddingHorizontal: 14,
        borderWidth: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    chipSelected: {
        // Selected state: Light orange/cream tint background, solid orange border
        backgroundColor: "rgba(255, 80, 13, 0.12)",
        borderColor: colors_1.colorRoles.brandAction,
    },
    chipUnselected: {
        // Unselected state: Solid white background, subtle border
        backgroundColor: colors_1.colorRoles.surfaceBase,
        borderColor: "rgba(10, 47, 92, 0.08)",
    },
    innerContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    rowReverse: {
        flexDirection: "row-reverse",
    },
    iconContainer: {
        width: 18,
        height: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    chipText: {
        fontSize: 12,
        fontWeight: "700",
        fontFamily: "Outfit-Bold",
    },
    textSelected: {
        color: colors_1.colorRoles.brandAction,
    },
    textUnselected: {
        color: colors_1.colorRoles.brandStructure,
    },
};
//# sourceMappingURL=Chip.js.map