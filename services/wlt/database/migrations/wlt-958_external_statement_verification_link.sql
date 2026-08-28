-- WLT-958: bind imported statement provenance to an immutable verification receipt.
BEGIN;

ALTER TABLE wlt_external_provider_statements
  ADD COLUMN IF NOT EXISTS provenance_key_id text,
  ADD COLUMN IF NOT EXISTS provenance_verifier_version text,
  ADD COLUMN IF NOT EXISTS provenance_verification_receipt_id text;

-- Any historical provider label without a receipt is not independently
-- authenticated. Preserve the financial artifact but explicitly downgrade its
-- provenance rather than fabricating a receipt.
UPDATE wlt_external_provider_statements
SET provenance_type = 'operator_attested',
    provenance_evidence_sha256 = artifact_sha256,
    provenance_key_id = NULL,
    provenance_verifier_version = NULL,
    provenance_verification_receipt_id = NULL
WHERE provenance_type IN ('provider_signed', 'provider_api_verified')
  AND (provenance_key_id IS NULL OR provenance_key_id = '' OR provenance_verifier_version IS NULL OR provenance_verifier_version = '' OR provenance_verification_receipt_id IS NULL OR provenance_verification_receipt_id = '');

ALTER TABLE wlt_external_provider_statements
  DROP CONSTRAINT IF EXISTS wlt_external_provider_statements_provider_provenance_link_chk;
ALTER TABLE wlt_external_provider_statements
  ADD CONSTRAINT wlt_external_provider_statements_provider_provenance_link_chk
  CHECK (
    provenance_type = 'operator_attested'
    OR (
      provenance_type IN ('provider_signed', 'provider_api_verified')
      AND provenance_key_id IS NOT NULL
      AND provenance_key_id <> ''
      AND provenance_verifier_version IS NOT NULL
      AND provenance_verifier_version <> ''
      AND provenance_verification_receipt_id IS NOT NULL
      AND provenance_verification_receipt_id <> ''
    )
  );

ALTER TABLE wlt_external_provider_statements
  ADD CONSTRAINT wlt_external_provider_statements_verification_receipt_fk
  FOREIGN KEY (operator_context_id, id, provenance_verification_receipt_id)
  REFERENCES wlt_external_statement_verification_receipts(operator_context_id, statement_id, id)
  DEFERRABLE INITIALLY DEFERRED;

COMMENT ON COLUMN wlt_external_provider_statements.provenance_key_id IS
  'Trusted provider verification key identifier; absent for operator-attested imports.';
COMMENT ON COLUMN wlt_external_provider_statements.provenance_verification_receipt_id IS
  'Immutable receipt proving provider provenance; required for provider-signed and provider-API-verified imports.';

COMMIT;
