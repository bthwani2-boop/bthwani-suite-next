-- DSH-015: Partner Store Activation
-- Full partner entity lifecycle: draft → submission → review → activation → client visibility.
-- dsh_admin_partner_activations (DSH-014) tracks lightweight admin transitions only.
-- This migration owns the canonical partner profile and the 18-state lifecycle.

-- ─── Partner entity ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dsh_partners (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Legal identity
  legal_name_ar          TEXT        NOT NULL,
  legal_name_en          TEXT        NOT NULL DEFAULT '',
  display_name           TEXT        NOT NULL,
  legal_identity_type    TEXT        NOT NULL
    CHECK (legal_identity_type IN ('national_id', 'commercial_registration', 'other')),
  legal_identity_number  TEXT        NOT NULL,
  owner_name             TEXT        NOT NULL,
  primary_phone          TEXT        NOT NULL,
  secondary_phone        TEXT        NOT NULL DEFAULT '',
  email                  TEXT        NOT NULL DEFAULT '',
  category               TEXT        NOT NULL
    CHECK (category IN ('restaurant', 'grocery', 'pharmacy', 'bakery', 'other')),

  -- Lifecycle
  onboarding_status      TEXT        NOT NULL DEFAULT 'draft'
    CHECK (onboarding_status IN (
      'draft', 'submitted', 'field_visit_scheduled', 'field_visit_completed',
      'documents_missing', 'documents_uploaded', 'documents_verified',
      'catalog_not_ready', 'catalog_ready',
      'delivery_modes_not_ready', 'delivery_modes_ready',
      'ops_review', 'ops_approved', 'ops_rejected',
      'partner_active', 'partner_deactivated', 'client_visible', 'client_hidden'
    )),

  -- Rejection / block
  rejection_reason       TEXT        NOT NULL DEFAULT '',

  -- Actor references
  created_by             TEXT        NOT NULL DEFAULT '',
  assigned_field_agent   TEXT        NOT NULL DEFAULT '',

  -- Optimistic locking
  version                INTEGER     NOT NULL DEFAULT 1,

  -- Idempotency
  idempotency_key        TEXT        NOT NULL DEFAULT '',

  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT dsh_partners_legal_identity_unique UNIQUE (legal_identity_number)
);

-- ─── Link stores to partners ──────────────────────────────────────────────────
ALTER TABLE dsh_stores ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES dsh_partners(id) ON DELETE SET NULL;

-- ─── Partner documents ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dsh_partner_documents (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id  UUID        NOT NULL REFERENCES dsh_partners(id) ON DELETE CASCADE,
  doc_type    TEXT        NOT NULL
    CHECK (doc_type IN (
      'national_id', 'commercial_registration', 'lease_contract',
      'health_certificate', 'other'
    )),
  status      TEXT        NOT NULL DEFAULT 'uploaded'
    CHECK (status IN ('uploaded', 'verified', 'rejected', 'replacement_requested')),
  media_ref   TEXT        NOT NULL,
  notes       TEXT        NOT NULL DEFAULT '',
  reviewed_by TEXT        NOT NULL DEFAULT '',
  reviewed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Activation events (full audit trail for status transitions) ──────────────
CREATE TABLE IF NOT EXISTS dsh_partner_activation_events (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id     UUID        NOT NULL REFERENCES dsh_partners(id) ON DELETE CASCADE,
  from_status    TEXT        NOT NULL,
  to_status      TEXT        NOT NULL,
  actor_id       TEXT        NOT NULL DEFAULT '',
  actor_surface  TEXT        NOT NULL DEFAULT 'system',
  reason         TEXT        NOT NULL DEFAULT '',
  correlation_id TEXT        NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Store visibility events ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dsh_store_visibility_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    TEXT        NOT NULL REFERENCES dsh_stores(id) ON DELETE CASCADE,
  partner_id  UUID        REFERENCES dsh_partners(id) ON DELETE SET NULL,
  event_type  TEXT        NOT NULL
    CHECK (event_type IN ('became_visible', 'became_hidden', 'deactivated')),
  reason      TEXT        NOT NULL DEFAULT '',
  actor_id    TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_dsh_partners_onboarding_status    ON dsh_partners(onboarding_status);
CREATE INDEX IF NOT EXISTS idx_dsh_partners_legal_identity        ON dsh_partners(legal_identity_number);
CREATE INDEX IF NOT EXISTS idx_dsh_partners_created_at            ON dsh_partners(created_at);
CREATE INDEX IF NOT EXISTS idx_dsh_partners_category              ON dsh_partners(category);
CREATE INDEX IF NOT EXISTS idx_dsh_partners_created_by            ON dsh_partners(created_by);

CREATE INDEX IF NOT EXISTS idx_dsh_stores_partner_id              ON dsh_stores(partner_id);

CREATE INDEX IF NOT EXISTS idx_dsh_partner_docs_partner_id        ON dsh_partner_documents(partner_id);
CREATE INDEX IF NOT EXISTS idx_dsh_partner_docs_status            ON dsh_partner_documents(status);

CREATE INDEX IF NOT EXISTS idx_dsh_partner_events_partner_id      ON dsh_partner_activation_events(partner_id);
CREATE INDEX IF NOT EXISTS idx_dsh_partner_events_created_at      ON dsh_partner_activation_events(created_at);

CREATE INDEX IF NOT EXISTS idx_dsh_store_vis_events_store_id      ON dsh_store_visibility_events(store_id);
CREATE INDEX IF NOT EXISTS idx_dsh_store_vis_events_partner_id    ON dsh_store_visibility_events(partner_id);
