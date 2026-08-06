-- WLT-118: Wallet Balances Projection View

DROP VIEW IF EXISTS wlt_wallet_refs CASCADE;
DROP VIEW IF EXISTS wlt_wallet_balances_view CASCADE;

CREATE OR REPLACE VIEW wlt_wallet_balances_view AS
SELECT 
    w.id,
    w.operator_context_id,
    w.actor_id, 
    w.actor_type, 
    w.status, 
    w.currency,
    
    -- held balance (payout requests)
    COALESCE((
        SELECT SUM(amount_minor_units) 
        FROM wlt_payout_requests 
        WHERE operator_context_id = w.operator_context_id 
          AND beneficiary_actor_id = w.actor_id 
          AND beneficiary_actor_type = w.actor_type 
          AND status IN ('approved', 'provider_pending', 'processing')
    ), 0) AS held_balance_minor_units,

    -- pending balance (unsettled commissions)
    COALESCE((
        SELECT SUM(amount_minor_units)
        FROM wlt_commissions
        WHERE operator_context_id = w.operator_context_id
          AND beneficiary_actor_id = w.actor_id
          AND beneficiary_actor_type = w.actor_type
          AND status IN ('pending', 'confirmed', 'eligible_pending_review', 'approved_pending_settlement')
    ), 0) AS pending_balance_minor_units,

    -- available balance: -ledger balance - held
    (COALESCE(-la.balance_minor_units, 0) - 
     COALESCE((
        SELECT SUM(amount_minor_units) 
        FROM wlt_payout_requests 
        WHERE operator_context_id = w.operator_context_id 
          AND beneficiary_actor_id = w.actor_id 
          AND beneficiary_actor_type = w.actor_type 
          AND status IN ('approved', 'provider_pending', 'processing')
    ), 0)) AS available_balance_minor_units,

    -- legacy accumulators
    COALESCE((
        SELECT SUM(amount_minor_units)
        FROM wlt_commissions
        WHERE operator_context_id = w.operator_context_id
          AND beneficiary_actor_id = w.actor_id
          AND beneficiary_actor_type = w.actor_type
          AND status IN ('pending', 'confirmed', 'settled', 'eligible_pending_review', 'approved_pending_settlement')
    ), 0) AS earned_total_minor_units,

    COALESCE((
        SELECT SUM(amount_minor_units)
        FROM wlt_commissions
        WHERE operator_context_id = w.operator_context_id
          AND beneficiary_actor_id = w.actor_id
          AND beneficiary_actor_type = w.actor_type
          AND status = 'settled'
    ), 0) AS settled_total_minor_units,

    COALESCE((
        SELECT SUM(amount_minor_units)
        FROM wlt_payout_requests
        WHERE operator_context_id = w.operator_context_id
          AND beneficiary_actor_id = w.actor_id
          AND beneficiary_actor_type = w.actor_type
          AND status = 'paid'
    ), 0) AS paid_total_minor_units,
    
    w.last_ledger_entry_at, 
    w.updated_at
FROM wlt_wallets w
LEFT JOIN wlt_ledger_accounts la 
  ON la.operator_context_id = w.operator_context_id 
 AND la.actor_type = w.actor_type 
 AND la.actor_id = w.actor_id 
 AND la.account_type = 'wallet';

CREATE OR REPLACE VIEW wlt_wallet_refs AS SELECT * FROM wlt_wallet_balances_view;