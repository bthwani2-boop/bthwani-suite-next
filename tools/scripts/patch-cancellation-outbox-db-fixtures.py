from pathlib import Path

PATH = Path("services/dsh/backend/internal/checkoutfinanceoutbox/worker_test.go")
text = PATH.read_text(encoding="utf-8")

old = '''\tstoreID = uniqueID("checkout-finance-outbox-store")
\tclientID = uniqueID("checkout-finance-outbox-client")
'''
new = '''\ttenantID := uniqueID("tenant-checkout-finance-outbox")
\tstoreID = uniqueID("checkout-finance-outbox-store")
\tclientID = uniqueID("checkout-finance-outbox-client")
'''
if old in text:
    text = text.replace(old, new, 1)

old = '''\tif err := db.QueryRowContext(ctx, `
\t\tINSERT INTO dsh_checkout_intents (client_id, cart_id, store_id, state, payment_method, wlt_payment_session_id)
\t\tVALUES ($1, gen_random_uuid(), $2, 'payment_pending', 'cod', $3)
\t\tRETURNING id::text`,
\t\tclientID, storeID, paymentSessionID,
\t).Scan(&intentID); err != nil {'''
new = '''\tif err := db.QueryRowContext(ctx, `
\t\tINSERT INTO dsh_checkout_intents (tenant_id, client_id, cart_id, store_id, state, payment_method, wlt_payment_session_id)
\t\tVALUES ($1, $2, gen_random_uuid(), $3, 'payment_pending', 'cod', $4)
\t\tRETURNING id::text`,
\t\ttenantID, clientID, storeID, paymentSessionID,
\t).Scan(&intentID); err != nil {'''
if old not in text and new not in text:
    raise RuntimeError("checkout finance outbox intent fixture anchor not found")
text = text.replace(old, new, 1)

old = '''\tif err := db.QueryRow(`
\t\tINSERT INTO dsh_orders (checkout_intent_id, store_id, client_id, status, wlt_payment_ref_id)
\t\tVALUES ($1::uuid, $2, $3, 'cancelled', $4)
\t\tRETURNING id::text`,
\t\tintentID, storeID, clientID, paymentSessionID,
\t).Scan(&orderID); err != nil {'''
new = '''\tif err := db.QueryRow(`
\t\tINSERT INTO dsh_orders (tenant_id, checkout_intent_id, store_id, client_id, status, wlt_payment_ref_id)
\t\tSELECT tenant_id, $1::uuid, $2, $3, 'cancelled_by_operator', $4
\t\tFROM dsh_checkout_intents
\t\tWHERE id = $1::uuid
\t\tRETURNING id::text`,
\t\tintentID, storeID, clientID, paymentSessionID,
\t).Scan(&orderID); err != nil {'''
if old not in text and new not in text:
    raise RuntimeError("checkout finance outbox order fixture anchor not found")
text = text.replace(old, new, 1)

PATH.write_text(text, encoding="utf-8")
Path("tools/scripts/patch-cancellation-outbox-db-fixtures.py").unlink(missing_ok=True)
print("Checkout financial outbox DB fixtures aligned with tenant and explicit cancellation constraints.")
