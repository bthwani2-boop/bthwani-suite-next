"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateView = StateView;
const tamagui_1 = require("tamagui");
const _shared_1 = require("../_shared");
const Button_1 = require("../Button");
const Surface_1 = require("../Surface");
const Text_1 = require("../Text");
function StateView({ title, description, tone = "neutral", loading, icon, actionLabel, onActionPress }) {
    const surfaceTone = tone === "neutral" ? "inset" : tone;
    return (<Surface_1.Surface tone={surfaceTone} centered padding="$6" width="100%">
      <_shared_1.Block alignItems="center" gap="$3" maxWidth={520}>
        {loading ? <tamagui_1.Spinner size="large" color="$action"/> : icon}
        <Text_1.Text role="titleMd" align="center">{title}</Text_1.Text>
        {description ? <Text_1.Text role="body" tone="secondary" align="center">{description}</Text_1.Text> : null}
        {actionLabel && onActionPress ? (<Button_1.Button label={actionLabel} tone={tone === "danger" ? "danger" : "primary"} onPress={onActionPress} fullWidth={false}/>) : null}
      </_shared_1.Block>
    </Surface_1.Surface>);
}
//# sourceMappingURL=StateView.js.map