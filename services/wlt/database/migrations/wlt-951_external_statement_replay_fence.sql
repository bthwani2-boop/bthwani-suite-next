-- WLT-951: bind external-statement replay identity to account/reference/date.
-- artifact_sha256 remains the complete payload identity; this uniqueness fence
-- prevents the same provider statement reference from being silently reused for
-- a different payload during a replay or concurrent import.

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS wlt_external_provider_statements_replay_identity_uq
  ON wlt_external_provider_statements(operator_context_id, external_provider_account_id, statement_reference, business_date);

CREATE UNIQUE INDEX IF NOT EXISTS wlt_external_provider_statement_lines_reference_uq
  ON wlt_external_provider_statement_lines(operator_context_id, statement_id, external_transfer_reference);

COMMIT;
