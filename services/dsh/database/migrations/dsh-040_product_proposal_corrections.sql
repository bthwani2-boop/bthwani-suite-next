-- DSH-040: Product Proposal Corrections
-- Adds support for proposing corrections to existing products and optimistic locking

ALTER TABLE dsh_product_proposals ADD COLUMN IF NOT EXISTS target_master_product_id TEXT REFERENCES dsh_master_products(id);
ALTER TABLE dsh_product_proposals ADD COLUMN IF NOT EXISTS base_version INTEGER;
ALTER TABLE dsh_product_proposals ADD COLUMN IF NOT EXISTS duplicate_candidates JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Drop and recreate the status constraint to include 'conflict' and 'withdrawn'
DO $$
DECLARE
    cn TEXT;
BEGIN
    SELECT tc.constraint_name INTO cn
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.table_name = 'dsh_product_proposals'
      AND tc.constraint_type = 'CHECK'
      AND ccu.column_name = 'status';

    IF cn IS NOT NULL THEN
        EXECUTE 'ALTER TABLE dsh_product_proposals DROP CONSTRAINT ' || quote_ident(cn);
    END IF;
END $$;

ALTER TABLE dsh_product_proposals ADD CONSTRAINT chk_dsh_product_proposals_status CHECK (status IN (
    'catalog-draft',
    'partner-proposed',
    'partner-review',
    'marketing-review',
    'catalog-adopted',
    'catalog-approved',
    'client-visible',
    'needs-fix',
    'rejected',
    'conflict',
    'withdrawn'
));
