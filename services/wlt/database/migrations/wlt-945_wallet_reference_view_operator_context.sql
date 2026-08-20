-- WLT-945: keep the legacy wallet-reference compatibility view context-complete.
--
-- WLT-011 created wlt_wallet_refs with SELECT *, before OperatorContext was
-- added to wlt_wallets. PostgreSQL freezes a view's column set, so the old
-- compatibility view silently omitted operator_context_id even after the
-- canonical table gained it. The runtime reader now uses wlt_wallets directly;
-- this migration repairs the compatibility surface for any remaining readers.
BEGIN;

DROP VIEW IF EXISTS wlt_wallet_refs;

CREATE VIEW wlt_wallet_refs AS
SELECT id,
       actor_id,
       actor_type,
       status,
       currency,
       created_at,
       updated_at,
       available_balance_minor_units,
       pending_balance_minor_units,
       held_balance_minor_units,
       earned_total_minor_units,
       settled_total_minor_units,
       paid_total_minor_units,
       last_ledger_entry_at,
       operator_context_id
FROM wlt_wallets;

COMMENT ON VIEW wlt_wallet_refs IS
  'Legacy compatibility projection; wlt_wallets is the canonical wallet read model.';

COMMIT;
