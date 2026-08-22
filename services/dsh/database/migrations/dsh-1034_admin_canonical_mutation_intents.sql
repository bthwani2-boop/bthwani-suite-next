-- DSH-1034: canonical administration mutation intents.
--
-- DSH owns the maker/checker ledger and durable retry intent only. Identity
-- owns role definitions and actor-role assignments. The legacy DSH role UUID
-- registry is removed after dsh-1033 has copied historical names.

BEGIN;

ALTER TABLE dsh_admin_approval_requests
  DROP CONSTRAINT IF EXISTS dsh_admin_approval_requests_role_id_fkey;
ALTER TABLE dsh_admin_approval_requests
  DROP COLUMN IF EXISTS role_id;

ALTER TABLE dsh_admin_rollback_requests
  DROP CONSTRAINT IF EXISTS dsh_admin_rollback_requests_role_id_fkey;
ALTER TABLE dsh_admin_rollback_requests
  DROP COLUMN IF EXISTS role_id;

DROP TABLE IF EXISTS dsh_admin_roles CASCADE;

ALTER TABLE dsh_admin_role_definition_requests
  ADD COLUMN IF NOT EXISTS expected_role_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dsh_admin_role_definition_requests
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE dsh_admin_role_definition_requests
  DROP CONSTRAINT IF EXISTS dsh_admin_role_definition_expected_version_check;
ALTER TABLE dsh_admin_role_definition_requests
  ADD CONSTRAINT dsh_admin_role_definition_expected_version_check
  CHECK (expected_role_version >= 0);

CREATE TABLE IF NOT EXISTS dsh_admin_canonical_mutation_intents (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type    TEXT NOT NULL,
  request_id        UUID NOT NULL,
  payload           JSONB NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','failed','applied')),
  attempts          INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error        TEXT,
  next_attempt_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (operation_type, request_id),
  CHECK (jsonb_typeof(payload) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_dsh_admin_mutation_intents_retry
  ON dsh_admin_canonical_mutation_intents (next_attempt_at, created_at)
  WHERE status <> 'applied';

COMMIT;
