"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dialog = Dialog;
const tamagui_1 = require("tamagui");
const tamagui_compat_1 = require("../../internal/tamagui-compat");
const _shared_1 = require("../_shared");
const Button_1 = require("../Button");
const Text_1 = require("../Text");
const DialogRoot = (0, tamagui_compat_1.asUiCompoundComponent)(tamagui_1.Dialog, ["Portal", "Overlay", "Content", "Title", "Description", "Close"]);
function Dialog({ open, onOpenChange, title, description, children, confirmLabel, cancelLabel = "Cancel", onConfirm }) {
    return (<DialogRoot modal open={open} onOpenChange={onOpenChange}>
      <DialogRoot.Portal>
        <DialogRoot.Overlay key="overlay" backgroundColor="$shadowColor" opacity={0.44} position="absolute" inset={0}/>
        <DialogRoot.Content key="content" elevate bordered width="92%" maxWidth={560} padding="$5" borderRadius="$xl" backgroundColor="$surface" borderColor="$borderColorStrong" gap="$4">
          <_shared_1.Block gap="$2">
            <DialogRoot.Title asChild><Text_1.Text role="titleMd">{title}</Text_1.Text></DialogRoot.Title>
            {description ? (<DialogRoot.Description asChild><Text_1.Text role="body" tone="secondary">{description}</Text_1.Text></DialogRoot.Description>) : null}
          </_shared_1.Block>
          {children}
          <_shared_1.Inline justifyContent="flex-end" flexWrap="wrap">
            <DialogRoot.Close asChild><Button_1.Button label={cancelLabel} tone="secondary" fullWidth={false}/></DialogRoot.Close>
            {confirmLabel && onConfirm ? <Button_1.Button label={confirmLabel} onPress={onConfirm} fullWidth={false}/> : null}
          </_shared_1.Inline>
        </DialogRoot.Content>
      </DialogRoot.Portal>
    </DialogRoot>);
}
//# sourceMappingURL=Dialog.js.map