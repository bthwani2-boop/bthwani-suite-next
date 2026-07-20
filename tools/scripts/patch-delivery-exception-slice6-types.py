from pathlib import Path

path = Path('services/dsh/frontend/control-panel/operations/ExceptionsEscalationsScreen.tsx')
text = path.read_text(encoding='utf-8')
old = '''      const cancellation = await cancelOrder('operator', item.orderId, {
        reasonCode: 'operational_failure',
        reasonNote: `إلغاء بعد استلام المرتجع: ${note.trim()}`,
        correlationId: `returned-delivery-exception-${item.id}`,
      });
      setReturnCancellations((current) => ({ ...current, [item.orderId]: cancellation }));'''
new = '''      const response = await cancelOrder('operator', item.orderId, {
        reasonCode: 'operational_failure',
        reasonNote: `إلغاء بعد استلام المرتجع: ${note.trim()}`,
        correlationId: `returned-delivery-exception-${item.id}`,
      });
      setReturnCancellations((current) => ({ ...current, [item.orderId]: response.cancellation }));'''
if new not in text:
    if old not in text:
        raise RuntimeError('governed cancellation response anchor not found')
    text = text.replace(old, new, 1)
path.write_text(text, encoding='utf-8')
print('Unwrapped governed cancellation response for operations state.')
