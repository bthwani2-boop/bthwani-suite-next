-- Add identity_session_id and surface to push endpoints

ALTER TABLE dsh_notification_push_endpoints
ADD COLUMN identity_session_id TEXT NULL,
ADD COLUMN surface TEXT NULL;

-- Create an index to quickly find and purge endpoints when a session is revoked
CREATE INDEX idx_dsh_push_endpoints_session_id ON dsh_notification_push_endpoints(identity_session_id) WHERE identity_session_id IS NOT NULL;
