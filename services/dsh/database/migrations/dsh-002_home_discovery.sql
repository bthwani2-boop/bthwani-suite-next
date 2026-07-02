-- LEGACY_FILENAME_ONLY — not a slice reference
-- DSH-002: Home Discovery
-- Creates home_banners, home_promos, dsh_categories tables

CREATE TABLE IF NOT EXISTS dsh_home_banners (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  image_url TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('store','category','external','none')),
  action_target TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dsh_home_promos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  badge_label TEXT,
  image_url TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('store','category','external','none')),
  action_target TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dsh_categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  label_ar TEXT,
  icon_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dsh_home_content_audit (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  content_kind TEXT NOT NULL CHECK (content_kind IN ('banners','promos','categories')),
  content_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create','update','delete')),
  correlation_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Link stores to categories
ALTER TABLE dsh_stores ADD COLUMN IF NOT EXISTS category_id TEXT REFERENCES dsh_categories(id);

CREATE INDEX IF NOT EXISTS idx_dsh_home_banners_active ON dsh_home_banners(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_dsh_home_promos_active ON dsh_home_promos(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_dsh_categories_active ON dsh_categories(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_dsh_home_content_audit_lookup ON dsh_home_content_audit(content_kind, content_id, created_at DESC);
