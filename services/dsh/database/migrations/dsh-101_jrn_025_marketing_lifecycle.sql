-- JRN-025: campaigns, tickers and partner-offer lifecycle closure.
-- Adds optimistic concurrency, schedule and regional-targeting constraints while
-- preserving soft-archive and audit history.

ALTER TABLE dsh_marketing_campaigns
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE dsh_marketing_campaigns
  ADD COLUMN IF NOT EXISTS target_city_code TEXT;
ALTER TABLE dsh_marketing_campaigns
  ADD COLUMN IF NOT EXISTS target_service_area_code TEXT;

ALTER TABLE dsh_marketing_campaigns
  DROP CONSTRAINT IF EXISTS dsh_marketing_campaigns_audience_chk;
ALTER TABLE dsh_marketing_campaigns
  ADD CONSTRAINT dsh_marketing_campaigns_audience_chk
  CHECK (audience IN ('all','client','partner','captain','field'));

ALTER TABLE dsh_marketing_campaigns
  DROP CONSTRAINT IF EXISTS dsh_marketing_campaigns_schedule_chk;
ALTER TABLE dsh_marketing_campaigns
  ADD CONSTRAINT dsh_marketing_campaigns_schedule_chk
  CHECK (
    (COALESCE(start_date, '') = '' AND COALESCE(end_date, '') = '')
    OR (
      start_date ~ '^\d{4}-\d{2}-\d{2}$'
      AND end_date ~ '^\d{4}-\d{2}-\d{2}$'
      AND end_date > start_date
    )
  );

ALTER TABLE dsh_marketing_campaigns
  DROP CONSTRAINT IF EXISTS dsh_marketing_campaigns_placement_chk;
ALTER TABLE dsh_marketing_campaigns
  ADD CONSTRAINT dsh_marketing_campaigns_placement_chk
  CHECK (placement IS NULL OR placement IN ('home','hero','feed','floating','banner','store-card'));

ALTER TABLE dsh_marketing_campaigns
  DROP CONSTRAINT IF EXISTS dsh_marketing_campaigns_region_chk;
ALTER TABLE dsh_marketing_campaigns
  ADD CONSTRAINT dsh_marketing_campaigns_region_chk
  CHECK (
    (target_city_code IS NULL OR target_city_code ~ '^[A-Za-z0-9._:-]{1,64}$')
    AND (target_service_area_code IS NULL OR target_service_area_code ~ '^[A-Za-z0-9._:-]{1,64}$')
  );

CREATE INDEX IF NOT EXISTS idx_dsh_marketing_campaigns_active_window
  ON dsh_marketing_campaigns (status, start_date, end_date)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_dsh_marketing_campaigns_region
  ON dsh_marketing_campaigns (target_city_code, target_service_area_code, status)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_dsh_marketing_campaigns_version
  ON dsh_marketing_campaigns (id, version)
  WHERE archived_at IS NULL;

ALTER TABLE dsh_partner_offers
  DROP CONSTRAINT IF EXISTS dsh_partner_offers_eligibility_chk;
ALTER TABLE dsh_partner_offers
  ADD CONSTRAINT dsh_partner_offers_eligibility_chk
  CHECK (eligibility IN ('all','client'));

ALTER TABLE dsh_partner_offers
  DROP CONSTRAINT IF EXISTS dsh_partner_offers_schedule_chk;
ALTER TABLE dsh_partner_offers
  ADD CONSTRAINT dsh_partner_offers_schedule_chk
  CHECK (
    (active_from_date = '' AND active_to_date = '')
    OR (
      active_from_date ~ '^\d{4}-\d{2}-\d{2}$'
      AND active_to_date ~ '^\d{4}-\d{2}-\d{2}$'
      AND active_to_date > active_from_date
    )
  );

ALTER TABLE dsh_partner_offers
  DROP CONSTRAINT IF EXISTS dsh_partner_offers_rejection_reason_chk;
ALTER TABLE dsh_partner_offers
  ADD CONSTRAINT dsh_partner_offers_rejection_reason_chk
  CHECK (status <> 'rejected' OR BTRIM(rejection_reason) <> '');

CREATE INDEX IF NOT EXISTS idx_dsh_partner_offers_client_projection
  ON dsh_partner_offers (status, active_from_date, active_to_date, store_id)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_dsh_partner_offers_version
  ON dsh_partner_offers (id, version)
  WHERE archived_at IS NULL;
