from pathlib import Path

path = Path('services/dsh/frontend/shared/dispatch/dispatch.types.ts')
text = path.read_text(encoding='utf-8')
anchor = '  arrived_customer: "وصل الكابتن للعميل",\n  delivered: "تم التسليم",'
replacement = '  arrived_customer: "وصل الكابتن للعميل",\n  returning_to_store: "في طريق العودة إلى المتجر",\n  returned_to_store: "أعيد إلى المتجر",\n  delivered: "تم التسليم",'
if replacement not in text:
    if anchor not in text:
        raise RuntimeError('delivery status label anchor not found')
    text = text.replace(anchor, replacement, 1)
path.write_text(text, encoding='utf-8')
print('Added explicit return-to-store delivery labels.')
