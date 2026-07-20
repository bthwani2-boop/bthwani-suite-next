from pathlib import Path

PATH = Path("services/dsh/backend/internal/orders/orders.go")
text = PATH.read_text(encoding="utf-8")
old = '''		INSERT INTO dsh_orders (checkout_intent_id, store_id, fulfillment_mode, client_id, status, wlt_payment_ref_id)
		VALUES ($1::uuid, $2, (SELECT fulfillment_mode FROM dsh_checkout_intents WHERE id = $1::uuid AND tenant_id=$3), $4, $5, $6)
'''
new = '''		INSERT INTO dsh_orders (tenant_id, checkout_intent_id, store_id, fulfillment_mode, client_id, status, wlt_payment_ref_id)
		VALUES ($3, $1::uuid, $2, (SELECT fulfillment_mode FROM dsh_checkout_intents WHERE id = $1::uuid AND tenant_id=$3), $4, $5, $6)
'''
if new not in text:
    if old not in text:
        raise RuntimeError("CreateOrder tenant write anchor not found")
    text = text.replace(old, new, 1)
PATH.write_text(text, encoding="utf-8")
Path("tools/scripts/patch-cancellation-order-tenant-write.py").unlink(missing_ok=True)
print("CreateOrder now persists tenant_id explicitly from its governed input.")
