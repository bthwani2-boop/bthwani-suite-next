-- DSH-SLICE-001 publication gates and DSH-SLICE-002 storefront catalog.

ALTER TABLE dsh_stores
  ADD COLUMN IF NOT EXISTS partner_readiness text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS catalog_approval_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS marketing_visibility text NOT NULL DEFAULT 'hidden';

ALTER TABLE dsh_stores DROP CONSTRAINT IF EXISTS dsh_stores_partner_readiness_chk;
ALTER TABLE dsh_stores ADD CONSTRAINT dsh_stores_partner_readiness_chk
  CHECK (partner_readiness IN ('pending', 'ready', 'blocked'));
ALTER TABLE dsh_stores DROP CONSTRAINT IF EXISTS dsh_stores_catalog_approval_chk;
ALTER TABLE dsh_stores ADD CONSTRAINT dsh_stores_catalog_approval_chk
  CHECK (catalog_approval_status IN ('draft', 'submitted', 'approved', 'rejected'));
ALTER TABLE dsh_stores DROP CONSTRAINT IF EXISTS dsh_stores_marketing_visibility_chk;
ALTER TABLE dsh_stores ADD CONSTRAINT dsh_stores_marketing_visibility_chk
  CHECK (marketing_visibility IN ('hidden', 'visible'));

CREATE TABLE IF NOT EXISTS dsh_catalog_categories (
  id text PRIMARY KEY,
  store_id text NOT NULL REFERENCES dsh_stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, name)
);

CREATE TABLE IF NOT EXISTS dsh_catalog_products (
  id text PRIMARY KEY,
  store_id text NOT NULL REFERENCES dsh_stores(id) ON DELETE CASCADE,
  category_id text REFERENCES dsh_catalog_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  sku text NOT NULL,
  price_reference text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, sku)
);

CREATE TABLE IF NOT EXISTS dsh_catalog_media (
  id text PRIMARY KEY,
  store_id text NOT NULL REFERENCES dsh_stores(id) ON DELETE CASCADE,
  product_id text REFERENCES dsh_catalog_products(id) ON DELETE CASCADE,
  object_key text NOT NULL UNIQUE,
  content_type text NOT NULL,
  state text NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending', 'complete', 'deleted')),
  public_url text,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dsh_catalog_revisions (
  id text PRIMARY KEY,
  store_id text NOT NULL REFERENCES dsh_stores(id) ON DELETE CASCADE,
  revision integer NOT NULL,
  status text NOT NULL CHECK (status IN ('submitted', 'approved', 'rejected')),
  submitted_by text NOT NULL,
  reviewed_by text,
  review_reason text NOT NULL DEFAULT '',
  correlation_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE (store_id, revision)
);

CREATE TABLE IF NOT EXISTS dsh_catalog_audit (
  id text PRIMARY KEY,
  store_id text NOT NULL REFERENCES dsh_stores(id) ON DELETE CASCADE,
  actor_id text NOT NULL,
  actor_role text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  from_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  to_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text NOT NULL DEFAULT '',
  correlation_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dsh_catalog_categories_store
  ON dsh_catalog_categories(store_id, sort_order, name);
CREATE INDEX IF NOT EXISTS idx_dsh_catalog_products_store
  ON dsh_catalog_products(store_id, category_id, name);
CREATE INDEX IF NOT EXISTS idx_dsh_catalog_media_store
  ON dsh_catalog_media(store_id, product_id, state);
CREATE INDEX IF NOT EXISTS idx_dsh_catalog_revisions_store
  ON dsh_catalog_revisions(store_id, revision DESC);
CREATE INDEX IF NOT EXISTS idx_dsh_catalog_audit_store
  ON dsh_catalog_audit(store_id, created_at DESC);
