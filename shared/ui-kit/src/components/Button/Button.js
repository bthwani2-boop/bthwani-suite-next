"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Button = Button;
exports.FloatingActionCircle = FloatingActionCircle;
const tamagui_1 = require("tamagui");
const _shared_1 = require("../_shared");
function Button({ children, label, size = "md", loading = false, disabled, leading, trailing, fullWidth, tone, accessibilityLabel, accessibilityState, onPress, circular = false, pill = false, style }) {
    const resolvedDisabled = Boolean(disabled || loading);
    return (<_shared_1.StyledButton accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{
            ...accessibilityState,
            disabled: resolvedDisabled,
            busy: loading
        }} disabled={resolvedDisabled} uiSize={size} icon={loading ? <tamagui_1.Spinner size="small" color="currentColor"/> : leading} iconAfter={trailing} borderRadius={circular || pill ? "$round" : undefined} paddingHorizontal={circular ? 0 : undefined} fullWidth={fullWidth} tone={tone} onPress={onPress} style={style}>
      {label ?? children}
    </_shared_1.StyledButton>);
}
function FloatingActionCircle({ icon, onPress, accessibilityLabel }) {
    return (<Button accessibilityLabel={accessibilityLabel} circular tone="secondary" {...(onPress ? { onPress } : {})} style={{
            backgroundColor: "rgba(255, 255, 255, 0.45)",
            borderColor: "rgba(0, 0, 0, 0.12)",
            borderWidth: 1.5,
            width: 44,
            height: 44,
            paddingHorizontal: 0,
            justifyContent: "center",
            alignItems: "center",
        }}>
      {icon}
    </Button>);
}
//# sourceMappingURL=Button.js.map