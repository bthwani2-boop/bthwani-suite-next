-- Enforce evidence-backed provider activation and governed operational transitions.
-- This migration is additive and keeps WLT as the monetary source of truth.

CREATE TABLE IF NOT EXISTS workforce_captain_classification_history (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id                     text NOT NULL REFERENCES workforce_people(actor_id) ON DELETE CASCADE,
  from_classification          text NOT NULL CHECK (from_classification IN ('joker','basic')),
  to_classification            text NOT NULL CHECK (to_classification IN ('joker','basic')),
  completed_deliveries         integer NOT NULL CHECK (completed_deliveries >= 0),
  completion_rate_basis_points integer NOT NULL CHECK (completion_rate_basis_points BETWEEN 0 AND 10000),
  severe_incident_free         boolean NOT NULL,
  evidence_media_refs          jsonb NOT NULL DEFAULT '[]'::jsonb,
  decision_note                text NOT NULL CHECK (btrim(decision_note) <> ''),
  approved_by_actor_id         text NOT NULL CHECK (btrim(approved_by_actor_id) <> ''),
  created_at                   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workforce_captain_classification_transition_chk CHECK (
    from_classification <> to_classification
  )
);

CREATE INDEX IF NOT EXISTS workforce_captain_classification_history_actor_idx
  ON workforce_captain_classification_history(actor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS workforce_provider_incident_transitions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id           uuid NOT NULL REFERENCES workforce_provider_incidents(id) ON DELETE CASCADE,
  from_status           text NOT NULL,
  to_status             text NOT NULL,
  resolution_note       text NOT NULL DEFAULT '',
  wlt_ledger_reference  text NOT NULL DEFAULT '',
  changed_by_actor_id   text NOT NULL CHECK (btrim(changed_by_actor_id) <> ''),
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workforce_provider_incident_transition_changed_chk CHECK (from_status <> to_status)
);

CREATE INDEX IF NOT EXISTS workforce_provider_incident_transitions_incident_idx
  ON workforce_provider_incident_transitions(incident_id, created_at ASC);

-- Any legacy projection claiming a completed evidence state without its
-- reference is moved back to review instead of being grandfathered as ready.
UPDATE workforce_captain_activation_core
SET financial_guarantee_status = 'pending_review', updated_at = now()
WHERE financial_guarantee_status = 'funded'
  AND (financial_guarantee_minor_units <= 0 OR btrim(financial_guarantee_reference) = '');

UPDATE workforce_captain_activation_core
SET delivery_bag_custody_status = 'not_issued', updated_at = now()
WHERE delivery_bag_custody_status = 'issued'
  AND btrim(delivery_bag_custody_reference) = '';

UPDATE workforce_captain_activation_core
SET mandatory_purchases_status = 'paid', updated_at = now()
WHERE mandatory_purchases_status = 'paid_and_delivered'
  AND btrim(mandatory_purchases_reference) = '';

CREATE OR REPLACE FUNCTION workforce_validate_captain_activation_evidence()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.financial_guarantee_status = 'funded' AND (
    NEW.financial_guarantee_minor_units <= 0 OR btrim(NEW.financial_guarantee_reference) = ''
  ) THEN
    RAISE EXCEPTION 'funded financial guarantee requires a positive WLT-backed amount and reference';
  END IF;

  IF NEW.delivery_bag_custody_status = 'issued' AND btrim(NEW.delivery_bag_custody_reference) = '' THEN
    RAISE EXCEPTION 'issued delivery bag custody requires a custody reference';
  END IF;

  IF NEW.mandatory_purchases_status = 'paid_and_delivered' AND btrim(NEW.mandatory_purchases_reference) = '' THEN
    RAISE EXCEPTION 'paid and delivered mandatory purchases require an invoice or delivery reference';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.classification <> NEW.classification AND NOT EXISTS (
    SELECT 1
    FROM workforce_captain_classification_history h
    WHERE h.actor_id = NEW.actor_id
      AND h.from_classification = OLD.classification
      AND h.to_classification = NEW.classification
      AND h.created_at >= transaction_timestamp()
  ) THEN
    RAISE EXCEPTION 'captain classification change requires a current evidence-backed decision';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workforce_validate_captain_activation_evidence ON workforce_captain_activation_core;
CREATE TRIGGER trg_workforce_validate_captain_activation_evidence
BEFORE INSERT OR UPDATE ON workforce_captain_activation_core
FOR EACH ROW EXECUTE FUNCTION workforce_validate_captain_activation_evidence();

CREATE OR REPLACE FUNCTION workforce_validate_provider_incident_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  transition_allowed boolean := true;
BEGIN
  IF OLD.status <> NEW.status THEN
    transition_allowed := CASE OLD.status
      WHEN 'reported' THEN NEW.status IN ('under_review','provider_notified','rejected')
      WHEN 'under_review' THEN NEW.status IN ('provider_notified','appeal_window','approved','rejected')
      WHEN 'provider_notified' THEN NEW.status IN ('appeal_window','approved','rejected','under_review')
      WHEN 'appeal_window' THEN NEW.status IN ('under_review','approved','rejected')
      WHEN 'approved' THEN NEW.status IN ('under_review','financial_action_posted','closed','reversed')
      WHEN 'financial_action_posted' THEN NEW.status IN ('closed','reversed')
      WHEN 'rejected' THEN NEW.status = 'closed'
      WHEN 'reversed' THEN NEW.status = 'closed'
      ELSE false
    END;

    IF NOT transition_allowed THEN
      RAISE EXCEPTION 'invalid provider incident transition: % -> %', OLD.status, NEW.status;
    END IF;
  END IF;

  IF NEW.status = 'approved' AND NEW.proposed_penalty_minor_units > 0 AND (
    btrim(NEW.policy_id) = '' OR jsonb_array_length(NEW.evidence_media_refs) = 0
  ) THEN
    RAISE EXCEPTION 'approved financial penalty requires policy and evidence';
  END IF;

  IF NEW.status = 'financial_action_posted' AND (
    NEW.proposed_penalty_minor_units <= 0 OR btrim(NEW.wlt_ledger_reference) = ''
  ) THEN
    RAISE EXCEPTION 'posted financial action requires a positive penalty and WLT ledger reference';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workforce_validate_provider_incident_transition ON workforce_provider_incidents;
CREATE TRIGGER trg_workforce_validate_provider_incident_transition
BEFORE UPDATE OF status, proposed_penalty_minor_units, policy_id, evidence_media_refs, wlt_ledger_reference
ON workforce_provider_incidents
FOR EACH ROW EXECUTE FUNCTION workforce_validate_provider_incident_transition();

COMMENT ON TABLE workforce_captain_classification_history IS
  'Evidence-backed captain classification decisions. New captains start joker and may become basic only through a governed promotion.';
COMMENT ON TABLE workforce_provider_incident_transitions IS
  'Append-only operational history for provider incident decisions; WLT references are recorded only after monetary posting.';
