"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MobileStickyPrimaryAction = MobileStickyPrimaryAction;
const ui_kit_1 = require("@bthwani/ui-kit");
const react_1 = __importDefault(require("react"));
const react_native_1 = require("react-native");
const Button_1 = require("./Button");
const spacing_1 = require("../../tokens/spacing");
function MobileStickyPrimaryAction({ label, onPress, disabled, }) {
    return (<react_native_1.View style={styles.container}>
      <Button_1.Button label={label} onPress={onPress} disabled={disabled} tone="primary" fullWidth/>
    </react_native_1.View>);
}
const styles = react_native_1.StyleSheet.create({
    container: {
        width: '100%',
        padding: spacing_1.spacing[4],
        backgroundColor: ui_kit_1.colorRoles.surfaceBase,
        borderTopWidth: 1,
        borderTopColor: ui_kit_1.colorRoles.surfaceBase,
    },
});
//# sourceMappingURL=MobileStickyPrimaryAction.js.map