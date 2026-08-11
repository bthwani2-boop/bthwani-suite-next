-- Local representative-wallet runtime fixture.
--
-- Economic balance is seeded only through the canonical double-entry ledger.
-- wlt_wallets is a workflow/materialized projection: this file sets status and
-- restricted buckets after the canonical opening transaction exists, and the
-- WLT wallet-projection trigger derives available_balance_minor_units.
--
-- The fixture is local-only, deterministic and idempotent. It never writes new
-- rows to legacy wlt_ledger_entries.

-- Preserve the frozen/suspended reference actors from the foundation seed in
-- the local Identity OperatorContext so operator negative-state lookups remain
-- OperatorContext isolated rather than relying on legacy-unscoped rows. These
-- rows are status-only and carry zero financial balance.
UPDATE wlt_wallets
SET operator_context_id = 'local-dsh'
WHERE actor_id IN (
  'partner-dev-0001', 'partner-dev-0002',
  'captain-dev-0001', 'captain-dev-0002',
  'field-dev-0001', 'client-dev-0001'
);

DELETE FROM wlt_wallets
WHERE id = 'wlt-wallet-client-other-OperatorContext-001';

DO $$
DECLARE
  fixture record;
  wallet_account_id text;
  capital_account_id text;
  transaction_id text;
  inserted_transaction_id text;
  capital_running bigint;
  wallet_running bigint;
  existing_wallet_line_amount bigint;
  existing_capital_line_amount bigint;
BEGIN
  FOR fixture IN
    SELECT *
    FROM (VALUES
      ('wlt-wallet-client-local-001',  'local-dsh', 'client-local-001',  'client',  'active', 'YER', 125000::bigint, 10000::bigint,  5000::bigint, 140000::bigint, 10000::bigint,  5000::bigint, '2026-07-22T08:00:00Z'::timestamptz),
      ('wlt-wallet-partner-local-001', 'local-dsh', 'partner-local-001', 'partner', 'active', 'YER', 875000::bigint, 75000::bigint, 25000::bigint, 975000::bigint, 75000::bigint, 25000::bigint, '2026-07-22T08:01:00Z'::timestamptz),
      ('wlt-wallet-captain-local-001', 'local-dsh', '@@CAPTAIN_ACTOR_ID@@', 'captain', 'active', 'YER', 215000::bigint, 30000::bigint, 10000::bigint, 255000::bigint, 30000::bigint, 10000::bigint, '2026-07-22T08:02:00Z'::timestamptz),
      ('wlt-wallet-field-local-001',   'local-dsh', '@@FIELD_ACTOR_ID@@',   'field',   'active', 'YER', 165000::bigint, 20000::bigint,  5000::bigint, 190000::bigint, 20000::bigint,  5000::bigint, '2026-07-22T08:03:00Z'::timestamptz),
      ('wlt-wallet-client-isolated-context-001', 'isolated-platform-context', 'client-isolated-context-001', 'client', 'active', 'YER', 999999::bigint, 0::bigint, 0::bigint, 999999::bigint, 0::bigint, 0::bigint, '2026-07-22T08:04:00Z'::timestamptz)
    ) AS f(
      wallet_id, operator_context_id, actor_id, actor_type, status, currency,
      available_minor, pending_minor, held_minor,
      earned_total_minor, settled_total_minor, paid_total_minor, observed_at
    )
  LOOP
    IF fixture.available_minor < 0
       OR fixture.pending_minor < 0
       OR fixture.held_minor < 0 THEN
      RAISE EXCEPTION 'representative wallet fixture contains a negative balance bucket for %', fixture.wallet_id;
    END IF;

    INSERT INTO wlt_ledger_accounts (
      operator_context_id, account_type, actor_type, actor_id,
      currency, classification
    )
    VALUES (
      fixture.operator_context_id, 'wallet', fixture.actor_type,
      fixture.actor_id, fixture.currency, 'liability'
    )
    ON CONFLICT (operator_context_id, account_type, actor_type, actor_id, currency)
      WHERE account_type = 'wallet'
    DO UPDATE SET updated_at = wlt_ledger_accounts.updated_at
    RETURNING id INTO wallet_account_id;

    INSERT INTO wlt_ledger_accounts (
      operator_context_id, account_type, currency, classification
    )
    VALUES (
      fixture.operator_context_id, 'platform_capital_contribution',
      fixture.currency, 'asset'
    )
    ON CONFLICT (operator_context_id, account_type, currency)
      WHERE account_type <> 'wallet'
    DO UPDATE SET updated_at = wlt_ledger_accounts.updated_at
    RETURNING id INTO capital_account_id;

    inserted_transaction_id := NULL;
    INSERT INTO wlt_ledger_transactions (
      operator_context_id, transaction_type, reference_type, reference_id,
      created_by_actor_id, created_by_actor_type, created_at
    )
    VALUES (
      fixture.operator_context_id,
      'runtime_seed_opening_balance',
      'representative_wallet',
      fixture.wallet_id,
      'representative-wallets.local.sql',
      'runtime_seed',
      fixture.observed_at
    )
    ON CONFLICT (
      operator_context_id, transaction_type, reference_type, reference_id
    ) WHERE reference_type <> '' AND reference_id <> ''
    DO NOTHING
    RETURNING id INTO inserted_transaction_id;

    IF inserted_transaction_id IS NOT NULL THEN
      transaction_id := inserted_transaction_id;

      UPDATE wlt_ledger_accounts
      SET balance_minor_units = balance_minor_units + fixture.earned_total_minor,
          updated_at = now()
      WHERE id = capital_account_id
        AND operator_context_id = fixture.operator_context_id
      RETURNING balance_minor_units INTO capital_running;

      INSERT INTO wlt_ledger_lines (
        operator_context_id, ledger_transaction_id, account_id,
        debit_credit, amount_minor_units, currency,
        running_balance_after, created_at
      )
      VALUES (
        fixture.operator_context_id, transaction_id, capital_account_id,
        'debit', fixture.earned_total_minor, fixture.currency,
        capital_running, fixture.observed_at
      );

      UPDATE wlt_ledger_accounts
      SET balance_minor_units = balance_minor_units - fixture.earned_total_minor,
          updated_at = now()
      WHERE id = wallet_account_id
        AND operator_context_id = fixture.operator_context_id
      RETURNING balance_minor_units INTO wallet_running;

      INSERT INTO wlt_ledger_lines (
        operator_context_id, ledger_transaction_id, account_id,
        debit_credit, amount_minor_units, currency,
        running_balance_after, created_at
      )
      VALUES (
        fixture.operator_context_id, transaction_id, wallet_account_id,
        'credit', fixture.earned_total_minor, fixture.currency,
        wallet_running, fixture.observed_at
      );
    ELSE
      SELECT id INTO transaction_id
      FROM wlt_ledger_transactions
      WHERE operator_context_id = fixture.operator_context_id
        AND transaction_type = 'runtime_seed_opening_balance'
        AND reference_type = 'representative_wallet'
        AND reference_id = fixture.wallet_id;

      SELECT l.amount_minor_units
      INTO existing_wallet_line_amount
      FROM wlt_ledger_lines l
      WHERE l.operator_context_id = fixture.operator_context_id
        AND l.ledger_transaction_id = transaction_id
        AND l.account_id = wallet_account_id
        AND l.debit_credit = 'credit';

      SELECT l.amount_minor_units
      INTO existing_capital_line_amount
      FROM wlt_ledger_lines l
      WHERE l.operator_context_id = fixture.operator_context_id
        AND l.ledger_transaction_id = transaction_id
        AND l.account_id = capital_account_id
        AND l.debit_credit = 'debit';

      IF existing_wallet_line_amount IS DISTINCT FROM fixture.earned_total_minor
         OR existing_capital_line_amount IS DISTINCT FROM fixture.earned_total_minor THEN
        RAISE EXCEPTION
          'representative wallet canonical seed conflict for %: expected %, existing wallet %, capital %',
          fixture.wallet_id, fixture.earned_total_minor,
          existing_wallet_line_amount, existing_capital_line_amount;
      END IF;
    END IF;

    -- WLT derives available from canonical balance minus restricted workflow
    -- buckets. The explicit available value is intentionally omitted.
    INSERT INTO wlt_wallets (
      id,
      operator_context_id,
      actor_id,
      actor_type,
      status,
      currency,
      pending_balance_minor_units,
      held_balance_minor_units,
      earned_total_minor_units,
      settled_total_minor_units,
      paid_total_minor_units,
      last_ledger_entry_at,
      updated_at
    )
    VALUES (
      fixture.wallet_id,
      fixture.operator_context_id,
      fixture.actor_id,
      fixture.actor_type,
      fixture.status,
      fixture.currency,
      fixture.pending_minor,
      fixture.held_minor,
      fixture.earned_total_minor,
      fixture.settled_total_minor,
      fixture.paid_total_minor,
      fixture.observed_at,
      fixture.observed_at
    )
    ON CONFLICT (operator_context_id, actor_type, actor_id)
    DO UPDATE SET
      id = EXCLUDED.id,
      status = EXCLUDED.status,
      currency = EXCLUDED.currency,
      pending_balance_minor_units = EXCLUDED.pending_balance_minor_units,
      held_balance_minor_units = EXCLUDED.held_balance_minor_units,
      earned_total_minor_units = EXCLUDED.earned_total_minor_units,
      settled_total_minor_units = EXCLUDED.settled_total_minor_units,
      paid_total_minor_units = EXCLUDED.paid_total_minor_units,
      last_ledger_entry_at = EXCLUDED.last_ledger_entry_at,
      updated_at = EXCLUDED.updated_at;

    IF NOT EXISTS (
      SELECT 1
      FROM wlt_wallets
      WHERE operator_context_id = fixture.operator_context_id
        AND actor_type = fixture.actor_type
        AND actor_id = fixture.actor_id
        AND available_balance_minor_units = fixture.available_minor
        AND pending_balance_minor_units = fixture.pending_minor
        AND held_balance_minor_units = fixture.held_minor
    ) THEN
      RAISE EXCEPTION
        'representative wallet projection mismatch after canonical seed for %',
        fixture.wallet_id;
    END IF;
  END LOOP;
END $$;
