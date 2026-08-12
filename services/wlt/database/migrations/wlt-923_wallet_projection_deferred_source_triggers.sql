-- WLT-923: defer wallet workflow projection refresh until transaction close.
--
-- WLT-922 made workflow wallet buckets materialized from commission, payout and
-- COD reservation rows. These refreshes must run after all ledger postings in
-- the same transaction are visible to deferred wallet projection guards.

BEGIN;

CREATE OR REPLACE FUNCTION wlt_refresh_wallet_from_commission()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM wlt_refresh_wallet_projection(
      OLD.operator_context_id, OLD.beneficiary_actor_type,
      OLD.beneficiary_actor_id, OLD.currency
    );
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM wlt_refresh_wallet_projection(
      NEW.operator_context_id, NEW.beneficiary_actor_type,
      NEW.beneficiary_actor_id, NEW.currency
    );
    RETURN NEW;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS wlt_commission_wallet_projection_trg ON wlt_commissions;
CREATE CONSTRAINT TRIGGER wlt_commission_wallet_projection_trg
AFTER INSERT OR UPDATE OR DELETE
ON wlt_commissions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION wlt_refresh_wallet_from_commission();

CREATE OR REPLACE FUNCTION wlt_refresh_wallet_from_payout()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM wlt_refresh_wallet_projection(
      OLD.operator_context_id, OLD.beneficiary_actor_type,
      OLD.beneficiary_actor_id, OLD.currency
    );
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM wlt_refresh_wallet_projection(
      NEW.operator_context_id, NEW.beneficiary_actor_type,
      NEW.beneficiary_actor_id, NEW.currency
    );
    RETURN NEW;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS wlt_payout_wallet_projection_trg ON wlt_payout_requests;
CREATE CONSTRAINT TRIGGER wlt_payout_wallet_projection_trg
AFTER INSERT OR UPDATE OR DELETE
ON wlt_payout_requests
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION wlt_refresh_wallet_from_payout();

CREATE OR REPLACE FUNCTION wlt_refresh_wallet_from_cod_reservation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM wlt_refresh_wallet_projection(
      OLD.operator_context_id, 'captain', OLD.captain_id, OLD.currency
    );
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM wlt_refresh_wallet_projection(
      NEW.operator_context_id, 'captain', NEW.captain_id, NEW.currency
    );
    RETURN NEW;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS wlt_cod_wallet_projection_trg ON wlt_cod_reservations;
CREATE CONSTRAINT TRIGGER wlt_cod_wallet_projection_trg
AFTER INSERT OR UPDATE OR DELETE
ON wlt_cod_reservations
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION wlt_refresh_wallet_from_cod_reservation();

COMMENT ON FUNCTION wlt_refresh_wallet_projection(text, text, text, text) IS
  'Sole materialization path for workflow wallet buckets; source truth is domain rows plus canonical ledger projection, refreshed by deferred source triggers.';

COMMIT;
