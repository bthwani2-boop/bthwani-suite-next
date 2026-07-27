-- DSH-119: immutable partner-category evidence for field commissions.
-- The category is copied from DSH partner truth when the visit completion event
-- is enqueued. WLT then selects the financial policy and amount.

ALTER TABLE dsh_field_commission_outbox
  ADD COLUMN IF NOT EXISTS partner_category text NOT NULL DEFAULT 'default';

UPDATE dsh_field_commission_outbox outbox
SET partner_category = COALESCE(NULLIF(btrim(partner.category),''),'default')
FROM dsh_partners partner
WHERE outbox.partner_id = partner.id
  AND outbox.partner_category = 'default';

CREATE INDEX IF NOT EXISTS dsh_field_commission_outbox_category_idx
  ON dsh_field_commission_outbox(partner_category, occurred_at DESC);

COMMENT ON COLUMN dsh_field_commission_outbox.partner_category IS
  'DSH-owned partner category snapshot captured at visit completion; WLT uses it only as policy evidence.';
