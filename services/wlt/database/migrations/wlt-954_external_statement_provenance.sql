-- WLT-954: make statement provenance explicit instead of implying that
BEGIN;

-- This migration records provenance metadata and evidence integrity only;
-- independent provider authenticity is enforced by WLT-957/WLT-958.
ALTER TABLE wlt_external_provider_statements
  ADD COLUMN IF NOT EXISTS provenance_type text NOT NULL DEFAULT 'operator_attested',
  ADD COLUMN IF NOT EXISTS provenance_evidence_sha256 text NOT NULL DEFAULT '';

UPDATE wlt_external_provider_statements
SET provenance_evidence_sha256 = artifact_sha256
WHERE provenance_type = 'operator_attested' AND provenance_evidence_sha256 = '';

ALTER TABLE wlt_external_provider_statements
  DROP CONSTRAINT IF EXISTS wlt_external_provider_statements_provenance_type_chk;
ALTER TABLE wlt_external_provider_statements
  ADD CONSTRAINT wlt_external_provider_statements_provenance_type_chk
  CHECK (provenance_type IN ('operator_attested', 'provider_signed', 'provider_api_verified'));

ALTER TABLE wlt_external_provider_statements
  DROP CONSTRAINT IF EXISTS wlt_external_provider_statements_provenance_evidence_chk;
ALTER TABLE wlt_external_provider_statements
  ADD CONSTRAINT wlt_external_provider_statements_provenance_evidence_chk
  CHECK (
    (provenance_type = 'operator_attested' AND provenance_evidence_sha256 = artifact_sha256)
    OR
    (provenance_type IN ('provider_signed', 'provider_api_verified') AND provenance_evidence_sha256 ~ '^[a-f0-9]{64}$')
  );

COMMENT ON COLUMN wlt_external_provider_statements.provenance_type IS
  'Explicit origin class. operator_attested is human-import authority; provider_signed/provider_api_verified are valid only when an independent trusted verifier receipt is present.';
COMMENT ON COLUMN wlt_external_provider_statements.provenance_evidence_sha256 IS
  'Immutable digest of verifier-controlled signature/API/raw evidence when provenance_type is not operator_attested; the digest alone is not an authenticity claim.';

COMMIT;
