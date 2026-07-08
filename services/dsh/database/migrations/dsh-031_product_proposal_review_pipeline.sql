-- DSH-031: Product Proposal Review Pipeline
--
-- Expands the status lifecycle of product proposals and adds metadata columns
-- to support a multi-stage review pipeline (partner-proposed -> partner-review ->
-- marketing-review -> catalog-adopted -> catalog-approved -> client-visible).

-- 1. Identify and drop the existing check constraint on status column dynamically
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

-- 2. Map existing proposal statuses to the new pipeline status names
UPDATE dsh_product_proposals SET status = 'partner-proposed' WHERE status = 'submitted';
UPDATE dsh_product_proposals SET status = 'partner-review' WHERE status = 'under_review';
UPDATE dsh_product_proposals SET status = 'catalog-adopted' WHERE status = 'adopted';
UPDATE dsh_product_proposals SET status = 'needs-fix' WHERE status = 'needs_fix';

-- 3. Add metadata columns for stage audit and policy tracking
ALTER TABLE dsh_product_proposals ADD COLUMN IF NOT EXISTS review_stage TEXT NOT NULL DEFAULT 'partner-review';
ALTER TABLE dsh_product_proposals ADD COLUMN IF NOT EXISTS partner_reviewed_by TEXT;
ALTER TABLE dsh_product_proposals ADD COLUMN IF NOT EXISTS marketing_reviewed_by TEXT;
ALTER TABLE dsh_product_proposals ADD COLUMN IF NOT EXISTS catalog_adopted_by TEXT;
ALTER TABLE dsh_product_proposals ADD COLUMN IF NOT EXISTS catalog_approved_by TEXT;
ALTER TABLE dsh_product_proposals ADD COLUMN IF NOT EXISTS client_visible_at TIMESTAMPTZ;
ALTER TABLE dsh_product_proposals ADD COLUMN IF NOT EXISTS audit_required BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE dsh_product_proposals ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
ALTER TABLE dsh_product_proposals ADD COLUMN IF NOT EXISTS resubmission_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE dsh_product_proposals ADD COLUMN IF NOT EXISTS linked_store_id TEXT;

-- 4. Apply the new constraint with expanded statuses
ALTER TABLE dsh_product_proposals ADD CONSTRAINT chk_dsh_product_proposals_status CHECK (status IN (
    'catalog-draft',
    'partner-proposed',
    'partner-review',
    'marketing-review',
    'catalog-adopted',
    'catalog-approved',
    'client-visible',
    'needs-fix',
    'rejected'
));
