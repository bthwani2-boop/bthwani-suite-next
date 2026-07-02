"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sheet = Sheet;
const tamagui_1 = require("tamagui");
const tamagui_compat_1 = require("../../internal/tamagui-compat");
const _shared_1 = require("../_shared");
const Text_1 = require("../Text");
const SheetRoot = (0, tamagui_compat_1.asUiCompoundComponent)(tamagui_1.Sheet, ["Overlay", "Handle", "Frame", "ScrollView"]);
function Sheet({ open, onOpenChange, title, description, children, snapPoints = [45, 80] }) {
    return (<SheetRoot modal open={open} onOpenChange={onOpenChange} snapPoints={snapPoints} dismissOnSnapToBottom>
      <SheetRoot.Overlay backgroundColor="$shadowColor" opacity={0.44}/>
      <SheetRoot.Handle backgroundColor="$borderColorStrong"/>
      <SheetRoot.Frame padding="$5" gap="$4" backgroundColor="$surface">
        {title || description ? (<_shared_1.Block gap="$1">
            {title ? <Text_1.Text role="titleMd">{title}</Text_1.Text> : null}
            {description ? <Text_1.Text role="body" tone="secondary">{description}</Text_1.Text> : null}
          </_shared_1.Block>) : null}
        <SheetRoot.ScrollView>{children}</SheetRoot.ScrollView>
      </SheetRoot.Frame>
    </SheetRoot>);
}
//# sourceMappingURL=Sheet.js.map