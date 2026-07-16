-- WLT Foundation local seed: financial reference data for DSH store-linked orders and actors.

-- Payment status references (one per sample order)
INSERT INTO wlt_payment_status_refs (id, order_id, status)
VALUES
  ('wlt-psr-0001', 'order-dev-0001', 'captured'),
  ('wlt-psr-0002', 'order-dev-0002', 'pending'),
  ('wlt-psr-0003', 'order-dev-0003', 'failed'),
  ('wlt-psr-0004', 'order-dev-0004', 'refunded')
ON CONFLICT (id) DO NOTHING;

-- Settlement status references
INSERT INTO wlt_settlement_status_refs (id, order_id, status)
VALUES
  ('wlt-ssr-0001', 'order-dev-0001', 'settled'),
  ('wlt-ssr-0002', 'order-dev-0002', 'pending'),
  ('wlt-ssr-0003', 'order-dev-0003', 'failed'),
  ('wlt-ssr-0004', 'order-dev-0004', 'processing')
ON CONFLICT (id) DO NOTHING;

-- Refund status references
INSERT INTO wlt_refund_status_refs (id, order_id, status)
VALUES
  ('wlt-rsr-0001', 'order-dev-0001', 'none'),
  ('wlt-rsr-0002', 'order-dev-0002', 'none'),
  ('wlt-rsr-0003', 'order-dev-0003', 'none'),
  ('wlt-rsr-0004', 'order-dev-0004', 'completed')
ON CONFLICT (id) DO NOTHING;

-- Wallet status references (partner/captain/field actors linked to DSH stores)
INSERT INTO wlt_wallet_refs (id, actor_id, actor_type, status, currency)
VALUES
  ('wlt-wr-0001', 'partner-dev-0001', 'partner',  'active',    'YER'),
  ('wlt-wr-0002', 'partner-dev-0002', 'partner',  'suspended', 'YER'),
  ('wlt-wr-0003', 'captain-dev-0001', 'captain',  'active',    'YER'),
  ('wlt-wr-0004', 'captain-dev-0002', 'captain',  'frozen',    'YER'),
  ('wlt-wr-0005', 'field-dev-0001',   'field',    'active',    'YER'),
  ('wlt-wr-0006', 'client-dev-0001',  'client',   'active',    'YER')
ON CONFLICT (id) DO NOTHING;

-- Field commission status references
INSERT INTO wlt_field_commission_refs (id, partner_id, partner_name, amount_minor_units, currency, status, description, evidence_required, settled_at)
VALUES
  ('wlt-fcr-0001', 'partner-dev-0001', 'متجر النور التجاري', 1500000, 'YER', 'eligible_pending_review', 'عمولة تأهيل شريك ميداني معلقة المراجعة', false, NULL),
  ('wlt-fcr-0002', 'partner-dev-0002', 'مخبز البركة الحديث', 2000000, 'YER', 'settled', 'تم تسوية عمولة تأهيل الشريك الميداني بالكامل بنجاح', false, '2026-07-01 12:00:00+03')
ON CONFLICT (id) DO NOTHING;

