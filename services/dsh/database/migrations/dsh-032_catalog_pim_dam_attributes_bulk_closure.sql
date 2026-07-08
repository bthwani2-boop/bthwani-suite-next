-- DSH-032: Catalog PIM/DAM/attributes/collections/audit closure.
--
-- Extends the dsh-030 sovereign catalog with the pieces required for a real
-- PIM: a governed media/DAM layer (assets + entity links), product
-- attributes/facets, collections/campaigns, a proposal audit trail, and
-- duplicate-candidate tracking. Does not alter dsh-030/dsh-031 tables except
-- to add optional fallback asset pointers for fast reads.

-- ---------------------------------------------------------------------------
-- 1. dsh_catalog_assets (DAM)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dsh_catalog_assets (
  id                  TEXT        PRIMARY KEY,
  object_key          TEXT        NOT NULL,
  public_url          TEXT,
  original_file_name  TEXT        NOT NULL DEFAULT '',
  mime_type           TEXT        NOT NULL,
  size_bytes          BIGINT      NOT NULL DEFAULT 0,
  width               INTEGER,
  height              INTEGER,
  checksum_sha256     TEXT,
  alt_ar              TEXT        NOT NULL DEFAULT '',
  alt_en              TEXT        NOT NULL DEFAULT '',
  dominant_color      TEXT,
  status              TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN
                          ('draft', 'uploaded', 'pending_review', 'approved', 'rejected', 'archived')),
  source_surface      TEXT        NOT NULL CHECK (source_surface IN
                          ('control-panel-catalog', 'control-panel-platform', 'app-partner', 'app-field', 'system')),
  uploaded_by         TEXT        NOT NULL DEFAULT '',
  reviewed_by         TEXT,
  review_note         TEXT        NOT NULL DEFAULT '',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_catalog_assets_status
  ON dsh_catalog_assets (status, created_at DESC);

-- ---------------------------------------------------------------------------
-- 2. dsh_catalog_asset_links (which entity uses which asset, in which role)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dsh_catalog_asset_links (
  id           TEXT        PRIMARY KEY,
  asset_id     TEXT        NOT NULL REFERENCES dsh_catalog_assets(id),
  entity_type  TEXT        NOT NULL CHECK (entity_type IN
                    ('domain', 'node', 'master_product', 'product_proposal', 'store_assortment', 'collection', 'campaign')),
  entity_id    TEXT        NOT NULL,
  role         TEXT        NOT NULL CHECK (role IN
                    ('icon', 'cover', 'thumbnail', 'gallery', 'canonical_product_image',
                     'partner_custom_product_image', 'marketing_banner', 'document')),
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  is_primary   BOOLEAN     NOT NULL DEFAULT FALSE,
  status       TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN
                    ('draft', 'pending_review', 'approved', 'rejected', 'archived')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (entity_type, entity_id, role, asset_id)
);

CREATE INDEX IF NOT EXISTS idx_dsh_catalog_asset_links_entity
  ON dsh_catalog_asset_links (entity_type, entity_id, role, sort_order);
CREATE INDEX IF NOT EXISTS idx_dsh_catalog_asset_links_asset
  ON dsh_catalog_asset_links (asset_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_catalog_asset_links_primary
  ON dsh_catalog_asset_links (entity_type, entity_id, role) WHERE is_primary = TRUE;

-- ---------------------------------------------------------------------------
-- 3. dsh_catalog_attributes / options / node rules / product values
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dsh_catalog_attributes (
  id               TEXT        PRIMARY KEY,
  code             TEXT        NOT NULL UNIQUE,
  name_ar          TEXT        NOT NULL,
  name_en          TEXT        NOT NULL DEFAULT '',
  data_type        TEXT        NOT NULL CHECK (data_type IN
                        ('text', 'number', 'boolean', 'enum', 'multi_enum', 'measurement', 'money', 'date', 'media')),
  is_filterable    BOOLEAN     NOT NULL DEFAULT FALSE,
  is_required      BOOLEAN     NOT NULL DEFAULT FALSE,
  is_variant_axis  BOOLEAN     NOT NULL DEFAULT FALSE,
  is_global        BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order       INTEGER     NOT NULL DEFAULT 0,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dsh_catalog_attribute_options (
  id           TEXT        PRIMARY KEY,
  attribute_id TEXT        NOT NULL REFERENCES dsh_catalog_attributes(id),
  code         TEXT        NOT NULL,
  label_ar     TEXT        NOT NULL,
  label_en     TEXT        NOT NULL DEFAULT '',
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  UNIQUE (attribute_id, code)
);

CREATE TABLE IF NOT EXISTS dsh_catalog_node_attribute_rules (
  id               TEXT    PRIMARY KEY,
  node_id          TEXT    REFERENCES dsh_catalog_nodes(id),
  domain_id        TEXT    REFERENCES dsh_catalog_domains(id),
  attribute_id     TEXT    NOT NULL REFERENCES dsh_catalog_attributes(id),
  is_required      BOOLEAN NOT NULL DEFAULT FALSE,
  is_filterable    BOOLEAN NOT NULL DEFAULT FALSE,
  is_variant_axis  BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  CHECK ((node_id IS NOT NULL) OR (domain_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_dsh_catalog_node_attribute_rules_node
  ON dsh_catalog_node_attribute_rules (node_id);
CREATE INDEX IF NOT EXISTS idx_dsh_catalog_node_attribute_rules_domain
  ON dsh_catalog_node_attribute_rules (domain_id);

CREATE TABLE IF NOT EXISTS dsh_master_product_attribute_values (
  id                TEXT        PRIMARY KEY,
  master_product_id TEXT        NOT NULL REFERENCES dsh_master_products(id),
  attribute_id      TEXT        NOT NULL REFERENCES dsh_catalog_attributes(id),
  value_json        JSONB       NOT NULL,
  locale            TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (master_product_id, attribute_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_dsh_master_product_attribute_values_product
  ON dsh_master_product_attribute_values (master_product_id);
CREATE INDEX IF NOT EXISTS idx_dsh_master_product_attribute_values_gin
  ON dsh_master_product_attribute_values USING GIN (value_json);

-- ---------------------------------------------------------------------------
-- 4. dsh_catalog_collections / collection items (campaigns, curated sets)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dsh_catalog_collections (
  id             TEXT        PRIMARY KEY,
  slug           TEXT        NOT NULL UNIQUE,
  name_ar        TEXT        NOT NULL,
  name_en        TEXT        NOT NULL DEFAULT '',
  description_ar TEXT        NOT NULL DEFAULT '',
  type           TEXT        NOT NULL CHECK (type IN
                      ('campaign', 'seasonal', 'curated', 'offer_bundle', 'smart_collection')),
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  starts_at      TIMESTAMPTZ,
  ends_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dsh_catalog_collection_items (
  id                 TEXT    PRIMARY KEY,
  collection_id      TEXT    NOT NULL REFERENCES dsh_catalog_collections(id),
  master_product_id  TEXT    NOT NULL REFERENCES dsh_master_products(id),
  sort_order         INTEGER NOT NULL DEFAULT 0,
  UNIQUE (collection_id, master_product_id)
);

CREATE INDEX IF NOT EXISTS idx_dsh_catalog_collection_items_collection
  ON dsh_catalog_collection_items (collection_id, sort_order);

-- ---------------------------------------------------------------------------
-- 5. dsh_product_proposal_audit (append-only transition trail)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dsh_product_proposal_audit (
  id           TEXT        PRIMARY KEY,
  proposal_id  TEXT        NOT NULL REFERENCES dsh_product_proposals(id),
  from_status  TEXT,
  to_status    TEXT        NOT NULL,
  actor_id     TEXT        NOT NULL,
  actor_role   TEXT        NOT NULL,
  note         TEXT        NOT NULL DEFAULT '',
  payload_json JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_product_proposal_audit_proposal
  ON dsh_product_proposal_audit (proposal_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 6. dsh_product_duplicate_candidates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dsh_product_duplicate_candidates (
  id                          TEXT          PRIMARY KEY,
  proposal_id                 TEXT          REFERENCES dsh_product_proposals(id),
  candidate_master_product_id TEXT          REFERENCES dsh_master_products(id),
  reason                      TEXT          NOT NULL,
  score                       NUMERIC(6,4)  NOT NULL DEFAULT 0,
  status                      TEXT          NOT NULL DEFAULT 'pending' CHECK (status IN
                                   ('pending', 'accepted_existing', 'rejected_not_duplicate', 'merged')),
  reviewed_by                 TEXT,
  reviewed_at                 TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_product_duplicate_candidates_proposal
  ON dsh_product_duplicate_candidates (proposal_id, status);

-- ---------------------------------------------------------------------------
-- 7. Platform policy expansion (media/quality/manual-request/source gates)
-- ---------------------------------------------------------------------------
ALTER TABLE dsh_catalog_platform_policies ADD COLUMN IF NOT EXISTS requires_marketing_review BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE dsh_catalog_platform_policies ADD COLUMN IF NOT EXISTS requires_product_image BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE dsh_catalog_platform_policies ADD COLUMN IF NOT EXISTS requires_category_image BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE dsh_catalog_platform_policies ADD COLUMN IF NOT EXISTS requires_description BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE dsh_catalog_platform_policies ADD COLUMN IF NOT EXISTS requires_brand BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE dsh_catalog_platform_policies ADD COLUMN IF NOT EXISTS requires_unit BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE dsh_catalog_platform_policies ADD COLUMN IF NOT EXISTS product_data_quality_minimum_score NUMERIC(5,2) NOT NULL DEFAULT 0;
ALTER TABLE dsh_catalog_platform_policies ADD COLUMN IF NOT EXISTS max_gallery_images INTEGER NOT NULL DEFAULT 6;
ALTER TABLE dsh_catalog_platform_policies ADD COLUMN IF NOT EXISTS manual_request_mode BOOLEAN NOT NULL DEFAULT FALSE;

-- ---------------------------------------------------------------------------
-- 8. Seed: global attributes usable across domains (extend, don't hardcode)
-- ---------------------------------------------------------------------------
INSERT INTO dsh_catalog_attributes (id, code, name_ar, name_en, data_type, is_filterable, is_global, sort_order) VALUES
  ('attr-brand',      'brand',      'العلامة التجارية', 'Brand',      'text',        TRUE,  TRUE, 10),
  ('attr-weight',     'weight',     'الوزن',            'Weight',     'measurement', TRUE,  TRUE, 20),
  ('attr-color',      'color',      'اللون',            'Color',      'enum',        TRUE,  TRUE, 30),
  ('attr-expiry_date','expiry_date','تاريخ الانتهاء',    'Expiry Date','date',        FALSE, TRUE, 40)
ON CONFLICT (id) DO NOTHING;
