-- Local-only WLT policy for the end-to-end DSH delivery proof matrix.
-- Production commission rates remain finance-owned and must be configured through
-- the governed policy endpoint; this fixture makes the local integration contract
-- executable without introducing a runtime fallback or caller-supplied amount.
UPDATE wlt_commission_policy_versions
SET status = 'inactive'
WHERE operator_context_id = 'local-dsh'
  AND commission_type = 'delivery_fee'
  AND source_type = 'order'
  AND beneficiary_actor_type = 'captain'
  AND policy_id <> 'local-captain-delivery-fee';

INSERT INTO wlt_commission_policy_versions (
    operator_context_id,
    policy_id,
    version,
    commission_type,
    source_type,
    beneficiary_actor_type,
    calculation_type,
    fixed_amount_minor_units,
    basis_points,
    minimum_amount_minor_units,
    maximum_amount_minor_units,
    currency,
    status,
    change_reason,
    updated_by_actor_id
) VALUES (
    'local-dsh',
    'local-captain-delivery-fee',
    1,
    'delivery_fee',
    'order',
    'captain',
    'basis_points',
    0,
    10000,
    0,
    NULL,
    'YER',
    'active',
    'local end-to-end delivery completion proof',
    'seed:wlt-937-local-captain-delivery-policy'
)
ON CONFLICT (operator_context_id, policy_id, version) DO UPDATE
SET commission_type = EXCLUDED.commission_type,
    source_type = EXCLUDED.source_type,
    beneficiary_actor_type = EXCLUDED.beneficiary_actor_type,
    calculation_type = EXCLUDED.calculation_type,
    fixed_amount_minor_units = EXCLUDED.fixed_amount_minor_units,
    basis_points = EXCLUDED.basis_points,
    minimum_amount_minor_units = EXCLUDED.minimum_amount_minor_units,
    maximum_amount_minor_units = EXCLUDED.maximum_amount_minor_units,
    currency = EXCLUDED.currency,
    status = EXCLUDED.status,
    change_reason = EXCLUDED.change_reason,
    updated_by_actor_id = EXCLUDED.updated_by_actor_id;
