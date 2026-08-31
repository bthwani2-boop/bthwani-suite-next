-- DSH-1076: make client cart idempotency atomic at the mutation transaction boundary.
-- The legacy table keyed receipts by cart_id and was written after the cart
-- mutation, so concurrent requests could both mutate before either receipt won.

CREATE TABLE dsh_cart_mutation_receipts (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id           TEXT        NOT NULL,
    idempotency_key     TEXT        NOT NULL,
    operation           TEXT        NOT NULL CHECK (operation IN ('add_item', 'remove_item', 'clear_cart', 'historical')),
    request_fingerprint TEXT        NOT NULL CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
    correlation_id      TEXT        NOT NULL,
    cart_id             UUID        REFERENCES dsh_carts(id) ON DELETE SET NULL,
    item_id             UUID        REFERENCES dsh_cart_items(id) ON DELETE SET NULL,
    result_version      INTEGER     NOT NULL CHECK (result_version >= 1),
    result_deleted      BOOLEAN     NOT NULL DEFAULT FALSE,
    result_json         JSONB       NOT NULL,
    device_id           TEXT,
    session_id          TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (client_id, idempotency_key)
);

CREATE INDEX idx_dsh_cart_mutation_receipts_cart_created
    ON dsh_cart_mutation_receipts (cart_id, created_at DESC);

-- Preserve existing committed receipts as historical evidence. A client/key
-- pair was not unique in the legacy cart-scoped table, so keep its latest row;
-- historical keys are deliberately not replayable by the new writer.
INSERT INTO dsh_cart_mutation_receipts (
    client_id, idempotency_key, operation, request_fingerprint, correlation_id,
    cart_id, result_version, result_deleted, result_json, device_id, session_id,
    created_at
)
SELECT client_id,
       idempotency_key,
       'historical',
       md5('legacy:' || cart_id::text || ':' || idempotency_key) ||
         md5('legacy-v2:' || cart_id::text || ':' || idempotency_key),
       'legacy-cart-receipt-' || replace(cart_id::text, '-', ''),
       cart_id,
       GREATEST(version, 1),
       FALSE,
       '{}'::jsonb,
       device_id,
       session_id,
       created_at
FROM (
    SELECT c.client_id,
           i.cart_id,
           i.idempotency_key,
           i.version,
           i.device_id,
           i.session_id,
           i.created_at,
           ROW_NUMBER() OVER (
               PARTITION BY c.client_id, i.idempotency_key
               ORDER BY i.created_at DESC, i.cart_id DESC
           ) AS row_number
    FROM dsh_cart_idempotency i
    JOIN dsh_carts c ON c.id = i.cart_id
) legacy
WHERE legacy.row_number = 1
ON CONFLICT (client_id, idempotency_key) DO NOTHING;

DROP TABLE dsh_cart_idempotency;
