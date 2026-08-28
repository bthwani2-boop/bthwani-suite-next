-- WLT-957: provider provenance must be established by a trusted verifier,
-- never by a caller-provided label and self-consistent bytes alone.
BEGIN;

CREATE TABLE IF NOT EXISTS wlt_external_provider_verification_keys (
  id text PRIMARY KEY DEFAULT ('wepvk_' || gen_random_uuid()::text),
  operator_context_id text NOT NULL,
  provider_key text NOT NULL,
  key_id text NOT NULL,
  algorithm text NOT NULL CHECK (algorithm = 'ed25519'),
  public_key bytea NOT NULL CHECK (octet_length(public_key) = 32),
  verifier_version text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wlt_external_provider_verification_keys_window_chk
    CHECK (valid_until IS NULL OR valid_until > valid_from),
  CONSTRAINT wlt_external_provider_verification_keys_uq
    UNIQUE (operator_context_id, provider_key, key_id)
);

CREATE INDEX IF NOT EXISTS wlt_external_provider_verification_keys_active_idx
  ON wlt_external_provider_verification_keys(operator_context_id, provider_key, key_id)
  WHERE active;

CREATE TABLE IF NOT EXISTS wlt_external_statement_verification_receipts (
  id text PRIMARY KEY DEFAULT ('wepsvr_' || gen_random_uuid()::text),
  operator_context_id text NOT NULL,
  statement_id text NOT NULL REFERENCES wlt_external_provider_statements(id) ON DELETE RESTRICT,
  provider_key text NOT NULL,
  verification_method text NOT NULL CHECK (verification_method IN ('provider_signed', 'provider_api_verified')),
  key_id text NOT NULL,
  verifier_version text NOT NULL,
  artifact_sha256 text NOT NULL,
  evidence_sha256 text NOT NULL,
  verified_at timestamptz NOT NULL DEFAULT now(),
  raw_evidence bytea NOT NULL CHECK (octet_length(raw_evidence) > 0),
  CONSTRAINT wlt_external_statement_verification_receipts_artifact_chk
    CHECK (artifact_sha256 ~ '^[a-f0-9]{64}$'),
  CONSTRAINT wlt_external_statement_verification_receipts_evidence_chk
    CHECK (evidence_sha256 ~ '^[a-f0-9]{64}$'),
  CONSTRAINT wlt_external_statement_verification_receipts_uq
    UNIQUE (operator_context_id, statement_id),
  CONSTRAINT wlt_external_statement_verification_receipts_composite_fk_uq
    UNIQUE (operator_context_id, statement_id, id)
);

COMMENT ON TABLE wlt_external_provider_verification_keys IS
  'Trusted provider public keys provisioned by deployment/security operations; callers cannot create provenance keys through statement import.';
COMMENT ON TABLE wlt_external_statement_verification_receipts IS
  'Immutable proof that a trusted verifier authenticated provider evidence bound to the canonical statement artifact.';

COMMIT;
