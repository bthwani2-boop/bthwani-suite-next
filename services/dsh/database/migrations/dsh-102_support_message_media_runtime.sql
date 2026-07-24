-- DSH-102: full-stack rich support messages.
-- DSH owns conversation metadata and governed media references. Binary media
-- remains owned by the media provider and is referenced by immutable asset ID.

ALTER TABLE dsh_support_message_attachments
    ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'document',
    ADD COLUMN IF NOT EXISTS duration_ms BIGINT,
    ADD COLUMN IF NOT EXISTS thumbnail_media_asset_id TEXT,
    ADD COLUMN IF NOT EXISTS waveform_ref TEXT,
    ADD COLUMN IF NOT EXISTS upload_status TEXT NOT NULL DEFAULT 'ready';

UPDATE dsh_support_message_attachments
SET kind = CASE
    WHEN mime_type LIKE 'image/%' THEN 'image'
    WHEN mime_type LIKE 'audio/%' THEN 'audio'
    WHEN mime_type LIKE 'video/%' THEN 'video'
    ELSE 'document'
END
WHERE kind = 'document';

ALTER TABLE dsh_support_message_attachments
    DROP CONSTRAINT IF EXISTS dsh_support_message_attachments_size_bytes_check,
    DROP CONSTRAINT IF EXISTS dsh_support_message_attachments_kind_check,
    DROP CONSTRAINT IF EXISTS dsh_support_message_attachments_duration_ms_check,
    DROP CONSTRAINT IF EXISTS dsh_support_message_attachments_upload_status_check;

ALTER TABLE dsh_support_message_attachments
    ADD CONSTRAINT dsh_support_message_attachments_size_bytes_check
        CHECK (size_bytes > 0 AND size_bytes <= 104857600),
    ADD CONSTRAINT dsh_support_message_attachments_kind_check
        CHECK (kind IN ('image', 'audio', 'video', 'document')),
    ADD CONSTRAINT dsh_support_message_attachments_duration_ms_check
        CHECK (
            duration_ms IS NULL OR duration_ms >= 0
        ),
    ADD CONSTRAINT dsh_support_message_attachments_upload_status_check
        CHECK (upload_status IN ('uploaded', 'processing', 'ready', 'failed'));

CREATE INDEX IF NOT EXISTS idx_dsh_support_message_attachments_asset
    ON dsh_support_message_attachments(media_asset_id, message_id);

CREATE INDEX IF NOT EXISTS idx_dsh_support_message_attachments_status
    ON dsh_support_message_attachments(upload_status, created_at)
    WHERE upload_status <> 'ready';

CREATE OR REPLACE FUNCTION dsh_validate_support_message_content()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    target_message_id UUID;
    message_exists BOOLEAN;
    content_valid BOOLEAN;
BEGIN
    IF TG_TABLE_NAME = 'dsh_support_messages' THEN
        target_message_id := COALESCE(NEW.id, OLD.id);
    ELSE
        target_message_id := COALESCE(NEW.message_id, OLD.message_id);
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM dsh_support_messages WHERE id = target_message_id
    ) INTO message_exists;

    -- Cascading deletion removes the message and its attachments together.
    IF NOT message_exists THEN
        RETURN NULL;
    END IF;

    SELECT (
        NULLIF(BTRIM(m.body), '') IS NOT NULL
        OR EXISTS (
            SELECT 1
            FROM dsh_support_message_attachments a
            WHERE a.message_id = m.id
        )
    )
    INTO content_valid
    FROM dsh_support_messages m
    WHERE m.id = target_message_id;

    IF NOT COALESCE(content_valid, FALSE) THEN
        RAISE EXCEPTION 'support message requires text or at least one attachment'
            USING ERRCODE = '23514',
                  CONSTRAINT = 'dsh_support_message_content_check';
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_support_message_content_message
    ON dsh_support_messages;
CREATE CONSTRAINT TRIGGER trg_dsh_support_message_content_message
AFTER INSERT OR UPDATE OR DELETE ON dsh_support_messages
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION dsh_validate_support_message_content();

DROP TRIGGER IF EXISTS trg_dsh_support_message_content_attachment
    ON dsh_support_message_attachments;
CREATE CONSTRAINT TRIGGER trg_dsh_support_message_content_attachment
AFTER INSERT OR UPDATE OR DELETE ON dsh_support_message_attachments
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION dsh_validate_support_message_content();
