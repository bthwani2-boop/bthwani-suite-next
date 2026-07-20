from pathlib import Path


def patch(path: str, replacements: list[tuple[str, str]]) -> None:
    target = Path(path)
    text = target.read_text(encoding="utf-8")
    for old, new in replacements:
        if new in text:
            continue
        if old not in text:
            raise RuntimeError(f"pricing fixture anchor not found in {path}: {old[:80]!r}")
        text = text.replace(old, new, 1)
    target.write_text(text, encoding="utf-8")


pricing_columns = "subtotal_minor_units, delivery_fee_minor_units, discount_minor_units, total_minor_units, currency, pricing_snapshot_hash"

patch(
    "services/dsh/backend/internal/orders/orders_db_test.go",
    [
        (
            """\t\t\tpayment_method, wlt_payment_session_id
\t\t)
\t\tVALUES ($1, $2, $3::uuid, $4, 'payment_pending', 'bthwani_delivery', 'cod', $5)
""",
            f"""\t\t\tpayment_method, wlt_payment_session_id, {pricing_columns}
\t\t)
\t\tVALUES ($1, $2, $3::uuid, $4, 'payment_pending', 'bthwani_delivery', 'cod', $5,
\t\t        8400, 0, 0, 8400, 'YER', repeat('a', 64))
""",
        ),
        (
            """\t\t\tpayment_method, wlt_payment_session_id
\t\t)
\t\tVALUES ($1, $2, gen_random_uuid(), $3, 'confirmed', 'bthwani_delivery', 'wallet', $4)
""",
            f"""\t\t\tpayment_method, wlt_payment_session_id, {pricing_columns}
\t\t)
\t\tVALUES ($1, $2, gen_random_uuid(), $3, 'confirmed', 'bthwani_delivery', 'wallet', $4,
\t\t        1000, 0, 0, 1000, 'YER', repeat('b', 64))
""",
        ),
    ],
)

patch(
    "services/dsh/backend/internal/dispatch/cancellation_db_test.go",
    [
        (
            """\t\tINSERT INTO dsh_checkout_intents(tenant_id,client_id,cart_id,store_id,state,fulfillment_mode,payment_method,wlt_payment_session_id)
\t\tVALUES($1,$2,gen_random_uuid(),$3,'confirmed','bthwani_delivery','wallet',$4)
""",
            f"""\t\tINSERT INTO dsh_checkout_intents(tenant_id,client_id,cart_id,store_id,state,fulfillment_mode,payment_method,wlt_payment_session_id,{pricing_columns})
\t\tVALUES($1,$2,gen_random_uuid(),$3,'confirmed','bthwani_delivery','wallet',$4,
\t\t       1000,0,0,1000,'YER',repeat('c',64))
""",
        ),
    ],
)

patch(
    "services/dsh/backend/internal/pickup/pickup_db_test.go",
    [
        (
            """\t\tINSERT INTO dsh_checkout_intents (tenant_id, client_id, cart_id, store_id, state, fulfillment_mode, payment_method)
\t\tVALUES ($1, $2, $3::uuid, $4, 'payment_pending', 'pickup', 'wallet')
""",
            f"""\t\tINSERT INTO dsh_checkout_intents (tenant_id, client_id, cart_id, store_id, state, fulfillment_mode, payment_method, {pricing_columns})
\t\tVALUES ($1, $2, $3::uuid, $4, 'payment_pending', 'pickup', 'wallet',
\t\t        1000, 0, 0, 1000, 'YER', repeat('d', 64))
""",
        ),
    ],
)

patch(
    "services/dsh/backend/internal/checkoutfinanceoutbox/worker_test.go",
    [
        (
            """\t\tINSERT INTO dsh_checkout_intents (tenant_id, client_id, cart_id, store_id, state, payment_method, wlt_payment_session_id)
\t\tVALUES ($1, $2, gen_random_uuid(), $3, 'payment_pending', 'cod', $4)
""",
            f"""\t\tINSERT INTO dsh_checkout_intents (tenant_id, client_id, cart_id, store_id, state, payment_method, wlt_payment_session_id, {pricing_columns})
\t\tVALUES ($1, $2, gen_random_uuid(), $3, 'payment_pending', 'cod', $4,
\t\t        1000, 0, 0, 1000, 'YER', repeat('e', 64))
""",
        ),
    ],
)

Path("tools/scripts/patch-cancellation-pricing-db-fixtures.py").unlink(missing_ok=True)
print("Cancellation journey DB fixtures now carry valid governed pricing snapshots.")
