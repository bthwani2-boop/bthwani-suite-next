-- Local-only canonical Field payout-destination readback fixture.
--
-- The Field application is read-only for payout master data. This fixture is
-- intentionally inserted by the governed local seed authority so the runtime
-- can prove the complete Field actor -> DSH BFF -> WLT readback path without
-- granting the local operator finance.manage or creating a browser write path.
-- The destination remains unverified; payout execution must stay fail-closed
-- until a separate finance approval journey verifies it.

INSERT INTO wlt_payout_destinations (
  id,
  partner_id,
  beneficiary_name,
  active,
  created_by_actor_id,
  owner_actor_id,
  owner_actor_type,
  operator_context_id,
  destination_method,
  destination_reference_encrypted,
  masked_destination_reference,
  destination_verification_status,
  official_wallet_provider_key,
  destination_version,
  material_identity_hash
)
SELECT
  'wpd_local_field_runtime_001',
  '@@FIELD_ACTOR_ID@@',
  'BThwani Local Field Agent',
  true,
  'local-runtime-seed',
  '@@FIELD_ACTOR_ID@@',
  'field',
  'local-dsh',
  'official_wallet',
  pgp_sym_encrypt('LOCAL-FIELD-DESTINATION-0001', 'dev-only-payout-destination-encryption-key'),
  '************0001',
  'unverified',
  'bthwani_local_wallet',
  1,
  encode(digest(
    concat_ws(
      chr(31),
      'local-dsh',
      'field',
      '@@FIELD_ACTOR_ID@@',
      'bthwani_local_wallet',
      'LOCAL-FIELD-DESTINATION-0001',
      'BThwani Local Field Agent'
    ),
    'sha256'
  ), 'hex')
WHERE NOT EXISTS (
  SELECT 1
  FROM wlt_payout_destinations
  WHERE operator_context_id = 'local-dsh'
    AND owner_actor_type = 'field'
    AND owner_actor_id = '@@FIELD_ACTOR_ID@@'
    AND active = true
)
ON CONFLICT (id) DO NOTHING;
