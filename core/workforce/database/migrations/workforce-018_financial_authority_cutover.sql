-- Workforce-018: remove writable monetary projections from Workforce.
-- WLT owns captain financial eligibility and penalty money. Workforce retains
-- only the operational incident, selected policy identity, and WLT reference.

DROP TRIGGER IF EXISTS trg_workforce_validate_provider_incident_transition
  ON workforce_provider_incidents;

CREATE OR REPLACE FUNCTION workforce_validate_captain_activation_evidence()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.delivery_bag_custody_status = 'issued' AND btrim(NEW.delivery_bag_custody_reference) = '' THEN
    RAISE EXCEPTION 'issued delivery bag custody requires a custody reference';
  END IF;

  IF NEW.mandatory_purchases_status = 'paid_and_delivered' AND btrim(NEW.mandatory_purchases_reference) = '' THEN
    RAISE EXCEPTION 'paid and delivered mandatory purchases require an invoice or delivery reference';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.classification <> NEW.classification AND NOT EXISTS (
    SELECT 1 FROM workforce_captain_classification_history h
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

ALTER TABLE workforce_captain_activation_core
  DROP COLUMN IF EXISTS financial_guarantee_minor_units,
  DROP COLUMN IF EXISTS financial_guarantee_currency,
  DROP COLUMN IF EXISTS financial_guarantee_status,
  DROP COLUMN IF EXISTS financial_guarantee_reference;

ALTER TABLE workforce_provider_incidents
  DROP COLUMN IF EXISTS proposed_penalty_minor_units,
  DROP COLUMN IF EXISTS currency;

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

  IF NEW.status = 'approved' AND btrim(NEW.policy_id) <> '' AND jsonb_array_length(NEW.evidence_media_refs) = 0 THEN
    RAISE EXCEPTION 'approved financial penalty requires evidence';
  END IF;
  IF NEW.status = 'financial_action_posted' AND btrim(NEW.wlt_ledger_reference) = '' THEN
    RAISE EXCEPTION 'posted financial action requires a WLT financial reference';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_workforce_validate_provider_incident_transition
BEFORE UPDATE OF status, policy_id, evidence_media_refs, wlt_ledger_reference
ON workforce_provider_incidents
FOR EACH ROW EXECUTE FUNCTION workforce_validate_provider_incident_transition();
