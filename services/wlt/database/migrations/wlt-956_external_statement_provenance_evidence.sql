-- WLT-956: provider provenance requires immutable evidence bytes, not only a
-- caller-supplied digest string. Operator-attested historical imports remain
-- valid because their original evidence bytes may not be recoverable.
BEGIN;

ALTER TABLE wlt_external_provider_statements
  ADD COLUMN IF NOT EXISTS provenance_evidence_bytes bytea NOT NULL DEFAULT ''::bytea;

-- Historical rows that claimed provider provenance but have no retained raw
-- evidence cannot continue to claim independent verification. Downgrade them
-- explicitly to operator-attested evidence instead of fabricating provenance.
ALTER TABLE wlt_external_provider_statements DISABLE TRIGGER USER;

UPDATE wlt_external_provider_statements
SET provenance_type = 'operator_attested',
    provenance_evidence_sha256 = artifact_sha256
WHERE provenance_type IN ('provider_signed', 'provider_api_verified')
  AND octet_length(provenance_evidence_bytes) = 0;

ALTER TABLE wlt_external_provider_statements ENABLE TRIGGER USER;

ALTER TABLE wlt_external_provider_statements
  DROP CONSTRAINT IF EXISTS wlt_external_provider_statements_provenance_evidence_chk;
ALTER TABLE wlt_external_provider_statements
  ADD CONSTRAINT wlt_external_provider_statements_provenance_evidence_chk
  CHECK (
    (provenance_type = 'operator_attested' AND provenance_evidence_sha256 = artifact_sha256)
    OR
    (provenance_type IN ('provider_signed', 'provider_api_verified')
      AND provenance_evidence_sha256 ~ '^[a-f0-9]{64}$'
      AND octet_length(provenance_evidence_bytes) > 0)
  );

COMMENT ON COLUMN wlt_external_provider_statements.provenance_evidence_bytes IS
  'Immutable raw signature/API/raw-provider evidence. Required for provider_signed and provider_api_verified imports.';

COMMIT;
