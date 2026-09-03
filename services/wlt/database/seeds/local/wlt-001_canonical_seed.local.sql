-- Canonical WLT Local Seed Baseline (Epoch 2)
-- Unified development fixtures for wallet policies, official providers, collateral, commission, and reference smoke.

-- ===========================================================================
-- Source fixture: wlt-905_dispatch_financial_eligibility_policy.local.sql
-- ===========================================================================
-- Local-only governed WLT dispatch policy for the canonical captain bootstrap.
-- The local collateral top-up is the complete development balance, so no extra
-- dispatch/COD balance is required; production thresholds remain WLT-owned policy.
INSERT INTO wlt_dispatch_financial_eligibility_policies (
    operator_context_id,
    enabled,
    require_active_wallet,
    minimum_dispatch_balance_minor_units,
    minimum_cod_balance_minor_units,
    currency,
    decision_ttl_seconds,
    policy_version,
    updated_by
) VALUES (
    'local-dsh',
    TRUE,
    TRUE,
    0,
    0,
    'YER',
    120,
    'local-dispatch-financial-v1',
    'seed:wlt-905-local-dispatch-financial-policy'
)
ON CONFLICT (operator_context_id) DO UPDATE
SET enabled = EXCLUDED.enabled,
    require_active_wallet = EXCLUDED.require_active_wallet,
    minimum_dispatch_balance_minor_units = EXCLUDED.minimum_dispatch_balance_minor_units,
    minimum_cod_balance_minor_units = EXCLUDED.minimum_cod_balance_minor_units,
    currency = EXCLUDED.currency,
    decision_ttl_seconds = EXCLUDED.decision_ttl_seconds,
    policy_version = EXCLUDED.policy_version,
    updated_by = EXCLUDED.updated_by,
    updated_at = NOW()
WHERE wlt_dispatch_financial_eligibility_policies.enabled IS DISTINCT FROM EXCLUDED.enabled
   OR wlt_dispatch_financial_eligibility_policies.require_active_wallet IS DISTINCT FROM EXCLUDED.require_active_wallet
   OR wlt_dispatch_financial_eligibility_policies.minimum_dispatch_balance_minor_units IS DISTINCT FROM EXCLUDED.minimum_dispatch_balance_minor_units
   OR wlt_dispatch_financial_eligibility_policies.minimum_cod_balance_minor_units IS DISTINCT FROM EXCLUDED.minimum_cod_balance_minor_units
   OR wlt_dispatch_financial_eligibility_policies.currency IS DISTINCT FROM EXCLUDED.currency
   OR wlt_dispatch_financial_eligibility_policies.decision_ttl_seconds IS DISTINCT FROM EXCLUDED.decision_ttl_seconds
   OR wlt_dispatch_financial_eligibility_policies.policy_version IS DISTINCT FROM EXCLUDED.policy_version
   OR wlt_dispatch_financial_eligibility_policies.updated_by IS DISTINCT FROM EXCLUDED.updated_by;


-- ===========================================================================
-- Source fixture: wlt-914_official_wallet_provider.local.sql
-- ===========================================================================
-- Local-only governed provider registry for the canonical WLT payout-destination
-- runtime smoke. Production provider onboarding remains a finance-control-plane
-- operation; this fixture only declares the local provider identity required by
-- that same boundary.
INSERT INTO wlt_official_wallet_providers (
    operator_context_id,
    provider_key,
    display_name,
    active
) VALUES (
    'local-dsh',
    'bthwani_local_wallet',
    'BThwani Local Official Wallet',
    TRUE
)
ON CONFLICT (operator_context_id, provider_key) DO UPDATE
SET display_name = EXCLUDED.display_name,
    active = EXCLUDED.active,
    updated_at = NOW()
WHERE wlt_official_wallet_providers.display_name IS DISTINCT FROM EXCLUDED.display_name
   OR wlt_official_wallet_providers.active IS DISTINCT FROM EXCLUDED.active;


-- ===========================================================================
-- Source fixture: wlt-935_captain_collateral_policy.local.sql
-- ===========================================================================
-- Local-only governed WLT policy required before the local captain wallet is materialized.
-- Production policy remains owned by the WLT policy API; this fixture only supplies
-- deterministic development truth for the governed bootstrap flow.
INSERT INTO wlt_captain_collateral_policies (
    operator_context_id,
    policy_id,
    policy_version,
    enabled,
    minimum_collateral_minor_units,
    currency,
    change_reason,
    updated_by_actor_id
) VALUES (
    'local-dsh',
    'local-captain-collateral-v1',
    1,
    TRUE,
    1000,
    'YER',
    'Governed local development captain collateral policy.',
    'seed:wlt-935-local-captain-collateral'
)
ON CONFLICT (operator_context_id) DO UPDATE
SET policy_id = EXCLUDED.policy_id,
    enabled = EXCLUDED.enabled,
    minimum_collateral_minor_units = EXCLUDED.minimum_collateral_minor_units,
    currency = EXCLUDED.currency,
    change_reason = EXCLUDED.change_reason,
    updated_by_actor_id = EXCLUDED.updated_by_actor_id,
    policy_version = wlt_captain_collateral_policies.policy_version + 1,
    updated_at = NOW()
WHERE wlt_captain_collateral_policies.policy_id IS DISTINCT FROM EXCLUDED.policy_id
   OR wlt_captain_collateral_policies.enabled IS DISTINCT FROM EXCLUDED.enabled
   OR wlt_captain_collateral_policies.minimum_collateral_minor_units IS DISTINCT FROM EXCLUDED.minimum_collateral_minor_units
   OR wlt_captain_collateral_policies.currency IS DISTINCT FROM EXCLUDED.currency
   OR wlt_captain_collateral_policies.change_reason IS DISTINCT FROM EXCLUDED.change_reason
   OR wlt_captain_collateral_policies.updated_by_actor_id IS DISTINCT FROM EXCLUDED.updated_by_actor_id;


-- ===========================================================================
-- Source fixture: wlt-937_captain_delivery_commission_policy.local.sql
-- ===========================================================================
-- Local-only WLT policy for the end-to-end DSH delivery proof matrix.
-- Production commission rates remain finance-owned and must be configured through
-- the governed policy endpoint; this fixture makes the local integration contract
-- executable without introducing a runtime fallback or caller-supplied amount.
UPDATE wlt_commission_policy_versions
SET status = 'inactive'
WHERE operator_context_id = 'local-dsh'
  AND commission_type = 'delivery_fee'
  AND source_type = 'order'
  AND beneficiary_actor_type = 'captain'
  AND policy_id <> 'local-captain-delivery-fee';

INSERT INTO wlt_commission_policy_versions (
    operator_context_id,
    policy_id,
    version,
    commission_type,
    source_type,
    beneficiary_actor_type,
    calculation_type,
    fixed_amount_minor_units,
    basis_points,
    minimum_amount_minor_units,
    maximum_amount_minor_units,
    currency,
    status,
    change_reason,
    updated_by_actor_id
) VALUES (
    'local-dsh',
    'local-captain-delivery-fee',
    1,
    'delivery_fee',
    'order',
    'captain',
    'basis_points',
    0,
    10000,
    0,
    NULL,
    'YER',
    'active',
    'local end-to-end delivery completion proof',
    'seed:wlt-937-local-captain-delivery-policy'
)
ON CONFLICT (operator_context_id, policy_id, version) DO UPDATE
SET commission_type = EXCLUDED.commission_type,
    source_type = EXCLUDED.source_type,
    beneficiary_actor_type = EXCLUDED.beneficiary_actor_type,
    calculation_type = EXCLUDED.calculation_type,
    fixed_amount_minor_units = EXCLUDED.fixed_amount_minor_units,
    basis_points = EXCLUDED.basis_points,
    minimum_amount_minor_units = EXCLUDED.minimum_amount_minor_units,
    maximum_amount_minor_units = EXCLUDED.maximum_amount_minor_units,
    currency = EXCLUDED.currency,
    status = EXCLUDED.status,
    change_reason = EXCLUDED.change_reason,
    updated_by_actor_id = EXCLUDED.updated_by_actor_id;


-- ===========================================================================
-- Source fixture: wlt-936_authenticated_reference_smoke.local.sql
-- ===========================================================================
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


