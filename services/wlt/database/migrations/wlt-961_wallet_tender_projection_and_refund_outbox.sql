-- WLT-961: keep the wallet projection identity and refund outbox source
-- contract aligned with the wallet-tender and top-up source extensions.
--
-- WLT-960 added wallet_reserved_balance_minor_units to the available-balance
-- derivation, but the deferred identity assertion and consistency view were
-- still the WLT-935 versions. A mixed checkout therefore refreshed the client
-- wallet with a reservation and was rejected at COMMIT as projection drift.
--
-- Top-up payment sessions have no checkout_intent_id or special_request_id.
-- Their completed refund outbox event is identified by refund_reference, so the
-- old checkout/special-request XOR must explicitly allow that refund source.

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
     OR COALESCE(current_wallet.cod_reserved_balance_minor_units, 0) < 0
     OR COALESCE(current_wallet.collateral_reserved_balance_minor_units, 0) < 0
     OR COALESCE(current_wallet.wallet_reserved_balance_minor_units, 0) < 0 THEN
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
    + COALESCE(current_wallet.cod_reserved_balance_minor_units, 0)
    + COALESCE(current_wallet.collateral_reserved_balance_minor_units, 0)
    + COALESCE(current_wallet.wallet_reserved_balance_minor_units, 0);
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

DROP VIEW IF EXISTS wlt_wallet_projection_consistency;
CREATE VIEW wlt_wallet_projection_consistency AS
SELECT
  w.operator_context_id,
  w.actor_type,
  w.actor_id,
  w.currency,
  COALESCE(-a.balance_minor_units, 0) AS canonical_balance_minor_units,
  w.available_balance_minor_units,
  w.pending_balance_minor_units,
  w.held_balance_minor_units,
  COALESCE(w.cod_reserved_balance_minor_units, 0) AS cod_reserved_balance_minor_units,
  (
      w.available_balance_minor_units
    + w.pending_balance_minor_units
    + w.held_balance_minor_units
    + COALESCE(w.cod_reserved_balance_minor_units, 0)
    + COALESCE(w.collateral_reserved_balance_minor_units, 0)
    + COALESCE(w.wallet_reserved_balance_minor_units, 0)
  ) AS materialized_balance_minor_units,
  (
    COALESCE(-a.balance_minor_units, 0) =
      w.available_balance_minor_units
      + w.pending_balance_minor_units
      + w.held_balance_minor_units
      + COALESCE(w.cod_reserved_balance_minor_units, 0)
      + COALESCE(w.collateral_reserved_balance_minor_units, 0)
      + COALESCE(w.wallet_reserved_balance_minor_units, 0)
  ) AS consistent,
  COALESCE(w.collateral_reserved_balance_minor_units, 0) AS collateral_reserved_balance_minor_units,
  COALESCE(w.wallet_reserved_balance_minor_units, 0) AS wallet_reserved_balance_minor_units
FROM wlt_wallets w
LEFT JOIN wlt_ledger_accounts a
  ON a.operator_context_id = w.operator_context_id
 AND a.account_type = 'wallet'
 AND a.actor_type = w.actor_type
 AND a.actor_id = w.actor_id
 AND a.currency = w.currency
WHERE w.operator_context_id <> 'legacy-unscoped';

-- Recompute every authoritative projection through the WLT-960 derivation
-- after installing the corrected deferred identity assertion.
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

ALTER TABLE wlt_dsh_outbox_events
  DROP CONSTRAINT IF EXISTS wlt_dsh_outbox_events_source_xor_chk;

ALTER TABLE wlt_dsh_outbox_events
  ADD CONSTRAINT wlt_dsh_outbox_events_source_xor_chk
  CHECK (
    refund_reference IS NOT NULL
    OR ((checkout_intent_id IS NOT NULL) <> (special_request_id IS NOT NULL))
  );

COMMIT;
