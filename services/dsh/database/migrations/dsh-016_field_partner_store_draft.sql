-- DSH-016: Field Partner Store Draft
-- App-field may collect first-store draft data during partner onboarding.
-- These fields are draft truth only; they do not publish the store to app-client.

ALTER TABLE dsh_stores
  ADD COLUMN IF NOT EXISTS address_line TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS coverage_summary TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS operating_hours TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS delivery_readiness TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS storefront_photo_ref TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS interior_photo_ref TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS signage_photo_ref TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_dsh_stores_partner_draft_lookup
  ON dsh_stores(partner_id, created_at);
