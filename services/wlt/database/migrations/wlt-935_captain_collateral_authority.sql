-- WLT-935: captain collateral/guarantee authority.
--
-- A captain has one canonical WLT wallet. Collateral is a restricted position
-- inside that wallet, never a second wallet and never a Workforce-owned money
-- field. The wallet projection therefore subtracts collateral from spendable
-- available funds exactly like the other committed restriction buckets.

BEGIN;

ALTER TABLE wlt_wallets
    ADD COLUMN collateral_reserved_balance_minor_units BIGINT NOT NULL DEFAULT 0,
    ADD CONSTRAINT wlt_wallets_collateral_reserved_nonnegative_chk
      CHECK (collateral_reserved_balance_minor_units >= 0);

CREATE TABLE wlt_captain_collateral_policies (
    operator_context_id TEXT PRIMARY KEY,
    policy_id TEXT NOT NULL,
    policy_version BIGINT NOT NULL DEFAULT 1,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    minimum_collateral_minor_units BIGINT NOT NULL,
    currency TEXT NOT NULL,
    change_reason TEXT NOT NULL,
    updated_by_actor_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT wlt_captain_collateral_policy_id_chk CHECK (btrim(policy_id) <> ''),
    CONSTRAINT wlt_captain_collateral_policy_version_chk CHECK (policy_version > 0),
    CONSTRAINT wlt_captain_collateral_policy_amount_chk CHECK (minimum_collateral_minor_units >= 0),
    CONSTRAINT wlt_captain_collateral_policy_currency_chk CHECK (currency = upper(currency) AND length(currency) = 3),
    CONSTRAINT wlt_captain_collateral_policy_reason_chk CHECK (btrim(change_reason) <> ''),
    CONSTRAINT wlt_captain_collateral_policy_actor_chk CHECK (btrim(updated_by_actor_id) <> '')
);

CREATE TABLE wlt_captain_collateral_positions (
    id TEXT PRIMARY KEY DEFAULT ('wcapcol_' || gen_random_uuid()::text),
    operator_context_id TEXT NOT NULL,
    captain_id TEXT NOT NULL,
    currency TEXT NOT NULL,
    policy_id TEXT NOT NULL,
    policy_version BIGINT NOT NULL,
    protected_minimum_minor_units BIGINT NOT NULL,
    restricted_amount_minor_units BIGINT NOT NULL,
    source_payment_session_id TEXT NOT NULL,
    source_ledger_transaction_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    release_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    released_at TIMESTAMPTZ,
    CONSTRAINT wlt_captain_collateral_position_context_chk CHECK (btrim(operator_context_id) <> ''),
    CONSTRAINT wlt_captain_collateral_position_captain_chk CHECK (btrim(captain_id) <> ''),
    CONSTRAINT wlt_captain_collateral_position_currency_chk CHECK (currency = upper(currency) AND length(currency) = 3),
    CONSTRAINT wlt_captain_collateral_position_policy_version_chk CHECK (policy_version > 0),
    CONSTRAINT wlt_captain_collateral_position_minimum_chk CHECK (protected_minimum_minor_units >= 0),
    CONSTRAINT wlt_captain_collateral_position_amount_chk CHECK (restricted_amount_minor_units > 0),
    CONSTRAINT wlt_captain_collateral_position_status_chk CHECK (status IN ('active', 'released')),
    CONSTRAINT wlt_captain_collateral_position_source_chk CHECK (btrim(source_payment_session_id) <> '' AND btrim(source_ledger_transaction_id) <> ''),
    CONSTRAINT wlt_captain_collateral_position_release_chk CHECK (status = 'active' OR (released_at IS NOT NULL AND btrim(COALESCE(release_reason, '')) <> ''))
);

CREATE UNIQUE INDEX wlt_captain_collateral_source_session_uq
    ON wlt_captain_collateral_positions(operator_context_id, source_payment_session_id);
CREATE INDEX wlt_captain_collateral_active_captain_idx
    ON wlt_captain_collateral_positions(operator_context_id, captain_id, currency)
    WHERE status = 'active';

CREATE TABLE wlt_captain_collateral_events (
    id TEXT PRIMARY KEY DEFAULT ('wcapcole_' || gen_random_uuid()::text),
    operator_context_id TEXT NOT NULL,
    captain_id TEXT NOT NULL,
    position_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    amount_minor_units BIGINT NOT NULL,
    currency TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT wlt_captain_collateral_event_operation_chk CHECK (operation IN ('allocate', 'release')),
    CONSTRAINT wlt_captain_collateral_event_amount_chk CHECK (amount_minor_units > 0),
    CONSTRAINT wlt_captain_collateral_event_reason_chk CHECK (btrim(reason) <> '')
);

CREATE UNIQUE INDEX wlt_captain_collateral_event_idempotency_uq
    ON wlt_captain_collateral_events(operator_context_id, idempotency_key);
CREATE INDEX wlt_captain_collateral_events_position_idx
    ON wlt_captain_collateral_events(operator_context_id, position_id, created_at);

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
     OR NEW.collateral_reserved_balance_minor_units < 0 THEN
    RAISE EXCEPTION 'wallet restricted balances cannot be negative';
  END IF;

  SELECT balance_minor_units INTO raw_balance
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
    + NEW.collateral_reserved_balance_minor_units;

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
      RAISE EXCEPTION 'wallet with open projection reconciliation exception must remain frozen for %/%/%',
        current_wallet.operator_context_id, current_wallet.actor_type, current_wallet.actor_id;
    END IF;
    RETURN NULL;
  END IF;

  IF current_wallet.pending_balance_minor_units < 0
     OR current_wallet.held_balance_minor_units < 0
     OR COALESCE(current_wallet.cod_reserved_balance_minor_units, 0) < 0
     OR current_wallet.collateral_reserved_balance_minor_units < 0 THEN
    RAISE EXCEPTION 'wallet restricted balances cannot be negative';
  END IF;

  SELECT balance_minor_units INTO raw_balance
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
    + current_wallet.collateral_reserved_balance_minor_units;
  expected_available := canonical_balance - restricted_balance;

  IF restricted_balance > 0 AND restricted_balance > canonical_balance THEN
    RAISE EXCEPTION 'wallet restricted balance % exceeds canonical balance % for %/%/%',
      restricted_balance, canonical_balance,
      current_wallet.operator_context_id, current_wallet.actor_type, current_wallet.actor_id;
  END IF;

  IF current_wallet.available_balance_minor_units <> expected_available THEN
    RAISE EXCEPTION 'wallet projection drift: available % but canonical-minus-restricted is % for %/%/%',
      current_wallet.available_balance_minor_units, expected_available,
      current_wallet.operator_context_id, current_wallet.actor_type, current_wallet.actor_id;
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
    + w.collateral_reserved_balance_minor_units
  ) AS materialized_balance_minor_units,
  (
    COALESCE(-a.balance_minor_units, 0) =
      w.available_balance_minor_units
      + w.pending_balance_minor_units
      + w.held_balance_minor_units
      + COALESCE(w.cod_reserved_balance_minor_units, 0)
      + w.collateral_reserved_balance_minor_units
  ) AS consistent
  ,w.collateral_reserved_balance_minor_units
FROM wlt_wallets w
LEFT JOIN wlt_ledger_accounts a
  ON a.operator_context_id = w.operator_context_id
 AND a.account_type = 'wallet'
 AND a.actor_type = w.actor_type
 AND a.actor_id = w.actor_id
 AND a.currency = w.currency
WHERE w.operator_context_id <> 'legacy-unscoped';

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
      OR c.collateral_reserved_balance_minor_units < 0
      OR (
        c.pending_balance_minor_units
        + c.held_balance_minor_units
        + c.cod_reserved_balance_minor_units
        + c.collateral_reserved_balance_minor_units
      ) > 0
      AND (
        c.pending_balance_minor_units
        + c.held_balance_minor_units
        + c.cod_reserved_balance_minor_units
        + c.collateral_reserved_balance_minor_units
      ) > c.canonical_balance_minor_units
    );

  IF invalid_count <> 0 THEN
    RAISE EXCEPTION 'WLT-935 cannot activate: % wallet projections violate committed collateral restrictions', invalid_count;
  END IF;
END $$;

UPDATE wlt_wallets
SET available_balance_minor_units = available_balance_minor_units,
    updated_at = now()
WHERE operator_context_id <> 'legacy-unscoped';

COMMENT ON COLUMN wlt_wallets.collateral_reserved_balance_minor_units IS
  'WLT-owned captain collateral restricted inside the one canonical wallet; excluded from spendable available balance.';
COMMENT ON TABLE wlt_captain_collateral_positions IS
  'Immutable-source-linked captain collateral positions. The source payment and ledger transaction are WLT facts.';

COMMIT;
