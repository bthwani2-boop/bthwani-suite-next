-- DSH-023: Catalog approval queue (partner submission -> marketing review ->
-- catalog adoption -> client-visible). Replaces the in-memory mock previously
-- held in services/dsh/frontend/shared/partner/partner.workflow.ts with real
-- persisted records so the partner/marketing/catalog approval workflow used
-- by app-partner and control-panel is backed by durable data.

CREATE TABLE IF NOT EXISTS dsh_catalog_approval_records (
  id           TEXT        PRIMARY KEY,
  entity_type  TEXT        NOT NULL CHECK (entity_type IN
                 ('product', 'product-media', 'category-suggestion', 'store', 'partner-offer', 'video', 'banner', 'promo')),
  entity_id    TEXT,
  source       TEXT        NOT NULL CHECK (source IN
                 ('app-partner', 'app-field', 'control-panel-partners', 'control-panel-marketing', 'control-panel-catalog', 'app-client')),
  stage        TEXT        NOT NULL CHECK (stage IN
                 ('partner-submitted', 'field-submitted', 'partner-review', 'partner-approved',
                  'marketing-review', 'marketing-approved', 'catalog-adopted', 'client-visible',
                  'rejected', 'needs-fix')),
  title        TEXT        NOT NULL,
  metadata     JSONB       NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_catalog_approval_records_stage
  ON dsh_catalog_approval_records (stage, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsh_catalog_approval_records_source
  ON dsh_catalog_approval_records (source, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsh_catalog_approval_records_entity
  ON dsh_catalog_approval_records (entity_type, entity_id);

CREATE TABLE IF NOT EXISTS dsh_catalog_approval_audit_trail (
  id                  TEXT        PRIMARY KEY,
  approval_record_id  TEXT        NOT NULL REFERENCES dsh_catalog_approval_records(id) ON DELETE CASCADE,
  from_stage          TEXT        NOT NULL,
  to_stage            TEXT        NOT NULL,
  owner               TEXT        NOT NULL,
  action_label        TEXT        NOT NULL,
  at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_catalog_approval_audit_trail_record
  ON dsh_catalog_approval_audit_trail (approval_record_id, at DESC);
