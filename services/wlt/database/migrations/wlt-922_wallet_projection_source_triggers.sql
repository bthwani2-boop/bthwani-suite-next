-- WLT-922: make workflow wallet buckets derived projections.
--
-- Canonical ledger accounts own economic balance. Domain rows own workflow
-- state (commission lifecycle, payout lifecycle and COD reservations). The
-- wallet row is a read projection of both and is never a second write owner.

BEGIN;

CREATE OR REPLACE FUNCTION wlt_refresh_wallet_projection(
  p_operator_context_id text,
  p_actor_type text,
  p_actor_id text,
  p_currency text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_pending bigint := 0;
  v_earned bigint := 0;
  v_settled bigint := 0;
  v_held bigint := 0;
  v_paid bigint := 0;
  v_cod_reserved bigint := 0;
BEGIN
  IF btrim(COALESCE(p_operator_context_id, '')) = ''
     OR btrim(COALESCE(p_actor_type, '')) = ''
     OR btrim(COALESCE(p_actor_id, '')) = ''
     OR btrim(COALESCE(p_currency, '')) = '' THEN
    RAISE EXCEPTION 'wallet projection identity is incomplete';
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN c.status IN (
      'pending', 'confirmed', 'earned_pending_review',
      'approved_pending_posting', 'posted_pending_settlement', 'held'
    ) THEN c.amount_minor_units ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN c.status <> 'rejected' THEN c.amount_minor_units ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN c.status = 'settled' THEN c.amount_minor_units ELSE 0 END), 0)
  INTO v_pending, v_earned, v_settled
  FROM wlt_commissions c
  WHERE c.operator_context_id = p_operator_context_id
    AND c.beneficiary_actor_type = p_actor_type
    AND c.beneficiary_actor_id = p_actor_id
    AND c.currency = p_currency;

  SELECT
    COALESCE(SUM(CASE WHEN p.status IN (
      'pending', 'approved', 'processing', 'provider_pending',
      'provider_result_unknown', 'verified'
    ) THEN p.amount_minor_units ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount_minor_units ELSE 0 END), 0)
  INTO v_held, v_paid
  FROM wlt_payout_requests p
  WHERE p.operator_context_id = p_operator_context_id
    AND p.beneficiary_actor_type = p_actor_type
    AND p.beneficiary_actor_id = p_actor_id
    AND p.currency = p_currency;

  SELECT COALESCE(SUM(r.amount_minor_units), 0)
  INTO v_cod_reserved
  FROM wlt_cod_reservations r
  WHERE r.operator_context_id = p_operator_context_id
    AND r.captain_id = p_actor_id
    AND p_actor_type = 'captain'
    AND r.currency = p_currency
    AND r.status = 'reserved';

  UPDATE wlt_wallets
  SET pending_balance_minor_units = v_pending,
      earned_total_minor_units = v_earned,
      settled_total_minor_units = v_settled,
      held_balance_minor_units = v_held,
      paid_total_minor_units = v_paid,
      cod_reserved_balance_minor_units = v_cod_reserved,
      updated_at = now()
  WHERE operator_context_id = p_operator_context_id
    AND actor_type = p_actor_type
    AND actor_id = p_actor_id
    AND currency = p_currency;
END;
$$;

CREATE OR REPLACE FUNCTION wlt_refresh_wallet_from_commission()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM wlt_refresh_wallet_projection(
    NEW.operator_context_id, NEW.beneficiary_actor_type,
    NEW.beneficiary_actor_id, NEW.currency
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wlt_commission_wallet_projection_trg ON wlt_commissions;
CREATE TRIGGER wlt_commission_wallet_projection_trg
AFTER INSERT OR UPDATE OF status, amount_minor_units, beneficiary_actor_id,
  beneficiary_actor_type, currency, operator_context_id
ON wlt_commissions
FOR EACH ROW
EXECUTE FUNCTION wlt_refresh_wallet_from_commission();

CREATE OR REPLACE FUNCTION wlt_refresh_wallet_from_payout()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM wlt_refresh_wallet_projection(
    NEW.operator_context_id, NEW.beneficiary_actor_type,
    NEW.beneficiary_actor_id, NEW.currency
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wlt_payout_wallet_projection_trg ON wlt_payout_requests;
CREATE TRIGGER wlt_payout_wallet_projection_trg
AFTER INSERT OR UPDATE OF status, amount_minor_units, beneficiary_actor_id,
  beneficiary_actor_type, currency, operator_context_id
ON wlt_payout_requests
FOR EACH ROW
EXECUTE FUNCTION wlt_refresh_wallet_from_payout();

CREATE OR REPLACE FUNCTION wlt_refresh_wallet_from_cod_reservation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM wlt_refresh_wallet_projection(
    NEW.operator_context_id, 'captain', NEW.captain_id, NEW.currency
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wlt_cod_wallet_projection_trg ON wlt_cod_reservations;
CREATE TRIGGER wlt_cod_wallet_projection_trg
AFTER INSERT OR UPDATE OF status, amount_minor_units, captain_id,
  currency, operator_context_id
ON wlt_cod_reservations
FOR EACH ROW
EXECUTE FUNCTION wlt_refresh_wallet_from_cod_reservation();

DO $$
DECLARE
  wallet_row record;
BEGIN
  FOR wallet_row IN
    SELECT operator_context_id, actor_type, actor_id, currency
    FROM wlt_wallets
  LOOP
    PERFORM wlt_refresh_wallet_projection(
      wallet_row.operator_context_id, wallet_row.actor_type,
      wallet_row.actor_id, wallet_row.currency
    );
  END LOOP;
END;
$$;

COMMENT ON FUNCTION wlt_refresh_wallet_projection(text, text, text, text) IS
  'Sole materialization path for workflow wallet buckets; source truth is domain rows plus canonical ledger projection.';

COMMIT;
