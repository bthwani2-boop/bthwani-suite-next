-- WLT-960: client wallet tender reservation and collection.
--
-- The checkout tender allocation already records how much of an order total a
-- client pays from their internal wallet (wlt_payment_sessions.
-- wallet_amount_minor_units, wlt-932). Before this migration that figure was
-- written but never enforced: no hold was placed on the wallet, so concurrent
-- checkouts could spend the same balance twice, and mixed COD orders were
-- finalized without ever collecting the wallet part — silent revenue loss per
-- order and a violation of the product truth that one server-derived payment
-- allocation must conserve the governed order total.
--
-- This migration completes the canonical projection pattern used for captain
-- COD exposure: the reserved amount is DERIVED from the source table
-- (wlt_payment_sessions) by the shared wallet projection function, refreshes
-- through a deferred source trigger, and reduces available balance through
-- the single available-derivation rule. Collection happens in the COD
-- finalization transaction (Go, cod/finalization.go): the session flip to
-- cod_finalized releases the hold and the journal moves the money.

BEGIN;

ALTER TABLE wlt_wallets
  ADD COLUMN IF NOT EXISTS wallet_reserved_balance_minor_units BIGINT NOT NULL DEFAULT 0;

-- The holding statuses are exactly the unresolved payment-session states:
-- terminal money-received states (captured, cod_finalized) have already moved
-- the wallet part through the ledger, and failed/expired outcomes return it.
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
  v_wallet_reserved bigint := 0;
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

  SELECT COALESCE(SUM(s.wallet_amount_minor_units), 0)
  INTO v_wallet_reserved
  FROM wlt_payment_sessions s
  WHERE s.operator_context_id = p_operator_context_id
    AND s.client_id = p_actor_id
    AND p_actor_type = 'client'
    AND s.currency = p_currency
    AND s.wallet_amount_minor_units IS NOT NULL
    AND s.wallet_amount_minor_units > 0
    AND s.status IN (
      'reference_created', 'pending_provider', 'authorization_pending',
      'authorized', 'capture_pending', 'cod_pending', 'provider_result_unknown'
    );

  UPDATE wlt_wallets
  SET pending_balance_minor_units = v_pending,
      earned_total_minor_units = v_earned,
      settled_total_minor_units = v_settled,
      held_balance_minor_units = v_held,
      paid_total_minor_units = v_paid,
      cod_reserved_balance_minor_units = v_cod_reserved,
      wallet_reserved_balance_minor_units = v_wallet_reserved,
      updated_at = now()
  WHERE operator_context_id = p_operator_context_id
    AND actor_type = p_actor_type
    AND actor_id = p_actor_id
    AND currency = p_currency;
END;
$$;

-- Deferred source trigger: payment-session tender changes refresh the client
-- wallet projection at transaction close, alongside the other source tables.
CREATE OR REPLACE FUNCTION wlt_refresh_wallet_from_payment_session()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM wlt_refresh_wallet_projection(
      OLD.operator_context_id, 'client', OLD.client_id, OLD.currency
    );
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM wlt_refresh_wallet_projection(
      NEW.operator_context_id, 'client', NEW.client_id, NEW.currency
    );
    RETURN NEW;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS wlt_payment_session_wallet_projection_trg ON wlt_payment_sessions;
CREATE CONSTRAINT TRIGGER wlt_payment_session_wallet_projection_trg
AFTER INSERT OR UPDATE OF status, wallet_amount_minor_units, client_id, currency, operator_context_id
ON wlt_payment_sessions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION wlt_refresh_wallet_from_payment_session();

-- The single available-balance rule now counts client wallet tender holds as
-- restricted, exactly like captain COD exposure.
CREATE OR REPLACE FUNCTION wlt_derive_wallet_available_from_ledger()
RETURNS trigger AS $$
DECLARE
  raw_balance bigint;
  canonical_balance bigint;
  restricted_balance bigint;
  has_open_exception boolean;
BEGIN
  IF NEW.operator_context_id = 'legacy-unscoped' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM wlt_wallet_projection_reconciliation_exceptions e
    WHERE e.operator_context_id = NEW.operator_context_id
      AND e.actor_type = NEW.actor_type
      AND e.actor_id = NEW.actor_id
      AND e.currency = NEW.currency
      AND e.status = 'open'
  ) INTO has_open_exception;

  IF has_open_exception THEN
    NEW.status := 'frozen';
    RETURN NEW;
  END IF;

  IF NEW.pending_balance_minor_units < 0
     OR NEW.held_balance_minor_units < 0
     OR COALESCE(NEW.cod_reserved_balance_minor_units, 0) < 0
     OR COALESCE(NEW.wallet_reserved_balance_minor_units, 0) < 0 THEN
    RAISE EXCEPTION 'wallet restricted balances cannot be negative';
  END IF;

  SELECT balance_minor_units
  INTO raw_balance
  FROM wlt_ledger_accounts
  WHERE operator_context_id = NEW.operator_context_id
    AND account_type = 'wallet'
    AND actor_type = NEW.actor_type
    AND actor_id = NEW.actor_id
    AND currency = NEW.currency;

  canonical_balance := COALESCE(-raw_balance, 0);
  restricted_balance :=
      NEW.pending_balance_minor_units
    + NEW.held_balance_minor_units
    + COALESCE(NEW.cod_reserved_balance_minor_units, 0)
    + COALESCE(NEW.wallet_reserved_balance_minor_units, 0);

  IF canonical_balance < 0 THEN
    RAISE EXCEPTION
      'canonical wallet balance is negative for %/%/%',
      NEW.operator_context_id, NEW.actor_type, NEW.actor_id;
  END IF;

  IF restricted_balance > canonical_balance THEN
    RAISE EXCEPTION
      'wallet restricted balance % exceeds canonical balance % for %/%/%',
      restricted_balance, canonical_balance,
      NEW.operator_context_id, NEW.actor_type, NEW.actor_id;
  END IF;

  NEW.available_balance_minor_units := canonical_balance - restricted_balance;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Backfill: existing unresolved wallet-tender sessions must hold immediately.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT s.operator_context_id, s.client_id, s.currency
    FROM wlt_payment_sessions s
    WHERE s.wallet_amount_minor_units IS NOT NULL
      AND s.wallet_amount_minor_units > 0
      AND s.status IN (
        'reference_created', 'pending_provider', 'authorization_pending',
        'authorized', 'capture_pending', 'cod_pending', 'provider_result_unknown'
      )
  LOOP
    PERFORM wlt_refresh_wallet_projection(
      r.operator_context_id, 'client', r.client_id, r.currency
    );
  END LOOP;
END;
$$;

COMMENT ON COLUMN wlt_wallets.wallet_reserved_balance_minor_units IS
  'Client wallet tender held by unresolved payment sessions; derived from wlt_payment_sessions.wallet_amount_minor_units.';

COMMIT;
