-- DSH-096: JRN-021 support message attachments and actor read receipts.
-- DSH owns support conversation state and media references only; binary media
-- remains owned by the governed media provider.

CREATE TABLE IF NOT EXISTS dsh_support_message_attachments (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id       UUID        NOT NULL REFERENCES dsh_support_tickets(id) ON DELETE CASCADE,
    message_id      UUID        NOT NULL REFERENCES dsh_support_messages(id) ON DELETE CASCADE,
    media_asset_id  TEXT        NOT NULL,
    file_name       TEXT        NOT NULL,
    mime_type       TEXT        NOT NULL,
    size_bytes      BIGINT      NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 26214400),
    attached_by     TEXT        NOT NULL,
    is_internal     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (message_id, media_asset_id)
);

CREATE INDEX IF NOT EXISTS idx_dsh_support_message_attachments_ticket
    ON dsh_support_message_attachments(ticket_id, created_at, id);

CREATE TABLE IF NOT EXISTS dsh_support_message_read_receipts (
    message_id      UUID        NOT NULL REFERENCES dsh_support_messages(id) ON DELETE CASCADE,
    ticket_id       UUID        NOT NULL REFERENCES dsh_support_tickets(id) ON DELETE CASCADE,
    actor_id        TEXT        NOT NULL,
    actor_role      TEXT        NOT NULL CHECK (actor_role IN ('client','partner','captain','operator')),
    read_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (message_id, actor_id, actor_role)
);

CREATE INDEX IF NOT EXISTS idx_dsh_support_read_receipts_actor
    ON dsh_support_message_read_receipts(actor_id, actor_role, read_at DESC);

CREATE INDEX IF NOT EXISTS idx_dsh_support_read_receipts_ticket
    ON dsh_support_message_read_receipts(ticket_id, actor_id, actor_role);
