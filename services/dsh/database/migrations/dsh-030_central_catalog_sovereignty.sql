-- DSH-030: Central catalog sovereignty.
--
-- Establishes the single sovereign product/category catalog per
-- governance/catalog/CENTRAL_CATALOG_SOVEREIGNTY_DECISION.md. From this
-- migration forward:
--   - dsh_catalog_domains / dsh_catalog_nodes / dsh_master_products are the
--     only ground truth for categories and products.
--   - dsh_store_assortments is the only store-local truth (price,
--     availability, stock, note, and — policy-permitting — a local image).
--   - dsh_product_proposals is how a store/field/partner/operator surface
--     requests a new master product; it is never a sellable entity itself.
--   - dsh_catalog_platform_policies drives commission, fees, and per-category
--     capability flags so nothing is hardcoded in app-field/app-partner.
--
-- Legacy tables from dsh-002b (dsh_catalog_categories, dsh_catalog_products,
-- dsh_catalog_media, dsh_catalog_revisions, dsh_catalog_audit) are NOT
-- dropped here. They become legacy-read-only inputs to the compatibility
-- adapter (Phase 7) — no surface may create/update them after this
-- migration lands.

-- ---------------------------------------------------------------------------
-- 1. dsh_catalog_domains (L1 = BUSINESS_DOMAIN)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dsh_catalog_domains (
  id                       TEXT        PRIMARY KEY,
  slug                     TEXT        NOT NULL UNIQUE,
  name_ar                  TEXT        NOT NULL,
  name_en                  TEXT        NOT NULL DEFAULT '',
  icon                     TEXT        NOT NULL DEFAULT '',
  sort_order               INTEGER     NOT NULL DEFAULT 0,
  is_active                BOOLEAN     NOT NULL DEFAULT TRUE,
  is_client_visible        BOOLEAN     NOT NULL DEFAULT TRUE,
  requires_product_catalog BOOLEAN     NOT NULL DEFAULT TRUE,
  is_manual_request        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_catalog_domains_active_sort
  ON dsh_catalog_domains (is_active, sort_order);

-- ---------------------------------------------------------------------------
-- 2. dsh_catalog_nodes (L2 = BUSINESS_SUBDOMAIN, L3 = PRODUCT_MAIN_CLASS,
--    L4 = PRODUCT_SUB_CLASS)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dsh_catalog_nodes (
  id                                TEXT        PRIMARY KEY,
  domain_id                         TEXT        NOT NULL REFERENCES dsh_catalog_domains(id),
  parent_id                         TEXT        REFERENCES dsh_catalog_nodes(id),
  level                             TEXT        NOT NULL CHECK (level IN
                                        ('BUSINESS_SUBDOMAIN', 'PRODUCT_MAIN_CLASS', 'PRODUCT_SUB_CLASS')),
  slug                              TEXT        NOT NULL,
  name_ar                           TEXT        NOT NULL,
  name_en                           TEXT        NOT NULL DEFAULT '',
  icon                              TEXT        NOT NULL DEFAULT '',
  sort_order                        INTEGER     NOT NULL DEFAULT 0,
  is_active                         BOOLEAN     NOT NULL DEFAULT TRUE,
  is_client_visible                 BOOLEAN     NOT NULL DEFAULT TRUE,
  requires_barcode                  BOOLEAN     NOT NULL DEFAULT FALSE,
  allows_product_proposal           BOOLEAN     NOT NULL DEFAULT TRUE,
  allows_store_product_custom_image BOOLEAN     NOT NULL DEFAULT FALSE,
  requires_catalog_review           BOOLEAN     NOT NULL DEFAULT TRUE,
  requires_product_catalog          BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (domain_id, parent_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_dsh_catalog_nodes_domain
  ON dsh_catalog_nodes (domain_id, level, sort_order);
CREATE INDEX IF NOT EXISTS idx_dsh_catalog_nodes_parent
  ON dsh_catalog_nodes (parent_id, sort_order);

-- ---------------------------------------------------------------------------
-- 3. dsh_master_products (L5 = MASTER_PRODUCT)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dsh_master_products (
  id                        TEXT        PRIMARY KEY,
  domain_id                 TEXT        NOT NULL REFERENCES dsh_catalog_domains(id),
  category_node_id          TEXT        REFERENCES dsh_catalog_nodes(id),
  canonical_name_ar         TEXT        NOT NULL,
  canonical_name_en         TEXT        NOT NULL DEFAULT '',
  brand                     TEXT        NOT NULL DEFAULT '',
  barcode                   TEXT,
  gtin                      TEXT,
  sku                       TEXT,
  unit                      TEXT        NOT NULL DEFAULT 'unit',
  measurement_type          TEXT        NOT NULL DEFAULT 'unit',
  canonical_image_object_key TEXT,
  approval_status           TEXT        NOT NULL DEFAULT 'draft' CHECK (approval_status IN
                                ('draft', 'pending_review', 'approved', 'rejected', 'archived')),
  is_active                 BOOLEAN     NOT NULL DEFAULT TRUE,
  duplicate_group_id        TEXT,
  created_source            TEXT        NOT NULL DEFAULT 'control-panel-catalog',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_master_products_domain
  ON dsh_master_products (domain_id, category_node_id, is_active);
CREATE INDEX IF NOT EXISTS idx_dsh_master_products_approval
  ON dsh_master_products (approval_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsh_master_products_barcode
  ON dsh_master_products (barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dsh_master_products_duplicate_group
  ON dsh_master_products (duplicate_group_id) WHERE duplicate_group_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. dsh_store_assortments (store <-> master product link; the ONLY
--    store-local truth: price, availability, stock, note, local image)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dsh_store_assortments (
  id                     TEXT          PRIMARY KEY,
  store_id               TEXT          NOT NULL REFERENCES dsh_stores(id) ON DELETE CASCADE,
  master_product_id      TEXT          NOT NULL REFERENCES dsh_master_products(id),
  unit_price             NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  currency               TEXT          NOT NULL DEFAULT 'YER',
  available              BOOLEAN       NOT NULL DEFAULT TRUE,
  stock_status           TEXT          NOT NULL DEFAULT 'in_stock' CHECK (stock_status IN
                              ('in_stock', 'low_stock', 'out_of_stock')),
  local_note             TEXT          NOT NULL DEFAULT '',
  custom_image_object_key TEXT,
  publication_status     TEXT          NOT NULL DEFAULT 'draft' CHECK (publication_status IN
                              ('draft', 'submitted', 'approved', 'client_visible', 'rejected', 'hidden')),
  submitted_by           TEXT          NOT NULL DEFAULT '',
  approved_by            TEXT          NOT NULL DEFAULT '',
  created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, master_product_id)
);

CREATE INDEX IF NOT EXISTS idx_dsh_store_assortments_store
  ON dsh_store_assortments (store_id, publication_status);
CREATE INDEX IF NOT EXISTS idx_dsh_store_assortments_master_product
  ON dsh_store_assortments (master_product_id);
CREATE INDEX IF NOT EXISTS idx_dsh_store_assortments_client_visible
  ON dsh_store_assortments (publication_status, available) WHERE publication_status = 'client_visible';

-- ---------------------------------------------------------------------------
-- 5. dsh_product_proposals (request-to-add-to-master-catalog; never a
--    sellable entity)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dsh_product_proposals (
  id                       TEXT        PRIMARY KEY,
  proposed_name_ar         TEXT        NOT NULL,
  proposed_name_en         TEXT        NOT NULL DEFAULT '',
  domain_id                TEXT        NOT NULL REFERENCES dsh_catalog_domains(id),
  category_node_id         TEXT        REFERENCES dsh_catalog_nodes(id),
  brand                    TEXT        NOT NULL DEFAULT '',
  barcode                  TEXT,
  image_object_key         TEXT,
  source_surface           TEXT        NOT NULL CHECK (source_surface IN
                                ('app-field', 'app-partner', 'control-panel-catalog', 'control-panel-platform')),
  source_actor_id          TEXT        NOT NULL DEFAULT '',
  source_store_id          TEXT,
  status                   TEXT        NOT NULL DEFAULT 'submitted' CHECK (status IN
                                ('submitted', 'under_review', 'adopted', 'rejected', 'needs_fix')),
  review_note              TEXT        NOT NULL DEFAULT '',
  adopted_master_product_id TEXT       REFERENCES dsh_master_products(id),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_product_proposals_status
  ON dsh_product_proposals (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsh_product_proposals_domain
  ON dsh_product_proposals (domain_id, category_node_id);
CREATE INDEX IF NOT EXISTS idx_dsh_product_proposals_store
  ON dsh_product_proposals (source_store_id) WHERE source_store_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 6. dsh_catalog_platform_policies (per-domain / per-node / default policy;
--    drives commission, fees, image/proposal/barcode/review capability flags
--    so app-field/app-partner never hardcode them)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dsh_catalog_platform_policies (
  id                                          TEXT          PRIMARY KEY,
  domain_id                                   TEXT          REFERENCES dsh_catalog_domains(id),
  node_id                                     TEXT          REFERENCES dsh_catalog_nodes(id),
  policy_scope                                TEXT          NOT NULL CHECK (policy_scope IN
                                                   ('domain', 'node', 'default')),
  platform_commission_rate                    NUMERIC(6,4)  NOT NULL DEFAULT 0,
  field_partner_onboarding_commission_amount  NUMERIC(12,2) NOT NULL DEFAULT 0,
  field_partner_onboarding_commission_currency TEXT         NOT NULL DEFAULT 'YER',
  store_onboarding_fee_amount                 NUMERIC(12,2) NOT NULL DEFAULT 0,
  store_onboarding_fee_currency                TEXT         NOT NULL DEFAULT 'YER',
  allows_store_product_custom_image           BOOLEAN       NOT NULL DEFAULT FALSE,
  allows_product_proposal                     BOOLEAN       NOT NULL DEFAULT TRUE,
  requires_barcode                            BOOLEAN       NOT NULL DEFAULT FALSE,
  requires_catalog_review                     BOOLEAN       NOT NULL DEFAULT TRUE,
  is_active                                   BOOLEAN       NOT NULL DEFAULT TRUE,
  effective_from                              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  notes                                       TEXT          NOT NULL DEFAULT '',
  created_at                                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                                  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CHECK (
    (policy_scope = 'domain' AND domain_id IS NOT NULL AND node_id IS NULL) OR
    (policy_scope = 'node'   AND node_id IS NOT NULL) OR
    (policy_scope = 'default' AND domain_id IS NULL AND node_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_catalog_platform_policies_domain
  ON dsh_catalog_platform_policies (domain_id) WHERE policy_scope = 'domain';
CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_catalog_platform_policies_node
  ON dsh_catalog_platform_policies (node_id) WHERE policy_scope = 'node';
CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_catalog_platform_policies_default
  ON dsh_catalog_platform_policies ((1)) WHERE policy_scope = 'default';

-- One platform-wide default policy row. Resolution order for any node is:
-- node-scoped policy -> domain-scoped policy -> this default row.
INSERT INTO dsh_catalog_platform_policies (id, policy_scope, notes)
VALUES ('default-policy', 'default', 'Platform-wide fallback catalog policy (dsh-030 seed).')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 7. Seed: BUSINESS_DOMAIN (L1)
-- ---------------------------------------------------------------------------
INSERT INTO dsh_catalog_domains (id, slug, name_ar, name_en, sort_order, requires_product_catalog, is_manual_request) VALUES
  ('domain-restaurants',    'restaurants',    'مطاعم',          'Restaurants',    10, TRUE,  FALSE),
  ('domain-groceries',      'groceries',      'مقاضي',          'Groceries',      20, TRUE,  FALSE),
  ('domain-sweets-juices',  'sweets_juices',  'حلا وعصائر',      'Sweets & Juices',30, TRUE,  FALSE),
  ('domain-elegance',       'elegance',       'أناقتي',         'Elegance',       40, TRUE,  FALSE),
  ('domain-bthwani-store',  'bthwani_store',  'بثواني ستور',     'Bthwani Store',  50, TRUE,  FALSE),
  ('domain-home-projects',  'home_projects',  'مشاريع منزلية',   'Home Projects',  60, TRUE,  FALSE),
  ('domain-spare-parts',    'spare_parts',    'قطع غيار',        'Spare Parts',    70, TRUE,  FALSE),
  ('domain-honey-dates',    'honey_dates',    'عسل وتمور',       'Honey & Dates',  80, TRUE,  FALSE),
  ('domain-electronics',    'electronics',    'إلكترونيات',      'Electronics',    90, TRUE,  FALSE),
  ('domain-cloud-kitchens', 'cloud_kitchens', 'مطابخ سحابية',    'Cloud Kitchens', 100, TRUE, FALSE),
  ('domain-manual-request', 'manual_request', 'طلب يدوي',        'Manual Request', 110, FALSE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 8. Seed: BUSINESS_SUBDOMAIN (L2) under groceries, sweets_juices, elegance,
--    manual_request
-- ---------------------------------------------------------------------------
INSERT INTO dsh_catalog_nodes (id, domain_id, parent_id, level, slug, name_ar, name_en, sort_order, requires_product_catalog, allows_store_product_custom_image) VALUES
  -- groceries
  ('node-supermarket',        'domain-groceries', NULL, 'BUSINESS_SUBDOMAIN', 'supermarket',        'سوبر ماركت',        'Supermarket',        10, TRUE, FALSE),
  ('node-vegetables-fruits',  'domain-groceries', NULL, 'BUSINESS_SUBDOMAIN', 'vegetables_fruits',  'خضروات وفواكه',      'Vegetables & Fruits',20, TRUE, FALSE),
  ('node-meat-fish-poultry',  'domain-groceries', NULL, 'BUSINESS_SUBDOMAIN', 'meat_fish_poultry',  'لحوم وأسماك ودجاج',  'Meat, Fish & Poultry',30, TRUE, FALSE),
  ('node-roasters-spices',    'domain-groceries', NULL, 'BUSINESS_SUBDOMAIN', 'roasters_spices',    'محامص وبهارات',      'Roasters & Spices',  40, TRUE, FALSE),
  ('node-bakeries',           'domain-groceries', NULL, 'BUSINESS_SUBDOMAIN', 'bakeries',           'مخابز',             'Bakeries',           50, TRUE, TRUE),
  ('node-bundles-offers',     'domain-groceries', NULL, 'BUSINESS_SUBDOMAIN', 'bundles_offers',     'باكج عروضات',       'Bundles & Offers',   60, TRUE, TRUE),
  -- sweets_juices
  ('node-fresh-juices', 'domain-sweets-juices', NULL, 'BUSINESS_SUBDOMAIN', 'fresh_juices', 'عصائر طازجة', 'Fresh Juices', 10, TRUE, TRUE),
  ('node-sweets',       'domain-sweets-juices', NULL, 'BUSINESS_SUBDOMAIN', 'sweets',       'حلويات',      'Sweets',       20, TRUE, TRUE),
  ('node-ice-cream',    'domain-sweets-juices', NULL, 'BUSINESS_SUBDOMAIN', 'ice_cream',    'آيسكريم',     'Ice Cream',    30, TRUE, FALSE),
  -- elegance
  ('node-perfumes',           'domain-elegance', NULL, 'BUSINESS_SUBDOMAIN', 'perfumes',           'عطور',                 'Perfumes',              10, TRUE, FALSE),
  ('node-beauty-accessories', 'domain-elegance', NULL, 'BUSINESS_SUBDOMAIN', 'beauty_accessories', 'إكسسوارات وأدوات تجميل','Beauty Accessories',    20, TRUE, FALSE),
  ('node-clothing',           'domain-elegance', NULL, 'BUSINESS_SUBDOMAIN', 'clothing',           'ملابس',                'Clothing',              30, TRUE, FALSE),
  -- manual_request (no product catalog)
  ('node-shay-in', 'domain-manual-request', NULL, 'BUSINESS_SUBDOMAIN', 'shay_in', 'شيء إن', 'Shay In', 10, FALSE, FALSE),
  ('node-awnak',   'domain-manual-request', NULL, 'BUSINESS_SUBDOMAIN', 'awnak',   'عونك',   'Awnak',   20, FALSE, FALSE)
-- Conflict-arbiter note: parent_id is NULL for every BUSINESS_SUBDOMAIN row,
-- and UNIQUE treats NULLs as distinct, so (domain_id, parent_id, slug) never
-- fires for these rows — a re-run would crash into the primary key instead.
-- The seeded ids are stable, so the primary key is the correct arbiter.
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 9. Seed: default platform policies for the image-policy defaults called
--    out by governance (Phase 8). Node-scoped rows override the default row
--    above; domain-scoped rows would sit between default and node.
-- ---------------------------------------------------------------------------
INSERT INTO dsh_catalog_platform_policies (id, node_id, policy_scope, allows_store_product_custom_image, notes)
SELECT 'policy-node-' || id, id, 'node', TRUE, 'Custom store image allowed by default (dsh-030 seed).'
FROM dsh_catalog_nodes
WHERE slug IN ('bakeries', 'bundles_offers', 'fresh_juices', 'sweets')
ON CONFLICT DO NOTHING;

INSERT INTO dsh_catalog_platform_policies (id, domain_id, policy_scope, allows_store_product_custom_image, notes)
SELECT 'policy-domain-' || id, id, 'domain', TRUE, 'Custom store image allowed by default (dsh-030 seed).'
FROM dsh_catalog_domains
WHERE slug IN ('restaurants', 'cloud_kitchens', 'home_projects')
ON CONFLICT DO NOTHING;

INSERT INTO dsh_catalog_platform_policies (id, node_id, policy_scope, allows_store_product_custom_image, notes)
SELECT 'policy-node-' || id, id, 'node', FALSE, 'Custom store image disallowed by default (dsh-030 seed).'
FROM dsh_catalog_nodes
WHERE slug IN ('supermarket', 'perfumes', 'beauty_accessories', 'roasters_spices', 'meat_fish_poultry')
ON CONFLICT DO NOTHING;

INSERT INTO dsh_catalog_platform_policies (id, domain_id, policy_scope, allows_store_product_custom_image, notes)
SELECT 'policy-domain-' || id, id, 'domain', FALSE, 'Custom store image disallowed by default (dsh-030 seed).'
FROM dsh_catalog_domains
WHERE slug IN ('electronics', 'spare_parts', 'honey_dates')
ON CONFLICT DO NOTHING;
