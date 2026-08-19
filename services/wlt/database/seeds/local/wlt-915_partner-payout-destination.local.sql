-- Local-only canonical Partner payout-destination fixture.
--
-- The Partner onboarding smoke exercises a newly created DSH Partner owned by
-- the local partner actor. Submission correctly requires an active WLT-owned
-- destination, so the local actor fixture must provision the same canonical
-- readback state that the Field finance smoke already has.

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
  'wpd_local_partner_runtime_001',
  'partner-local-001',
  'BThwani Local Partner',
  true,
  'local-runtime-seed',
  'partner-local-001',
  'partner',
  'local-dsh',
  'official_wallet',
  pgp_sym_encrypt('LOCAL-PARTNER-DESTINATION-0001', 'dev-only-payout-destination-encryption-key'),
  '************0001',
  'unverified',
  'bthwani_local_wallet',
  1,
  encode(digest(
    concat_ws(
      chr(31),
      'local-dsh',
      'partner',
      'partner-local-001',
      'bthwani_local_wallet',
      'LOCAL-PARTNER-DESTINATION-0001',
      'BThwani Local Partner'
    ),
    'sha256'
  ), 'hex')
WHERE NOT EXISTS (
  SELECT 1
  FROM wlt_payout_destinations
  WHERE operator_context_id = 'local-dsh'
    AND owner_actor_type = 'partner'
    AND owner_actor_id = 'partner-local-001'
    AND active = true
)
ON CONFLICT (id) DO NOTHING;
