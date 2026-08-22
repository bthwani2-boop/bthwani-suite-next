-- WLT-933: make provider-penalty money a WLT policy decision.
-- Workforce may select a policy identity, but it must never author the
-- monetary amount or currency of a penalty.

CREATE TABLE IF NOT EXISTS wlt_provider_penalty_policies (
  operator_context_id text NOT NULL CHECK (btrim(operator_context_id) <> ''),
  policy_id           text NOT NULL CHECK (btrim(policy_id) <> ''),
  policy_version      text NOT NULL CHECK (btrim(policy_version) <> ''),
  provider_actor_type text NOT NULL CHECK (provider_actor_type IN ('captain','field','any')),
  amount_minor_units  bigint NOT NULL CHECK (amount_minor_units > 0),
  currency            text NOT NULL CHECK (char_length(currency) = 3 AND currency = upper(currency)),
  enabled             boolean NOT NULL DEFAULT true,
  change_reason       text NOT NULL DEFAULT 'legacy-migrated' CHECK (char_length(btrim(change_reason)) >= 3),
  updated_by_actor_id text NOT NULL DEFAULT 'system',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (operator_context_id, policy_id)
);

ALTER TABLE wlt_provider_penalty_policies
  ADD COLUMN IF NOT EXISTS change_reason text NOT NULL DEFAULT 'legacy-migrated',
  ADD COLUMN IF NOT EXISTS updated_by_actor_id text NOT NULL DEFAULT 'system';

UPDATE wlt_provider_penalty_policies
SET change_reason = COALESCE(NULLIF(btrim(change_reason), ''), 'legacy-migrated'),
    updated_by_actor_id = COALESCE(NULLIF(btrim(updated_by_actor_id), ''), 'system');

COMMENT ON TABLE wlt_provider_penalty_policies IS
  'WLT-owned versioned penalty catalog. Workforce selects policy_id; WLT derives amount and currency.';

ALTER TABLE wlt_provider_penalties
  ADD COLUMN IF NOT EXISTS policy_id text,
  ADD COLUMN IF NOT EXISTS policy_version text;

UPDATE wlt_provider_penalties
SET policy_id = COALESCE(NULLIF(btrim(policy_id), ''), 'legacy:unversioned'),
    policy_version = COALESCE(NULLIF(btrim(policy_version), ''), 'legacy:unversioned')
WHERE policy_id IS NULL OR btrim(policy_id) = ''
   OR policy_version IS NULL OR btrim(policy_version) = '';

ALTER TABLE wlt_provider_penalties
  ALTER COLUMN policy_id SET NOT NULL,
  ALTER COLUMN policy_version SET NOT NULL;

CREATE INDEX IF NOT EXISTS wlt_provider_penalties_policy_idx
  ON wlt_provider_penalties(operator_context_id, policy_id, created_at DESC);
