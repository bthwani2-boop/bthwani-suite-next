-- Workforce-005: evidence-backed provider activation and governed lifecycle transitions.
--
-- This migration is additive. It does not move monetary truth into Workforce:
-- WLT remains the source of truth and Workforce stores only immutable references
-- needed to prove that the operational gate was reviewed against that truth.
--
-- A prior migration may already have created the two history tables with a
-- stricter evidence projection. The ALTER blocks below deliberately converge
-- both historical shapes instead of relying on CREATE TABLE IF NOT EXISTS to
-- silently skip required columns.

ALTER TABLE workforce_provider_availability_notices
  ADD COLUMN IF NOT EXISTS cancelled_by_actor_id text,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS workforce_captain_classification_history (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id              text NOT NULL REFERENCES workforce_people(actor_id) ON DELETE CASCADE,
  from_classification   text NOT NULL CHECK (from_classification IN ('joker','basic')),
  to_classification     text NOT NULL CHECK (to_classification IN ('joker','basic')),
  evidence              jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason                text NOT NULL CHECK (btrim(reason) <> ''),
  decided_by_actor_id   text NOT NULL CHECK (btrim(decided_by_actor_id) <> ''),
  idempotency_key       text NOT NULL CHECK (btrim(idempotency_key) <> ''),
  created_at            timestamptz NOT NULL DEFAULT now(),
  CHECK (from_classification <> to_classification)
);

ALTER TABLE workforce_captain_classification_history
  ADD COLUMN IF NOT EXISTS evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS reason text NOT NULL DEFAULT 'legacy-migrated',
  ADD COLUMN IF NOT EXISTS decided_by_actor_id text NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS idempotency_key text;

UPDATE workforce_captain_classification_history
SET idempotency_key = 'legacy:' || id::text
WHERE idempotency_key IS NULL OR btrim(idempotency_key) = '';

ALTER TABLE workforce_captain_classification_history
  ALTER COLUMN idempotency_key SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workforce_captain_classification_history_idempotency_key_chk'
  ) THEN
    ALTER TABLE workforce_captain_classification_history
      ADD CONSTRAINT workforce_captain_classification_history_idempotency_key_chk
      CHECK (btrim(idempotency_key) <> '') NOT VALID;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS workforce_captain_classification_history_idempotency_uidx
  ON workforce_captain_classification_history(idempotency_key);
CREATE INDEX IF NOT EXISTS workforce_captain_classification_history_actor_idx
  ON workforce_captain_classification_history(actor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS workforce_provider_incident_transitions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id           uuid NOT NULL REFERENCES workforce_provider_incidents(id) ON DELETE CASCADE,
  actor_id              text NOT NULL REFERENCES workforce_people(actor_id) ON DELETE CASCADE,
  from_status           text NOT NULL,
  to_status             text NOT NULL,
  reason                text NOT NULL DEFAULT '',
  wlt_ledger_reference  text NOT NULL DEFAULT '',
  decided_by_actor_id   text NOT NULL CHECK (btrim(decided_by_actor_id) <> ''),
  incident_version      integer NOT NULL CHECK (incident_version > 0),
  created_at            timestamptz NOT NULL DEFAULT now(),
  CHECK (from_status <> to_status)
);

ALTER TABLE workforce_provider_incident_transitions
  ADD COLUMN IF NOT EXISTS actor_id text,
  ADD COLUMN IF NOT EXISTS reason text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS decided_by_actor_id text NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS incident_version integer NOT NULL DEFAULT 1;

UPDATE workforce_provider_incident_transitions transition
SET actor_id = incident.actor_id,
    reason = CASE
      WHEN btrim(transition.reason) <> '' THEN transition.reason
      WHEN to_jsonb(transition) ? 'resolution_note' THEN COALESCE(to_jsonb(transition)->>'resolution_note','')
      ELSE ''
    END,
    decided_by_actor_id = CASE
      WHEN btrim(transition.decided_by_actor_id) <> '' THEN transition.decided_by_actor_id
      WHEN to_jsonb(transition) ? 'changed_by_actor_id' THEN COALESCE(NULLIF(to_jsonb(transition)->>'changed_by_actor_id',''),'system')
      ELSE 'system'
    END
FROM workforce_provider_incidents incident
WHERE incident.id = transition.incident_id
  AND transition.actor_id IS NULL;

ALTER TABLE workforce_provider_incident_transitions
  ALTER COLUMN actor_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workforce_provider_incident_transitions_actor_fk'
  ) THEN
    ALTER TABLE workforce_provider_incident_transitions
      ADD CONSTRAINT workforce_provider_incident_transitions_actor_fk
      FOREIGN KEY (actor_id) REFERENCES workforce_people(actor_id) ON DELETE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workforce_provider_incident_transitions_version_chk'
  ) THEN
    ALTER TABLE workforce_provider_incident_transitions
      ADD CONSTRAINT workforce_provider_incident_transitions_version_chk
      CHECK (incident_version > 0) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS workforce_provider_incident_transitions_incident_idx
  ON workforce_provider_incident_transitions(incident_id, created_at DESC);
CREATE INDEX IF NOT EXISTS workforce_provider_incident_transitions_actor_idx
  ON workforce_provider_incident_transitions(actor_id, created_at DESC);

-- Existing rows are intentionally not treated as proof. NOT VALID keeps this
-- migration deployable while enforcing the invariant for every future write.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workforce_provider_core_activation_guarantor_verified_chk'
  ) THEN
    ALTER TABLE workforce_provider_operational_core
      ADD CONSTRAINT workforce_provider_core_activation_guarantor_verified_chk
      CHECK (
        onboarding_stage NOT IN ('activation_ready','active')
        OR guarantor_phone_verified_at IS NOT NULL
      ) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workforce_captain_funded_guarantee_reference_chk'
  ) THEN
    ALTER TABLE workforce_captain_activation_core
      ADD CONSTRAINT workforce_captain_funded_guarantee_reference_chk
      CHECK (
        financial_guarantee_status <> 'funded'
        OR (
          financial_guarantee_minor_units > 0
          AND btrim(financial_guarantee_reference) <> ''
        )
      ) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workforce_captain_bag_reference_chk'
  ) THEN
    ALTER TABLE workforce_captain_activation_core
      ADD CONSTRAINT workforce_captain_bag_reference_chk
      CHECK (
        delivery_bag_custody_status <> 'issued'
        OR btrim(delivery_bag_custody_reference) <> ''
      ) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'workforce_captain_purchase_reference_chk'
  ) THEN
    ALTER TABLE workforce_captain_activation_core
      ADD CONSTRAINT workforce_captain_purchase_reference_chk
      CHECK (
        mandatory_purchases_status <> 'paid_and_delivered'
        OR btrim(mandatory_purchases_reference) <> ''
      ) NOT VALID;
  END IF;
END $$;

COMMENT ON TABLE workforce_captain_classification_history IS
  'Immutable evidence and decision history for joker/basic classification changes.';
COMMENT ON TABLE workforce_provider_incident_transitions IS
  'Append-only incident decision trail; financial actions remain valid only when linked to a WLT ledger reference.';
