-- Local-only governed provider registry for the canonical WLT payout-destination
-- runtime smoke. Production provider onboarding remains a finance-control-plane
-- operation; this fixture only declares the local provider identity required by
-- that same boundary.
INSERT INTO wlt_official_wallet_providers (
    operator_context_id,
    provider_key,
    display_name,
    active
) VALUES (
    'local-dsh',
    'bthwani_local_wallet',
    'BThwani Local Official Wallet',
    TRUE
)
ON CONFLICT (operator_context_id, provider_key) DO UPDATE
SET display_name = EXCLUDED.display_name,
    active = EXCLUDED.active,
    updated_at = NOW()
WHERE wlt_official_wallet_providers.display_name IS DISTINCT FROM EXCLUDED.display_name
   OR wlt_official_wallet_providers.active IS DISTINCT FROM EXCLUDED.active;
