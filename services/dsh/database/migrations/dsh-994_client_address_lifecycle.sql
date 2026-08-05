-- dsh-994_client_address_lifecycle.sql
-- Implements explicit lifecycle states for client addresses as per J042.

BEGIN;

ALTER TABLE dsh_client_addresses
ADD COLUMN status TEXT NOT NULL DEFAULT 'ACTIVE' 
CHECK (status IN ('DRAFT', 'VERIFIED', 'ACTIVE', 'ARCHIVED', 'DELETED'));

-- Migrate existing soft-deleted records to the explicit DELETED state
UPDATE dsh_client_addresses 
SET status = 'DELETED' 
WHERE deleted_at IS NOT NULL;

-- Recreate indices with status-aware predicates
DROP INDEX IF EXISTS uq_dsh_client_addresses_single_default;
CREATE UNIQUE INDEX uq_dsh_client_addresses_single_default
  ON dsh_client_addresses(client_id)
  WHERE is_default = TRUE AND status = 'ACTIVE';

DROP INDEX IF EXISTS idx_dsh_client_addresses_client_active;
CREATE INDEX idx_dsh_client_addresses_client_active
  ON dsh_client_addresses(client_id, updated_at DESC)
  WHERE status IN ('ACTIVE', 'VERIFIED');

DROP INDEX IF EXISTS uq_dsh_client_addresses_active_idempotency;
CREATE UNIQUE INDEX uq_dsh_client_addresses_active_idempotency
  ON dsh_client_addresses(client_id, create_idempotency_key)
  WHERE status != 'DELETED';

-- Expand event actions to accommodate the new lifecycle transitions
ALTER TABLE dsh_client_address_events DROP CONSTRAINT dsh_client_address_events_action_check;
ALTER TABLE dsh_client_address_events ADD CONSTRAINT dsh_client_address_events_action_check
  CHECK (action IN ('created', 'updated', 'defaulted', 'deleted', 'archived', 'verified', 'drafted'));

COMMIT;
