-- DSH-041: Strict domain constraints and catalog concurrency

-- 1. Create explicitly approved store domains linkage
CREATE TABLE IF NOT EXISTS dsh_store_catalog_domains (
  store_id    TEXT NOT NULL REFERENCES dsh_stores(id) ON DELETE CASCADE,
  domain_id   TEXT NOT NULL REFERENCES dsh_catalog_domains(id),
  status      TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (store_id, domain_id)
);

-- 2. Concurrency Control (version / updatedAt)
ALTER TABLE dsh_master_products ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE dsh_catalog_nodes ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE dsh_store_assortments ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- 3. Unique Constraints within allowed scope
-- A barcode, GTIN, or SKU must be unique across all master products if provided.
CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_master_products_barcode ON dsh_master_products (barcode) WHERE barcode IS NOT NULL AND barcode != '';
CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_master_products_gtin ON dsh_master_products (gtin) WHERE gtin IS NOT NULL AND gtin != '';
CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_master_products_sku ON dsh_master_products (domain_id, sku) WHERE sku IS NOT NULL AND sku != '';

-- 4. Constraint triggers for cross-table logic (Domain match, parent match)

CREATE OR REPLACE FUNCTION enforce_catalog_domain_sovereignty()
RETURNS TRIGGER AS $$
DECLARE
  node_domain TEXT;
  parent_domain TEXT;
  store_domain_status TEXT;
BEGIN
  -- If inserting/updating a node, check parent domain
  IF TG_TABLE_NAME = 'dsh_catalog_nodes' THEN
    IF NEW.parent_id IS NOT NULL THEN
      SELECT domain_id INTO parent_domain FROM dsh_catalog_nodes WHERE id = NEW.parent_id;
      IF parent_domain != NEW.domain_id THEN
        RAISE EXCEPTION 'Category node domain % does not match parent domain %', NEW.domain_id, parent_domain;
      END IF;
    END IF;
  END IF;

  -- If inserting/updating a product, check category node domain
  IF TG_TABLE_NAME = 'dsh_master_products' THEN
    IF NEW.category_node_id IS NOT NULL THEN
      SELECT domain_id INTO node_domain FROM dsh_catalog_nodes WHERE id = NEW.category_node_id;
      IF node_domain != NEW.domain_id THEN
        RAISE EXCEPTION 'Master product domain % does not match category node domain %', NEW.domain_id, node_domain;
      END IF;
    END IF;
  END IF;

  -- If inserting/updating a store assortment, check if store is approved for the product's domain
  IF TG_TABLE_NAME = 'dsh_store_assortments' THEN
    SELECT domain_id INTO node_domain FROM dsh_master_products WHERE id = NEW.master_product_id;
    SELECT status INTO store_domain_status FROM dsh_store_catalog_domains WHERE store_id = NEW.store_id AND domain_id = node_domain;
    IF store_domain_status IS NULL OR store_domain_status != 'approved' THEN
      RAISE EXCEPTION 'Store % is not approved to sell products in domain %', NEW.store_id, node_domain;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enforce_node_domain ON dsh_catalog_nodes;
CREATE TRIGGER trigger_enforce_node_domain
  BEFORE INSERT OR UPDATE ON dsh_catalog_nodes
  FOR EACH ROW EXECUTE FUNCTION enforce_catalog_domain_sovereignty();

DROP TRIGGER IF EXISTS trigger_enforce_product_domain ON dsh_master_products;
CREATE TRIGGER trigger_enforce_product_domain
  BEFORE INSERT OR UPDATE ON dsh_master_products
  FOR EACH ROW EXECUTE FUNCTION enforce_catalog_domain_sovereignty();

DROP TRIGGER IF EXISTS trigger_enforce_assortment_domain ON dsh_store_assortments;
CREATE TRIGGER trigger_enforce_assortment_domain
  BEFORE INSERT OR UPDATE ON dsh_store_assortments
  FOR EACH ROW EXECUTE FUNCTION enforce_catalog_domain_sovereignty();

-- Prevent cycles in catalog nodes
CREATE OR REPLACE FUNCTION enforce_no_node_cycles()
RETURNS TRIGGER AS $$
DECLARE
  current_ancestor TEXT := NEW.parent_id;
BEGIN
  WHILE current_ancestor IS NOT NULL LOOP
    IF current_ancestor = NEW.id THEN
      RAISE EXCEPTION 'Cycle detected in category nodes for node %', NEW.id;
    END IF;
    SELECT parent_id INTO current_ancestor FROM dsh_catalog_nodes WHERE id = current_ancestor;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_no_node_cycles ON dsh_catalog_nodes;
CREATE TRIGGER trigger_no_node_cycles
  BEFORE INSERT OR UPDATE ON dsh_catalog_nodes
  FOR EACH ROW EXECUTE FUNCTION enforce_no_node_cycles();
