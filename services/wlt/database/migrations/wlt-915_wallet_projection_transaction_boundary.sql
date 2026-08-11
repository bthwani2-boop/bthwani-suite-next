-- WLT-915: enforce canonical wallet projection at transaction boundary.
--
-- WLT-914 made available_balance_minor_units a projection of canonical ledger
-- balance minus restricted workflow buckets. Some valid domain mutations move a
-- restricted bucket and post the matching ledger effect later in the same SQL
-- transaction. Enforcing an intermediate non-overdraft assertion inside the
-- BEFORE trigger rejects valid atomic transitions before their matching ledger
-- line is posted. A wallet ledger may also legitimately represent net debt;
-- negative economic balance is non-spendable state, not accounting corruption.
--
-- Keep every restricted bucket non-negative and always derive available from
-- canonical accounting. Validate the projection identity at transaction end,
-- but leave spend/hold limits to the governed domain operation that owns them.

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
     OR COALESCE(NEW.cod_reserved_balance_minor_units, 0) < 0 THEN
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
    + COALESCE(NEW.cod_reserved_balance_minor_units, 0);

  NEW.available_balance_minor_units := canonical_balance - restricted_balance;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION wlt_assert_wallet_projection_identity()
RETURNS trigger AS $$
DECLARE
  current_wallet record;
  raw_balance bigint;
  canonical_balance bigint;
  restricted_balance bigint;
  expected_available bigint;
  has_open_exception boolean;
BEGIN
  -- A deferred trigger can be queued by an intermediate row version. Validate
  -- the row that exists now rather than transient NEW values.
  SELECT * INTO current_wallet
  FROM wlt_wallets
  WHERE operator_context_id = NEW.operator_context_id
    AND actor_type = NEW.actor_type
    AND actor_id = NEW.actor_id;

  IF NOT FOUND OR current_wallet.operator_context_id = 'legacy-unscoped' THEN
    RETURN NULL;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM wlt_wallet_projection_reconciliation_exceptions e
    WHERE e.operator_context_id = current_wallet.operator_context_id
      AND e.actor_type = current_wallet.actor_type
      AND e.actor_id = current_wallet.actor_id
      AND e.currency = current_wallet.currency
      AND e.status = 'open'
  ) INTO has_open_exception;

  IF has_open_exception THEN
    IF current_wallet.status <> 'frozen' THEN
      RAISE EXCEPTION
        'wallet with open projection reconciliation exception must remain frozen for %/%/%',
        current_wallet.operator_context_id, current_wallet.actor_type,
        current_wallet.actor_id;
    END IF;
    RETURN NULL;
  END IF;

  IF current_wallet.pending_balance_minor_units < 0
     OR current_wallet.held_balance_minor_units < 0
     OR COALESCE(current_wallet.cod_reserved_balance_minor_units, 0) < 0 THEN
    RAISE EXCEPTION 'wallet restricted balances cannot be negative';
  END IF;

  SELECT balance_minor_units
  INTO raw_balance
  FROM wlt_ledger_accounts
  WHERE operator_context_id = current_wallet.operator_context_id
    AND account_type = 'wallet'
    AND actor_type = current_wallet.actor_type
    AND actor_id = current_wallet.actor_id
    AND currency = current_wallet.currency;

  canonical_balance := COALESCE(-raw_balance, 0);
  restricted_balance :=
      current_wallet.pending_balance_minor_units
    + current_wallet.held_balance_minor_units
    + COALESCE(current_wallet.cod_reserved_balance_minor_units, 0);
  expected_available := canonical_balance - restricted_balance;

  IF current_wallet.available_balance_minor_units <> expected_available THEN
    RAISE EXCEPTION
      'wallet projection drift: available % but canonical-minus-restricted is % for %/%/%',
      current_wallet.available_balance_minor_units, expected_available,
      current_wallet.operator_context_id, current_wallet.actor_type,
      current_wallet.actor_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wlt_wallets_projection_identity_trg ON wlt_wallets;
CREATE CONSTRAINT TRIGGER wlt_wallets_projection_identity_trg
  AFTER INSERT OR UPDATE
  ON wlt_wallets
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION wlt_assert_wallet_projection_identity();

-- Re-evaluate current rows with the corrected projection function. Open
-- reconciliation exceptions remain frozen and excluded from authoritative
-- projection until explicitly resolved.
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
