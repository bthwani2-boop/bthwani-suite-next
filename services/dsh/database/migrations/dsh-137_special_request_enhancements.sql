-- dsh-137_special_request_enhancements.sql

-- 1. Add fields for J059 Special Requests Moderation & Lifecycle
ALTER TABLE dsh_special_requests
    ADD COLUMN IF NOT EXISTS quote_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS media_id UUID,
    ADD COLUMN IF NOT EXISTS safety_status TEXT DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS moderation_note TEXT,
    ADD COLUMN IF NOT EXISTS is_unsafe_content BOOLEAN DEFAULT false;

-- 2. Index for safety queue
CREATE INDEX IF NOT EXISTS idx_dsh_special_requests_safety
    ON dsh_special_requests (safety_status, created_at)
    WHERE safety_status = 'pending';
