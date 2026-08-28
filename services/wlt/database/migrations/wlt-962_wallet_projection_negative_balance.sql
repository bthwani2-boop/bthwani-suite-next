-- WLT-962: allow negative economic wallet balances while preserving the
-- canonical available-balance projection.
--
-- WLT-960 accidentally reintroduced an overdraft rejection in the shared
-- projection trigger. Existing ledger tests and governed refund flows may
-- temporarily produce a negative canonical wallet balance while the account
-- is non-spendable; that is a valid economic state, not projection corruption.
-- The trigger must reject negative restricted buckets, but it must not reject a
-- negative canonical balance or require restricted balances to fit inside it.
-- Available remains the canonical balance minus every restricted bucket.

BEGIN;

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
     OR COALESCE(NEW.collateral_reserved_balance_minor_units, 0) < 0
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
    + COALESCE(NEW.collateral_reserved_balance_minor_units, 0)
    + COALESCE(NEW.wallet_reserved_balance_minor_units, 0);

  NEW.available_balance_minor_units := canonical_balance - restricted_balance;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recompute every authoritative projection through the corrected derivation.
UPDATE wlt_wallets w
SET available_balance_minor_units = w.available_balance_minor_units,
    updated_at = now()
WHERE w.operator_context_id <> 'legacy-unscoped'
  AND NOT EXISTS (
    SELECT 1
    FROM wlt_wallet_projection_reconciliation_exceptions e
    WHERE e.operator_context_id = w.operator_context_id
      AND e.actor_type = w.actor_type
      AND e.actor_id = w.actor_id
      AND e.currency = w.currency
      AND e.status = 'open'
  );

COMMIT;
