-- Local-only governed reference projections for the authenticated WLT runtime smoke.
-- These rows model read-only projections produced by WLT internal processes; they
-- are not production bootstrap data and are scoped to the local operator context.
INSERT INTO wlt_payment_status_refs (
    order_id,
    status,
    operator_context_id
) SELECT 'order-dev-0001', 'captured', 'local-dsh'
WHERE NOT EXISTS (
    SELECT 1
    FROM wlt_payment_status_refs
    WHERE order_id = 'order-dev-0001'
      AND operator_context_id = 'local-dsh'
);

INSERT INTO wlt_wallets (
    operator_context_id,
    actor_id,
    actor_type,
    status,
    currency
) VALUES (
    'local-dsh',
    'partner-dev-0001',
    'partner',
    'active',
    'YER'
)
ON CONFLICT (operator_context_id, actor_type, actor_id) DO UPDATE
SET status = EXCLUDED.status,
    currency = EXCLUDED.currency,
    updated_at = NOW()
WHERE wlt_wallets.status IS DISTINCT FROM EXCLUDED.status
   OR wlt_wallets.currency IS DISTINCT FROM EXCLUDED.currency;
