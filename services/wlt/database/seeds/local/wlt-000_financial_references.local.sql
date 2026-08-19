-- WLT Foundation local seed: financial reference data for DSH store-linked orders and actors.
-- Every live financial projection is OperatorContext-bound. Historical unscoped
-- rows are preserved only by migrations and are never current local truth.

-- Payment status references (one per sample order)
INSERT INTO wlt_payment_status_refs (id, operator_context_id, order_id, status)
VALUES
  ('wlt-psr-0001', 'local-dsh', 'order-dev-0001', 'captured'),
  ('wlt-psr-0002', 'local-dsh', 'order-dev-0002', 'pending'),
  ('wlt-psr-0003', 'local-dsh', 'order-dev-0003', 'failed'),
  ('wlt-psr-0004', 'local-dsh', 'order-dev-0004', 'refunded')
ON CONFLICT (id) DO NOTHING;

-- Settlement status references
INSERT INTO wlt_settlement_status_refs (id, operator_context_id, order_id, status)
VALUES
  ('wlt-ssr-0001', 'local-dsh', 'order-dev-0001', 'settled'),
  ('wlt-ssr-0002', 'local-dsh', 'order-dev-0002', 'pending'),
  ('wlt-ssr-0003', 'local-dsh', 'order-dev-0003', 'failed'),
  ('wlt-ssr-0004', 'local-dsh', 'order-dev-0004', 'processing')
ON CONFLICT (id) DO NOTHING;

-- Refund status references
INSERT INTO wlt_refund_status_refs (id, operator_context_id, order_id, status)
VALUES
  ('wlt-rsr-0001', 'local-dsh', 'order-dev-0001', 'none'),
  ('wlt-rsr-0002', 'local-dsh', 'order-dev-0002', 'none'),
  ('wlt-rsr-0003', 'local-dsh', 'order-dev-0003', 'none'),
  ('wlt-rsr-0004', 'local-dsh', 'order-dev-0004', 'completed')
ON CONFLICT (id) DO NOTHING;

-- Wallet status references are a compatibility view over canonical wlt_wallets.
-- Canonical representative wallets are seeded separately with OperatorContext.

-- Field commission status references
INSERT INTO wlt_field_commission_refs (id, operator_context_id, partner_id, partner_name, amount_minor_units, currency, status, description, evidence_required, settled_at)
VALUES
  ('wlt-fcr-0001', 'local-dsh', 'partner-dev-0001', 'متجر النور التجاري', 1500000, 'YER', 'eligible_pending_review', 'عمولة تأهيل شريك ميداني معلقة المراجعة', false, NULL),
  ('wlt-fcr-0002', 'local-dsh', 'partner-dev-0002', 'مخبز البركة الحديث', 2000000, 'YER', 'settled', 'تم تسوية عمولة تأهيل الشريك الميداني بالكامل بنجاح', false, '2026-07-01 12:00:00+03')
ON CONFLICT (id) DO NOTHING;
