-- WLT-916: restrict workflow buckets to committed canonical wallet value.
--
-- Net debt is a valid accounting state, so the canonical wallet account may
-- be negative. Restricted workflow buckets are different: pending, held and
-- COD-reserved value represent slices of money that actually exists and must
-- never exceed the canonical credit-normal wallet balance at transaction end.
-- WLT-915 already made the projection identity check deferrable; this migration
-- tightens that same commit-boundary invariant without reintroducing
-- intermediate-statement failures.

BEGIN;

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

  IF restricted_balance > 0 AND restricted_balance > canonical_balance THEN
    RAISE EXCEPTION
      'wallet restricted balance % exceeds canonical balance % for %/%/%',
      restricted_balance, canonical_balance,
      current_wallet.operator_context_id, current_wallet.actor_type,
      current_wallet.actor_id;
  END IF;

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

-- Validate all authoritative projections now. Rows with an explicit open
-- reconciliation exception are intentionally frozen outside current authority.
DO $$
DECLARE
  invalid_count bigint;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM wlt_wallet_projection_consistency c
  LEFT JOIN wlt_wallet_projection_reconciliation_exceptions e
    ON e.operator_context_id = c.operator_context_id
   AND e.actor_type = c.actor_type
   AND e.actor_id = c.actor_id
   AND e.currency = c.currency
   AND e.status = 'open'
  WHERE e.id IS NULL
    AND (
      NOT c.consistent
      OR (
        c.pending_balance_minor_units
        + c.held_balance_minor_units
        + c.cod_reserved_balance_minor_units
      ) > c.canonical_balance_minor_units
    );

  IF invalid_count <> 0 THEN
    RAISE EXCEPTION
      'WLT-916 cannot activate: % authoritative wallet projections violate committed canonical restrictions',
      invalid_count;
  END IF;
END $$;

COMMIT;
