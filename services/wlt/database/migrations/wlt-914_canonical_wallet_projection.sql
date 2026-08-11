-- WLT-914: make wlt_wallets a governed materialized projection of the canonical double-entry ledger.
--
-- Accounting truth lives only in wlt_ledger_transactions / wlt_ledger_lines /
-- wlt_ledger_accounts. wlt_wallets retains workflow buckets (pending payout,
-- payout holds, COD reservations, lifecycle counters) but available balance is
-- derived at write time from the canonical wallet account:
--
--   available = canonical wallet balance - pending - held - cod_reserved
--
-- Legacy materialized balances with no canonical posting are preserved by an
-- explicit cutover opening transaction. Conflicting pre-existing canonical and
-- materialized balances are never silently overwritten: the wallet is frozen
-- and a reconciliation exception is recorded.

BEGIN;

CREATE TABLE IF NOT EXISTS wlt_wallet_projection_reconciliation_exceptions (
  id                           text PRIMARY KEY DEFAULT ('wwpre_' || gen_random_uuid()::text),
  operator_context_id          text NOT NULL,
  actor_type                   text NOT NULL,
  actor_id                     text NOT NULL,
  currency                     text NOT NULL,
  canonical_balance_minor_units bigint NOT NULL,
  materialized_balance_minor_units bigint NOT NULL,
  pending_balance_minor_units  bigint NOT NULL,
  held_balance_minor_units     bigint NOT NULL,
  cod_reserved_balance_minor_units bigint NOT NULL,
  reason                       text NOT NULL,
  status                       text NOT NULL DEFAULT 'open'
                                CHECK (status IN ('open', 'resolved')),
  created_at                   timestamptz NOT NULL DEFAULT now(),
  resolved_at                  timestamptz,
  resolved_by_actor_id         text,
  resolution_note              text,
  CONSTRAINT wlt_wallet_projection_reconciliation_context_chk
    CHECK (btrim(operator_context_id) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS wlt_wallet_projection_reconciliation_open_uq
  ON wlt_wallet_projection_reconciliation_exceptions
     (operator_context_id, actor_type, actor_id, currency)
  WHERE status = 'open';

-- "customer" was an early Cash-In alias. The governed wallet actor vocabulary
-- is client/partner/captain/field. A non-zero historical alias cannot be
-- relabelled silently because that changes the financial owner of immutable
-- lines; block cutover and require explicit finance reconciliation instead.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM wlt_ledger_accounts
    WHERE account_type = 'wallet'
      AND actor_type = 'customer'
      AND balance_minor_units <> 0
  ) THEN
    RAISE EXCEPTION
      'non-zero customer wallet ledger accounts exist; reconcile them to client before WLT-914';
  END IF;
END $$;

-- Future account creation normalizes the only known historical alias and
-- rejects every other unsupported wallet actor before financial state exists.
CREATE OR REPLACE FUNCTION wlt_normalize_wallet_ledger_actor_type()
RETURNS trigger AS $$
BEGIN
  IF NEW.account_type = 'wallet' THEN
    IF NEW.actor_type = 'customer' THEN
      NEW.actor_type := 'client';
    END IF;
    IF NEW.actor_type IS NULL
       OR NEW.actor_id IS NULL
       OR NEW.actor_type NOT IN ('client', 'partner', 'captain', 'field') THEN
      RAISE EXCEPTION 'unsupported canonical wallet actor_type %', NEW.actor_type;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wlt_ledger_accounts_actor_normalize_trg
  ON wlt_ledger_accounts;
CREATE TRIGGER wlt_ledger_accounts_actor_normalize_trg
  BEFORE INSERT OR UPDATE OF actor_type, actor_id, account_type, balance_minor_units
  ON wlt_ledger_accounts
  FOR EACH ROW
  EXECUTE FUNCTION wlt_normalize_wallet_ledger_actor_type();

-- Reconcile the pre-cutover materialized wallet total with the canonical
-- account. A wallet that has no canonical value yet receives one explicit,
-- balanced opening posting sourced from the persisted cutover wallet row.
DO $$
DECLARE
  wallet_row record;
  canonical_raw bigint;
  canonical_balance bigint;
  materialized_total bigint;
  wallet_account_id text;
  capital_account_id text;
  transaction_id text;
  capital_running bigint;
  wallet_running bigint;
BEGIN
  FOR wallet_row IN
    SELECT id,
           operator_context_id,
           actor_type,
           actor_id,
           currency,
           status,
           available_balance_minor_units,
           pending_balance_minor_units,
           held_balance_minor_units,
           COALESCE(cod_reserved_balance_minor_units, 0) AS cod_reserved_balance_minor_units
    FROM wlt_wallets
    WHERE operator_context_id <> 'legacy-unscoped'
    ORDER BY operator_context_id, actor_type, actor_id
  LOOP
    IF wallet_row.actor_type NOT IN ('client', 'partner', 'captain', 'field') THEN
      RAISE EXCEPTION
        'unsupported active WLT wallet actor_type % for wallet %',
        wallet_row.actor_type, wallet_row.id;
    END IF;

    materialized_total :=
        wallet_row.available_balance_minor_units
      + wallet_row.pending_balance_minor_units
      + wallet_row.held_balance_minor_units
      + wallet_row.cod_reserved_balance_minor_units;

    IF wallet_row.pending_balance_minor_units < 0
       OR wallet_row.held_balance_minor_units < 0
       OR wallet_row.cod_reserved_balance_minor_units < 0
       OR materialized_total < 0 THEN
      INSERT INTO wlt_wallet_projection_reconciliation_exceptions (
        operator_context_id, actor_type, actor_id, currency,
        canonical_balance_minor_units, materialized_balance_minor_units,
        pending_balance_minor_units, held_balance_minor_units,
        cod_reserved_balance_minor_units, reason
      )
      VALUES (
        wallet_row.operator_context_id, wallet_row.actor_type, wallet_row.actor_id, wallet_row.currency,
        0, materialized_total, wallet_row.pending_balance_minor_units,
        wallet_row.held_balance_minor_units, wallet_row.cod_reserved_balance_minor_units,
        'invalid pre-cutover wallet bucket values'
      )
      ON CONFLICT (operator_context_id, actor_type, actor_id, currency)
        WHERE status = 'open'
      DO NOTHING;

      UPDATE wlt_wallets
      SET status = 'frozen', updated_at = now()
      WHERE id = wallet_row.id;
      CONTINUE;
    END IF;

    SELECT id, balance_minor_units
      INTO wallet_account_id, canonical_raw
    FROM wlt_ledger_accounts
    WHERE operator_context_id = wallet_row.operator_context_id
      AND account_type = 'wallet'
      AND actor_type = wallet_row.actor_type
      AND actor_id = wallet_row.actor_id
      AND currency = wallet_row.currency
    FOR UPDATE;

    IF NOT FOUND THEN
      INSERT INTO wlt_ledger_accounts (
        operator_context_id, account_type, actor_type, actor_id,
        currency, classification
      )
      VALUES (
        wallet_row.operator_context_id, 'wallet', wallet_row.actor_type,
        wallet_row.actor_id, wallet_row.currency, 'liability'
      )
      RETURNING id, balance_minor_units
      INTO wallet_account_id, canonical_raw;
    END IF;

    canonical_balance := -canonical_raw;

    IF canonical_balance = 0 AND materialized_total > 0 THEN
      INSERT INTO wlt_ledger_accounts (
        operator_context_id, account_type, currency, classification
      )
      VALUES (
        wallet_row.operator_context_id, 'platform_capital_contribution',
        wallet_row.currency, 'asset'
      )
      ON CONFLICT (operator_context_id, account_type, currency)
        WHERE account_type <> 'wallet'
      DO UPDATE SET updated_at = wlt_ledger_accounts.updated_at
      RETURNING id INTO capital_account_id;

      INSERT INTO wlt_ledger_transactions (
        operator_context_id, transaction_type, reference_type, reference_id,
        created_by_actor_id, created_by_actor_type
      )
      VALUES (
        wallet_row.operator_context_id, 'wallet_projection_cutover_opening',
        'wallet', wallet_row.id, 'wlt-914', 'migration'
      )
      ON CONFLICT (
        operator_context_id, transaction_type, reference_type, reference_id
      ) WHERE reference_type <> '' AND reference_id <> ''
      DO NOTHING
      RETURNING id INTO transaction_id;

      IF transaction_id IS NULL THEN
        SELECT id INTO transaction_id
        FROM wlt_ledger_transactions
        WHERE operator_context_id = wallet_row.operator_context_id
          AND transaction_type = 'wallet_projection_cutover_opening'
          AND reference_type = 'wallet'
          AND reference_id = wallet_row.id;
      ELSE
        UPDATE wlt_ledger_accounts
        SET balance_minor_units = balance_minor_units + materialized_total,
            updated_at = now()
        WHERE id = capital_account_id
          AND operator_context_id = wallet_row.operator_context_id
        RETURNING balance_minor_units INTO capital_running;

        INSERT INTO wlt_ledger_lines (
          operator_context_id, ledger_transaction_id, account_id,
          debit_credit, amount_minor_units, currency, running_balance_after
        )
        VALUES (
          wallet_row.operator_context_id, transaction_id, capital_account_id,
          'debit', materialized_total, wallet_row.currency, capital_running
        );

        UPDATE wlt_ledger_accounts
        SET balance_minor_units = balance_minor_units - materialized_total,
            updated_at = now()
        WHERE id = wallet_account_id
          AND operator_context_id = wallet_row.operator_context_id
        RETURNING balance_minor_units INTO wallet_running;

        INSERT INTO wlt_ledger_lines (
          operator_context_id, ledger_transaction_id, account_id,
          debit_credit, amount_minor_units, currency, running_balance_after
        )
        VALUES (
          wallet_row.operator_context_id, transaction_id, wallet_account_id,
          'credit', materialized_total, wallet_row.currency, wallet_running
        );
      END IF;

      canonical_balance := materialized_total;
    END IF;

    IF canonical_balance <> materialized_total THEN
      INSERT INTO wlt_wallet_projection_reconciliation_exceptions (
        operator_context_id, actor_type, actor_id, currency,
        canonical_balance_minor_units, materialized_balance_minor_units,
        pending_balance_minor_units, held_balance_minor_units,
        cod_reserved_balance_minor_units, reason
      )
      VALUES (
        wallet_row.operator_context_id, wallet_row.actor_type, wallet_row.actor_id, wallet_row.currency,
        canonical_balance, materialized_total, wallet_row.pending_balance_minor_units,
        wallet_row.held_balance_minor_units, wallet_row.cod_reserved_balance_minor_units,
        'canonical ledger and pre-cutover wallet materialization disagree'
      )
      ON CONFLICT (operator_context_id, actor_type, actor_id, currency)
        WHERE status = 'open'
      DO NOTHING;

      UPDATE wlt_wallets
      SET status = 'frozen', updated_at = now()
      WHERE id = wallet_row.id;
    END IF;
  END LOOP;
END $$;

-- This trigger is the sole rule allowed to decide available balance. Existing
-- domain writes may move restricted workflow buckets atomically, but any
-- caller-supplied available value is overwritten from canonical accounting.
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

DROP TRIGGER IF EXISTS wlt_wallets_canonical_projection_trg ON wlt_wallets;
CREATE TRIGGER wlt_wallets_canonical_projection_trg
  BEFORE INSERT OR UPDATE
  ON wlt_wallets
  FOR EACH ROW
  EXECUTE FUNCTION wlt_derive_wallet_available_from_ledger();

-- Any canonical wallet posting refreshes/creates the materialized wallet. The
-- wallet trigger above computes available using the now-current ledger account,
-- so ledger-only flows (Cash-In included) become visible without a second
-- accounting write path.
CREATE OR REPLACE FUNCTION wlt_refresh_wallet_projection_from_ledger()
RETURNS trigger AS $$
BEGIN
  IF NEW.account_type <> 'wallet'
     OR NEW.operator_context_id = 'legacy-unscoped' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM wlt_wallets w
    WHERE w.operator_context_id = NEW.operator_context_id
      AND w.actor_type = NEW.actor_type
      AND w.actor_id = NEW.actor_id
      AND w.currency <> NEW.currency
  ) THEN
    RAISE EXCEPTION
      'canonical wallet currency % conflicts with materialized wallet currency for %/%/%',
      NEW.currency, NEW.operator_context_id, NEW.actor_type, NEW.actor_id;
  END IF;

  INSERT INTO wlt_wallets (
    operator_context_id, actor_id, actor_type, status, currency,
    last_ledger_entry_at
  )
  VALUES (
    NEW.operator_context_id, NEW.actor_id, NEW.actor_type, 'active',
    NEW.currency, now()
  )
  ON CONFLICT (operator_context_id, actor_type, actor_id)
  DO UPDATE SET
    last_ledger_entry_at = now(),
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wlt_ledger_accounts_wallet_projection_trg
  ON wlt_ledger_accounts;
CREATE TRIGGER wlt_ledger_accounts_wallet_projection_trg
  AFTER INSERT OR UPDATE OF balance_minor_units
  ON wlt_ledger_accounts
  FOR EACH ROW
  WHEN (NEW.account_type = 'wallet')
  EXECUTE FUNCTION wlt_refresh_wallet_projection_from_ledger();

-- Re-evaluate all non-exception current rows once so the cutover finishes with
-- a projection that already equals canonical truth, not only future writes.
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

CREATE OR REPLACE VIEW wlt_wallet_projection_consistency AS
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
  ) AS materialized_balance_minor_units,
  (
    COALESCE(-a.balance_minor_units, 0) =
      w.available_balance_minor_units
      + w.pending_balance_minor_units
      + w.held_balance_minor_units
      + COALESCE(w.cod_reserved_balance_minor_units, 0)
  ) AS consistent
FROM wlt_wallets w
LEFT JOIN wlt_ledger_accounts a
  ON a.operator_context_id = w.operator_context_id
 AND a.account_type = 'wallet'
 AND a.actor_type = w.actor_type
 AND a.actor_id = w.actor_id
 AND a.currency = w.currency
WHERE w.operator_context_id <> 'legacy-unscoped';

COMMENT ON VIEW wlt_wallet_projection_consistency IS
  'Fail-closed observability: materialized wallet total must equal the canonical credit-normal wallet account balance.';

COMMIT;
