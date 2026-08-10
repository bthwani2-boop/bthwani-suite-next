-- DSH-979: Catalog Product Variants
--
-- This migration introduces variant support natively into dsh_master_products
-- using a parent_id to denote variant lineage.

BEGIN;

ALTER TABLE dsh_master_products
ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES dsh_master_products(id),
ADD COLUMN IF NOT EXISTS is_standalone BOOLEAN NOT NULL DEFAULT TRUE;

-- Constraints
-- A variant cannot be a parent of another variant (depth 1 constraint enforced by triggers/app).
-- A standalone product can have parent_id IS NULL and is_standalone = TRUE.
-- A parent product has parent_id IS NULL and is_standalone = FALSE.
-- A variant has parent_id IS NOT NULL and is_standalone = FALSE.

CREATE INDEX IF NOT EXISTS idx_dsh_master_products_parent
  ON dsh_master_products (parent_id) WHERE parent_id IS NOT NULL;

-- Enforce domain matching
CREATE OR REPLACE FUNCTION trigger_enforce_product_variant_domain()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_domain TEXT;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT domain_id INTO v_parent_domain FROM dsh_master_products WHERE id = NEW.parent_id;
    IF v_parent_domain != NEW.domain_id THEN
      RAISE EXCEPTION 'Variant domain_id % does not match parent domain_id %', NEW.domain_id, v_parent_domain;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_product_variant_domain ON dsh_master_products;
CREATE TRIGGER enforce_product_variant_domain
  BEFORE INSERT OR UPDATE ON dsh_master_products
  FOR EACH ROW EXECUTE FUNCTION trigger_enforce_product_variant_domain();

-- Enforce cycle prevention (depth 1 constraint: parent cannot have a parent)
CREATE OR REPLACE FUNCTION trigger_enforce_product_variant_depth()
RETURNS TRIGGER AS $$
DECLARE
  v_grandparent_id TEXT;
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    SELECT parent_id INTO v_grandparent_id FROM dsh_master_products WHERE id = NEW.parent_id;
    IF v_grandparent_id IS NOT NULL THEN
      RAISE EXCEPTION 'Product variant nesting exceeded. Master product variants can only be 1 level deep.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_product_variant_depth ON dsh_master_products;
CREATE TRIGGER enforce_product_variant_depth
  BEFORE INSERT OR UPDATE ON dsh_master_products
  FOR EACH ROW EXECUTE FUNCTION trigger_enforce_product_variant_depth();

COMMIT;
