-- Local-only governed reference projections for the authenticated WLT runtime smoke.
-- These rows model read-only projections produced by WLT internal processes; they
-- are not production bootstrap data and are scoped to the local operator context.
INSERT INTO wlt_payment_status_refs (
    order_id,
    status,
    operator_context_id
) SELECT 'order-dev-0001', 'captured', 'local-dsh'
WHERE NOT EXISTS (
    SELECT 1
    FROM wlt_payment_status_refs
    WHERE order_id = 'order-dev-0001'
      AND operator_context_id = 'local-dsh'
);

-- Representative DSH readback uses the canonical password-bootstrap actors.
-- Keep their local wallet projections and legacy ledger read model in the same
-- trusted OperatorContext as Identity; production never consumes local seeds.
INSERT INTO wlt_wallets (
    operator_context_id,
    actor_id,
    actor_type,
    status,
    currency
)
SELECT fixture.operator_context_id, fixture.actor_id, fixture.actor_type,
       'active', 'YER'
FROM (VALUES
    ('local-dsh', 'client-local-001', 'client'),
    ('local-dsh', 'partner-local-001', 'partner'),
    ('local-dsh', '@@FIELD_ACTOR_ID@@', 'field'),
    ('local-dsh', '@@CAPTAIN_ACTOR_ID@@', 'captain')
) AS fixture(operator_context_id, actor_id, actor_type)
ON CONFLICT (operator_context_id, actor_type, actor_id) DO UPDATE
SET status = EXCLUDED.status,
    currency = EXCLUDED.currency,
    updated_at = NOW();

INSERT INTO wlt_ledger_entries (
    operator_context_id,
    actor_id,
    actor_type,
    entry_type,
    amount_minor_units,
    currency,
    debit_credit,
    balance_after,
    description,
    source_type,
    source_id,
    idempotency_key
)
SELECT fixture.operator_context_id, fixture.actor_id, fixture.actor_type,
       'local_representative_fixture', 0, 'YER', 'debit', 0,
       'Local-only authenticated representative finance readback fixture',
       'local_seed', fixture.actor_id, fixture.idempotency_key
FROM (VALUES
    ('local-dsh', 'client-local-001', 'client', 'wlt-936-client-local'),
    ('local-dsh', 'partner-local-001', 'partner', 'wlt-936-partner-local'),
    ('local-dsh', '@@FIELD_ACTOR_ID@@', 'field', 'wlt-936-field-local'),
    ('local-dsh', '@@CAPTAIN_ACTOR_ID@@', 'captain', 'wlt-936-captain-local')
) AS fixture(operator_context_id, actor_id, actor_type, idempotency_key)
ON CONFLICT DO NOTHING;

-- The current finance API reads canonical double-entry lines, not the legacy
-- wlt_ledger_entries read model. Seed one positive wallet leg per actor and a
-- balanced provider-clearing counterpart so self/control-panel parity exercises
-- the real read authority.
INSERT INTO wlt_ledger_accounts (
    id,
    operator_context_id,
    account_type,
    actor_type,
    actor_id,
    currency,
    balance_minor_units,
    classification
)
SELECT fixture.id, 'local-dsh', fixture.account_type, fixture.actor_type,
       fixture.actor_id, 'YER',
       CASE WHEN fixture.account_type = 'provider_clearing' THEN 4 ELSE -1 END,
       CASE WHEN fixture.account_type = 'provider_clearing' THEN 'asset' ELSE 'liability' END
FROM (VALUES
    ('wlt-936-wallet-account-client-local', 'wallet', 'client', 'client-local-001'),
    ('wlt-936-wallet-account-partner-local', 'wallet', 'partner', 'partner-local-001'),
    ('wlt-936-wallet-account-field-local', 'wallet', 'field', '@@FIELD_ACTOR_ID@@'),
    ('wlt-936-wallet-account-captain-local', 'wallet', 'captain', '@@CAPTAIN_ACTOR_ID@@'),
    ('wlt-936-provider-clearing-account', 'provider_clearing', NULL, NULL)
) AS fixture(id, account_type, actor_type, actor_id)
ON CONFLICT DO NOTHING;

INSERT INTO wlt_ledger_transactions (
    id,
    operator_context_id,
    transaction_type,
    reference_type,
    reference_id,
    created_by_actor_id,
    created_by_actor_type
)
VALUES (
    'wlt-936-representative-ledger-@@FIELD_ACTOR_ID@@-@@CAPTAIN_ACTOR_ID@@',
    'local-dsh',
    'local_representative_fixture',
    'local_seed',
    'wlt-936-representative-ledger-@@FIELD_ACTOR_ID@@-@@CAPTAIN_ACTOR_ID@@',
    'local-seed-finance-system',
    'system'
)
ON CONFLICT DO NOTHING;

-- Reconcile the materialized wallet rows after the canonical account balances
-- exist; the wallet BEFORE trigger derives available balance from those rows.
UPDATE wlt_wallets
SET available_balance_minor_units = available_balance_minor_units,
    updated_at = NOW()
WHERE operator_context_id = 'local-dsh'
  AND actor_id IN ('client-local-001', 'partner-local-001', '@@FIELD_ACTOR_ID@@', '@@CAPTAIN_ACTOR_ID@@');

INSERT INTO wlt_ledger_lines (
    operator_context_id,
    ledger_transaction_id,
    account_id,
    debit_credit,
    amount_minor_units,
    currency,
    running_balance_after
)
SELECT 'local-dsh', transaction_row.id, account.id,
       CASE WHEN account.account_type = 'wallet' THEN 'credit' ELSE 'debit' END,
       CASE WHEN account.account_type = 'wallet' THEN 1 ELSE 4 END,
       'YER', account.balance_minor_units
FROM wlt_ledger_transactions AS transaction_row
JOIN wlt_ledger_accounts AS account
  ON account.operator_context_id = 'local-dsh'
 AND account.id IN (
     'wlt-936-wallet-account-client-local',
     'wlt-936-wallet-account-partner-local',
     'wlt-936-wallet-account-field-local',
     'wlt-936-wallet-account-captain-local',
     'wlt-936-provider-clearing-account'
 )
WHERE transaction_row.operator_context_id = 'local-dsh'
  AND transaction_row.id = 'wlt-936-representative-ledger-@@FIELD_ACTOR_ID@@-@@CAPTAIN_ACTOR_ID@@'
  AND NOT EXISTS (
      SELECT 1
      FROM wlt_ledger_lines existing
      WHERE existing.operator_context_id = 'local-dsh'
        AND existing.ledger_transaction_id = transaction_row.id
        AND existing.account_id = account.id
  );

-- The representative field readback also proves the canonical official-wallet
-- destination projection. This is a local-only immutable fixture: production
-- destination writes still require the DSH finance maker/approver workflow.
INSERT INTO wlt_payout_destinations (
    id,
    operator_context_id,
    partner_id,
    owner_actor_id,
    owner_actor_type,
    beneficiary_name,
    destination_reference_encrypted,
    official_wallet_provider_key,
    destination_method,
    masked_destination_reference,
    destination_verification_status,
    destination_version,
    material_identity_hash,
    active,
    created_by_actor_id,
    destination_verified_at,
    destination_verified_by_operator_id
)
SELECT
    'wlt-936-field-destination-' || '@@FIELD_ACTOR_ID@@',
    'local-dsh',
    '@@FIELD_ACTOR_ID@@',
    '@@FIELD_ACTOR_ID@@',
    'field',
    'BThwani Local Field Agent',
    pgp_sym_encrypt(
        'LOCAL-FIELD-DESTINATION-@@FIELD_ACTOR_ID@@',
        '@@WLT_PAYOUT_ENCRYPTION_KEY@@'
    ),
    'bthwani_local_wallet',
    'official_wallet',
    '********' || right('@@FIELD_ACTOR_ID@@', 4),
    'verified',
    1,
    encode(
        digest(
            'local-dsh' || E'\\x1f' || 'field' || E'\\x1f' || '@@FIELD_ACTOR_ID@@' || E'\\x1f' ||
            'bthwani_local_wallet' || E'\\x1f' || 'LOCAL-FIELD-DESTINATION-@@FIELD_ACTOR_ID@@' || E'\\x1f' ||
            'BThwani Local Field Agent',
            'sha256'
        ),
        'hex'
    ),
    TRUE,
    'local-seed-finance-maker',
    NOW(),
    'local-seed-finance-verifier'
WHERE NOT EXISTS (
    SELECT 1
    FROM wlt_payout_destinations
    WHERE operator_context_id = 'local-dsh'
      AND owner_actor_type = 'field'
      AND owner_actor_id = '@@FIELD_ACTOR_ID@@'
      AND active = TRUE
);

INSERT INTO wlt_payout_audit_events (
    aggregate_type,
    aggregate_id,
    action,
    actor_id,
    actor_type,
    reason,
    correlation_id,
    metadata,
    operator_context_id
)
SELECT 'payout_destination', destination.id, audit.action, audit.actor_id, 'operator', audit.reason,
       audit.correlation_id, audit.metadata, 'local-dsh'
FROM wlt_payout_destinations AS destination
CROSS JOIN (VALUES
    ('destination.version_created', 'local-seed-finance-maker', 'Local representative finance readback fixture', 'wlt-936-field-destination-create', '{"destinationVersion":1}'::jsonb),
    ('destination.verified', 'local-seed-finance-verifier', 'Local representative finance readback fixture', 'wlt-936-field-destination-verify', '{"destinationVersion":1}'::jsonb)
) AS audit(action, actor_id, reason, correlation_id, metadata)
WHERE destination.operator_context_id = 'local-dsh'
  AND destination.owner_actor_type = 'field'
  AND destination.owner_actor_id = '@@FIELD_ACTOR_ID@@'
  AND NOT EXISTS (
      SELECT 1
      FROM wlt_payout_audit_events existing
      WHERE existing.operator_context_id = 'local-dsh'
        AND existing.aggregate_type = 'payout_destination'
        AND existing.aggregate_id = destination.id
        AND existing.action = audit.action
  );

INSERT INTO wlt_wallets (
    operator_context_id,
    actor_id,
    actor_type,
    status,
    currency
) VALUES (
    'local-dsh',
    'partner-dev-0001',
    'partner',
    'active',
    'YER'
)
ON CONFLICT (operator_context_id, actor_type, actor_id) DO UPDATE
SET status = EXCLUDED.status,
    currency = EXCLUDED.currency,
    updated_at = NOW()
WHERE wlt_wallets.status IS DISTINCT FROM EXCLUDED.status
   OR wlt_wallets.currency IS DISTINCT FROM EXCLUDED.currency;
