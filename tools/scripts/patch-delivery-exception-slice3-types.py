from pathlib import Path

path = Path('services/dsh/frontend/shared/dispatch/dispatch.types.ts')
text = path.read_text(encoding='utf-8')
anchor = 'export type DshDeliveryException = components["schemas"]["DshDeliveryException"];\n'
addition = anchor + 'export type DshDeliveryExceptionReasonCode = components["schemas"]["DshDeliveryExceptionReasonCode"];\n'
if addition not in text:
    if anchor not in text:
        raise RuntimeError('delivery exception type anchor not found')
    text = text.replace(anchor, addition, 1)
path.write_text(text, encoding='utf-8')
print('Exported governed delivery-exception reason code type.')
