"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Header = Header;
const _shared_1 = require("../_shared");
const Text_1 = require("../Text");
function Header({ title, subtitle, actions }) {
    return (<_shared_1.Inline width="100%" minHeight={64} justifyContent="space-between" paddingVertical="$3" paddingHorizontal="$4" borderBottomWidth={1} borderBottomColor="$borderColor" flexDirection="row-reverse">
      <_shared_1.Block flex={1} gap="$1" style={{ alignItems: "flex-end" }}>
        <Text_1.Text role="titleMd" style={{ textAlign: "right" }}>{title}</Text_1.Text>
        {subtitle ? <Text_1.Text role="bodySm" tone="secondary" style={{ textAlign: "right" }}>{subtitle}</Text_1.Text> : null}
      </_shared_1.Block>
      {actions}
    </_shared_1.Inline>);
}
//# sourceMappingURL=Header.js.map