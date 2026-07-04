-- DSH-020: Partner marketing offers backend activation.
-- Backs partner-submitted offers (app-partner PromotionsScreen) and the
-- control-panel Marketing Command Deck partner-offer review queue
-- (previously isBackedByApi:false with mutating actions disabled).
-- Governed lifecycle: inbound -> review -> marketing-ready -> published <-> paused,
-- or -> rejected (requires rejection_reason), or -> archived (soft, terminal).
-- Audited via the shared dsh_marketing_audit_events table.

CREATE TABLE IF NOT EXISTS dsh_partner_offers (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title              TEXT        NOT NULL,
  partner_name       TEXT        NOT NULL DEFAULT '',
  store_id           UUID        NOT NULL,
  store_label        TEXT        NOT NULL DEFAULT '',
  product_id         TEXT        NOT NULL DEFAULT '',
  product_label      TEXT        NOT NULL DEFAULT '',
  category           TEXT        NOT NULL DEFAULT '',
  offer_type         TEXT        NOT NULL DEFAULT 'discount' CHECK (offer_type IN ('discount','free-delivery','bundle','buy-x-get-y','coupon')),
  status             TEXT        NOT NULL DEFAULT 'inbound'  CHECK (status IN ('inbound','review','marketing-ready','published','paused','rejected','archived')),
  source             TEXT        NOT NULL DEFAULT 'partner'  CHECK (source IN ('partner','control-panel')),
  value_label        TEXT        NOT NULL,
  eligibility        TEXT        NOT NULL DEFAULT 'all',
  active_from_date   TEXT        NOT NULL DEFAULT '',
  active_to_date     TEXT        NOT NULL DEFAULT '',
  rejection_reason   TEXT        NOT NULL DEFAULT '',
  margin_risk_note   TEXT        NOT NULL DEFAULT '',
  version            INTEGER     NOT NULL DEFAULT 1,
  linked_campaign_id UUID        REFERENCES dsh_marketing_campaigns(id),
  created_by         TEXT,
  created_by_surface TEXT        NOT NULL DEFAULT 'app-partner',
  archived_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_partner_offers_store_status
  ON dsh_partner_offers (store_id, status);

CREATE INDEX IF NOT EXISTS idx_dsh_partner_offers_status_created
  ON dsh_partner_offers (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dsh_partner_offers_active
  ON dsh_partner_offers (status)
  WHERE archived_at IS NULL;
