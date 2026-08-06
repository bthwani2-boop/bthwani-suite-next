-- DSH-145: Support Tickets J073 - IDOR prevention, Claims, SLA, Optimistic Concurrency and Sequence

ALTER TABLE dsh_support_tickets
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS claimed_by TEXT,
    ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS sla_breach_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS escalation_reason TEXT;

ALTER TABLE dsh_support_messages
    ADD COLUMN IF NOT EXISTS client_message_id TEXT,
    ADD COLUMN IF NOT EXISTS sequence_num INTEGER;

-- We already have create_idempotency_key on dsh_support_messages via dsh-059
-- Now we need a unique constraint for client_message_id + ticket_id to ensure exact once client delivery.
CREATE UNIQUE INDEX IF NOT EXISTS idx_dsh_support_messages_client_message
    ON dsh_support_messages (ticket_id, client_message_id)
    WHERE client_message_id IS NOT NULL;

-- Automatically assign sequence numbers per ticket.
CREATE OR REPLACE FUNCTION dsh_assign_support_message_sequence()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    SELECT COALESCE(MAX(sequence_num), 0) + 1
    INTO NEW.sequence_num
    FROM dsh_support_messages
    WHERE ticket_id = NEW.ticket_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_support_messages_sequence ON dsh_support_messages;
CREATE TRIGGER trg_dsh_support_messages_sequence
    BEFORE INSERT ON dsh_support_messages
    FOR EACH ROW
    WHEN (NEW.sequence_num IS NULL)
    EXECUTE FUNCTION dsh_assign_support_message_sequence();

-- Canned Responses Governance
CREATE TABLE IF NOT EXISTS dsh_support_canned_responses (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT        NOT NULL,
    body            TEXT        NOT NULL,
    category        TEXT        NOT NULL,
    is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dsh_support_canned_responses_title
    ON dsh_support_canned_responses (title);
