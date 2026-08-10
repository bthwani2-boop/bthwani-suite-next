-- dsh-135_store_publication_lifecycle.sql
-- Implements J025: Strict State Machine for Store Publication

BEGIN;

-- 1. Drop the legacy status constraint
ALTER TABLE dsh_stores DROP CONSTRAINT IF EXISTS dsh_stores_status_chk;

-- 2. Migrate existing records to the new state machine
UPDATE dsh_stores
SET status = CASE
    WHEN status = 'active' THEN 'published'
    WHEN status = 'temporarily_closed' THEN 'paused'
    WHEN status = 'unavailable' THEN 'suspended'
    WHEN status = 'inactive' THEN 'draft'
    ELSE 'draft'
END;

-- 3. Add the new strict constraint
ALTER TABLE dsh_stores ADD CONSTRAINT dsh_stores_status_chk
    CHECK (status IN ('draft', 'ready', 'published', 'paused', 'suspended', 'closed'));

COMMIT;
