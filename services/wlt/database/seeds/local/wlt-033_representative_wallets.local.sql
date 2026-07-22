-- JRN-033 local runtime evidence: representative wallets must use the same
-- actor ids and tenant that Identity's local bootstrap returns to DSH. WLT
-- remains the sole owner of these balances and ledger rows; this seed is
-- local-only, deterministic and idempotent.

-- Preserve the frozen/suspended reference actors from the foundation seed in
-- the local Identity tenant so operator negative-state lookups remain tenant
-- isolated rather than relying on legacy-unscoped rows.
UPDATE wlt_wallets
SET tenant_id = 'local-dsh'
WHERE actor_id IN ('partner-dev-0001', 'partner-dev-0002', 'captain-dev-0001', 'captain-dev-0002', 'field-dev-0001', 'client-dev-0001');

INSERT INTO wlt_wallets (
  id,
  tenant_id,
  actor_id,
  actor_type,
  status,
  currency,
  available_balance_minor_units,
  pending_balance_minor_units,
  held_balance_minor_units,
  earned_total_minor_units,
  settled_total_minor_units,
  paid_total_minor_units,
  last_ledger_entry_at,
  updated_at
)
VALUES
  ('wlt-wallet-client-local-001',  'local-dsh', 'client-local-001',  'client',  'active', 'YER', 125000, 10000,  5000, 140000, 10000,  5000, '2026-07-22T08:00:00Z', '2026-07-22T08:00:00Z'),
  ('wlt-wallet-partner-local-001', 'local-dsh', 'partner-local-001', 'partner', 'active', 'YER', 875000, 75000, 25000, 975000, 75000, 25000, '2026-07-22T08:01:00Z', '2026-07-22T08:01:00Z'),
  ('wlt-wallet-captain-local-001', 'local-dsh', 'captain-local-001', 'captain', 'active', 'YER', 215000, 30000, 10000, 255000, 30000, 10000, '2026-07-22T08:02:00Z', '2026-07-22T08:02:00Z'),
  ('wlt-wallet-field-local-001',   'local-dsh', 'field-local-001',   'field',   'active', 'YER', 165000, 20000,  5000, 190000, 20000,  5000, '2026-07-22T08:03:00Z', '2026-07-22T08:03:00Z')
ON CONFLICT (actor_type, actor_id) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  status = EXCLUDED.status,
  currency = EXCLUDED.currency,
  available_balance_minor_units = EXCLUDED.available_balance_minor_units,
  pending_balance_minor_units = EXCLUDED.pending_balance_minor_units,
  held_balance_minor_units = EXCLUDED.held_balance_minor_units,
  earned_total_minor_units = EXCLUDED.earned_total_minor_units,
  settled_total_minor_units = EXCLUDED.settled_total_minor_units,
  paid_total_minor_units = EXCLUDED.paid_total_minor_units,
  last_ledger_entry_at = EXCLUDED.last_ledger_entry_at,
  updated_at = EXCLUDED.updated_at;

INSERT INTO wlt_ledger_entries (
  id,
  tenant_id,
  entry_type,
  actor_id,
  actor_type,
  source_type,
  source_id,
  reference_id,
  reference_type,
  amount_minor_units,
  currency,
  debit_credit,
  balance_after,
  description,
  idempotency_key,
  created_at
)
VALUES
  ('wled-jrn033-client-local-001',  'local-dsh', 'wallet_credit', 'client-local-001',  'client',  'runtime_seed', 'jrn-033-client',  'jrn-033-client-credit',  'runtime_evidence', 125000, 'YER', 'credit', 125000, 'رصيد محفظة العميل المحلي لإثبات JRN-033',  'jrn-033-seed-client-local-001',  '2026-07-22T08:00:00Z'),
  ('wled-jrn033-partner-local-001', 'local-dsh', 'wallet_credit', 'partner-local-001', 'partner', 'runtime_seed', 'jrn-033-partner', 'jrn-033-partner-credit', 'runtime_evidence', 875000, 'YER', 'credit', 875000, 'رصيد محفظة الشريك المحلي لإثبات JRN-033', 'jrn-033-seed-partner-local-001', '2026-07-22T08:01:00Z'),
  ('wled-jrn033-captain-local-001', 'local-dsh', 'earning',       'captain-local-001', 'captain', 'runtime_seed', 'jrn-033-captain', 'jrn-033-captain-credit', 'runtime_evidence', 215000, 'YER', 'credit', 215000, 'أرباح الكابتن المحلية لإثبات JRN-033',           'jrn-033-seed-captain-local-001', '2026-07-22T08:02:00Z'),
  ('wled-jrn033-field-local-001',   'local-dsh', 'commission',    'field-local-001',   'field',   'runtime_seed', 'jrn-033-field',   'jrn-033-field-credit',   'runtime_evidence', 165000, 'YER', 'credit', 165000, 'عمولة الميداني المحلية لإثبات JRN-033',           'jrn-033-seed-field-local-001',   '2026-07-22T08:03:00Z')
ON CONFLICT (id) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  amount_minor_units = EXCLUDED.amount_minor_units,
  balance_after = EXCLUDED.balance_after,
  description = EXCLUDED.description,
  created_at = EXCLUDED.created_at;
