-- Local-only governed WLT policy required before the local captain wallet is materialized.
-- Production policy remains owned by the WLT policy API; this fixture only supplies
-- deterministic development truth for the governed bootstrap flow.
INSERT INTO wlt_captain_collateral_policies (
    operator_context_id,
    policy_id,
    policy_version,
    enabled,
    minimum_collateral_minor_units,
    currency,
    change_reason,
    updated_by_actor_id
) VALUES (
    'local-dsh',
    'local-captain-collateral-v1',
    1,
    TRUE,
    1000,
    'YER',
    'Governed local development captain collateral policy.',
    'seed:wlt-935-local-captain-collateral'
)
ON CONFLICT (operator_context_id) DO UPDATE
SET policy_id = EXCLUDED.policy_id,
    enabled = EXCLUDED.enabled,
    minimum_collateral_minor_units = EXCLUDED.minimum_collateral_minor_units,
    currency = EXCLUDED.currency,
    change_reason = EXCLUDED.change_reason,
    updated_by_actor_id = EXCLUDED.updated_by_actor_id,
    policy_version = wlt_captain_collateral_policies.policy_version + 1,
    updated_at = NOW()
WHERE wlt_captain_collateral_policies.policy_id IS DISTINCT FROM EXCLUDED.policy_id
   OR wlt_captain_collateral_policies.enabled IS DISTINCT FROM EXCLUDED.enabled
   OR wlt_captain_collateral_policies.minimum_collateral_minor_units IS DISTINCT FROM EXCLUDED.minimum_collateral_minor_units
   OR wlt_captain_collateral_policies.currency IS DISTINCT FROM EXCLUDED.currency
   OR wlt_captain_collateral_policies.change_reason IS DISTINCT FROM EXCLUDED.change_reason
   OR wlt_captain_collateral_policies.updated_by_actor_id IS DISTINCT FROM EXCLUDED.updated_by_actor_id;
