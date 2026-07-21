-- JRN-031: governed rollback for approved staff role assignments.

ALTER TABLE dsh_admin_approval_requests
  DROP CONSTRAINT IF EXISTS dsh_admin_approval_requests_action_type_check;

ALTER TABLE dsh_admin_approval_requests
  ADD CONSTRAINT dsh_admin_approval_requests_action_type_check
  CHECK (action_type IN ('staff_role_assignment','staff_role_revocation'));

DROP INDEX IF EXISTS uq_dsh_admin_pending_role_assignment;

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_admin_pending_role_change
  ON dsh_admin_approval_requests (action_type, target_actor_id, role_id)
  WHERE status = 'pending';
