-- Local-only governed WLT dispatch policy for the canonical captain bootstrap.
-- The local collateral top-up is the complete development balance, so no extra
-- dispatch/COD balance is required; production thresholds remain WLT-owned policy.
INSERT INTO wlt_dispatch_financial_eligibility_policies (
    operator_context_id,
    enabled,
    require_active_wallet,
    minimum_dispatch_balance_minor_units,
    minimum_cod_balance_minor_units,
    currency,
    decision_ttl_seconds,
    policy_version,
    updated_by
) VALUES (
    'local-dsh',
    TRUE,
    TRUE,
    0,
    0,
    'YER',
    120,
    'local-dispatch-financial-v1',
    'seed:wlt-905-local-dispatch-financial-policy'
)
ON CONFLICT (operator_context_id) DO UPDATE
SET enabled = EXCLUDED.enabled,
    require_active_wallet = EXCLUDED.require_active_wallet,
    minimum_dispatch_balance_minor_units = EXCLUDED.minimum_dispatch_balance_minor_units,
    minimum_cod_balance_minor_units = EXCLUDED.minimum_cod_balance_minor_units,
    currency = EXCLUDED.currency,
    decision_ttl_seconds = EXCLUDED.decision_ttl_seconds,
    policy_version = EXCLUDED.policy_version,
    updated_by = EXCLUDED.updated_by,
    updated_at = NOW()
WHERE wlt_dispatch_financial_eligibility_policies.enabled IS DISTINCT FROM EXCLUDED.enabled
   OR wlt_dispatch_financial_eligibility_policies.require_active_wallet IS DISTINCT FROM EXCLUDED.require_active_wallet
   OR wlt_dispatch_financial_eligibility_policies.minimum_dispatch_balance_minor_units IS DISTINCT FROM EXCLUDED.minimum_dispatch_balance_minor_units
   OR wlt_dispatch_financial_eligibility_policies.minimum_cod_balance_minor_units IS DISTINCT FROM EXCLUDED.minimum_cod_balance_minor_units
   OR wlt_dispatch_financial_eligibility_policies.currency IS DISTINCT FROM EXCLUDED.currency
   OR wlt_dispatch_financial_eligibility_policies.decision_ttl_seconds IS DISTINCT FROM EXCLUDED.decision_ttl_seconds
   OR wlt_dispatch_financial_eligibility_policies.policy_version IS DISTINCT FROM EXCLUDED.policy_version
   OR wlt_dispatch_financial_eligibility_policies.updated_by IS DISTINCT FROM EXCLUDED.updated_by;
