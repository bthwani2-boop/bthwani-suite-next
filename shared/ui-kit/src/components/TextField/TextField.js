"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextField = TextField;
const _shared_1 = require("../_shared");
const Text_1 = require("../Text");
function TextField({ label, hint, error, leading, trailing, id, ...props }) {
    const fieldId = id ?? props.name;
    return (<_shared_1.Block gap="$2" width="100%">
      {label ? <Text_1.Text role="label" {...(fieldId ? { htmlFor: fieldId } : {})}>{label}</Text_1.Text> : null}
      <_shared_1.Block position="relative">
        <_shared_1.StyledInput id={fieldId} aria-invalid={Boolean(error)} borderColor={error ? "$danger" : undefined} paddingStart={leading ? "$10" : undefined} paddingEnd={trailing ? "$10" : undefined} {...props}/>
        {leading ? <_shared_1.Block position="absolute" insetInlineStart="$3" top={0} bottom={0} justifyContent="center">{leading}</_shared_1.Block> : null}
        {trailing ? <_shared_1.Block position="absolute" insetInlineEnd="$3" top={0} bottom={0} justifyContent="center">{trailing}</_shared_1.Block> : null}
      </_shared_1.Block>
      {error ? <Text_1.Text role="caption" tone="danger">{error}</Text_1.Text> : hint ? <Text_1.Text role="caption" tone="muted">{hint}</Text_1.Text> : null}
    </_shared_1.Block>);
}
//# sourceMappingURL=TextField.js.map