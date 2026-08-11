-- Local-only governed official-wallet provider registry.
--
-- WLT payout destinations fail closed unless their provider key is explicitly
-- active for the current OperatorContext. The runtime OperatorContext is
-- `local-dsh`, so its smoke fixtures need one deterministic official-wallet
-- provider rather than falling back to the retired bank/mobile-money model.

INSERT INTO wlt_official_wallet_providers (
  operator_context_id,
  provider_key,
  display_name,
  active
)
VALUES (
  'local-dsh',
  'bthwani_local_wallet',
  'BThwani Local Official Wallet',
  true
)
ON CONFLICT (operator_context_id, provider_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  active = EXCLUDED.active,
  updated_at = now();
