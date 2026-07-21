-- Local-only governed delivery-pricing bootstrap.
--
-- DSH migrations run before local store seeds. Therefore dsh-065 cannot create
-- policies for stores that do not exist until the seed phase. This seed closes
-- that ordering gap without weakening checkout's fail-closed pricing rule.

WITH enabled_policies AS (
  SELECT
    s.id AS store_id,
    modes.fulfillment_mode,
    CASE
      WHEN modes.fulfillment_mode = 'pickup' THEN 0::bigint
      WHEN s.is_free_delivery THEN 0::bigint
      ELSE 95000::bigint
    END AS fee_minor_units
  FROM dsh_stores s
  CROSS JOIN LATERAL (
    VALUES
      ('bthwani_delivery'::text, 'express'::text),
      ('partner_delivery'::text, 'delivery'::text),
      ('pickup'::text, 'pickup'::text)
  ) AS modes(fulfillment_mode, delivery_mode)
  WHERE modes.delivery_mode = ANY(s.delivery_modes)
)
INSERT INTO dsh_store_delivery_pricing (
  store_id,
  fulfillment_mode,
  fee_minor_units,
  currency,
  status,
  pricing_source,
  created_by_actor_id,
  approved_by_actor_id,
  approved_at
)
SELECT
  store_id,
  fulfillment_mode,
  fee_minor_units,
  'YER',
  'active',
  'platform_default',
  'system:local-seed',
  'operator-local-001',
  NOW()
FROM enabled_policies
ON CONFLICT (store_id, fulfillment_mode) DO UPDATE SET
  fee_minor_units = EXCLUDED.fee_minor_units,
  currency = EXCLUDED.currency,
  status = 'active',
  pricing_source = EXCLUDED.pricing_source,
  approved_by_actor_id = EXCLUDED.approved_by_actor_id,
  approved_at = COALESCE(dsh_store_delivery_pricing.approved_at, EXCLUDED.approved_at),
  version = CASE
    WHEN dsh_store_delivery_pricing.fee_minor_units IS DISTINCT FROM EXCLUDED.fee_minor_units
      OR dsh_store_delivery_pricing.currency IS DISTINCT FROM EXCLUDED.currency
      OR dsh_store_delivery_pricing.status IS DISTINCT FROM 'active'
      OR dsh_store_delivery_pricing.pricing_source IS DISTINCT FROM EXCLUDED.pricing_source
    THEN dsh_store_delivery_pricing.version + 1
    ELSE dsh_store_delivery_pricing.version
  END,
  updated_at = NOW();

INSERT INTO dsh_store_delivery_pricing_audit (
  store_id,
  fulfillment_mode,
  actor_id,
  actor_surface,
  action,
  from_fee_minor_units,
  to_fee_minor_units,
  from_status,
  to_status,
  reason,
  correlation_id
)
SELECT
  p.store_id,
  p.fulfillment_mode,
  'system:local-seed',
  'system',
  'create',
  NULL,
  p.fee_minor_units,
  NULL,
  p.status,
  'local runtime bootstrap after store seed',
  'seed:dsh-065:' || p.store_id || ':' || p.fulfillment_mode
FROM dsh_store_delivery_pricing p
WHERE p.created_by_actor_id = 'system:local-seed'
  AND NOT EXISTS (
    SELECT 1
    FROM dsh_store_delivery_pricing_audit a
    WHERE a.correlation_id = 'seed:dsh-065:' || p.store_id || ':' || p.fulfillment_mode
  );
