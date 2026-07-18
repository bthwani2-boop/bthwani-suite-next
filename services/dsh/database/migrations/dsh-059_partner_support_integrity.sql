-- dsh-059_partner_support_integrity.sql
-- Adds retry-safe partner support mutations and an append-only audit stream.

BEGIN;

ALTER TABLE dsh_support_tickets
  ADD COLUMN IF NOT EXISTS create_idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS correlation_id TEXT,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1);

ALTER TABLE dsh_support_messages
  ADD COLUMN IF NOT EXISTS create_idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS correlation_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_support_ticket_reporter_idempotency
  ON dsh_support_tickets(reporter_id, create_idempotency_key)
  WHERE create_idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_support_message_sender_idempotency
  ON dsh_support_messages(ticket_id, sender_id, create_idempotency_key)
  WHERE create_idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dsh_support_tickets_reporter_role_created
  ON dsh_support_tickets(reporter_id, reporter_role, created_at DESC);

CREATE TABLE IF NOT EXISTS dsh_support_ticket_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id       UUID        NOT NULL REFERENCES dsh_support_tickets(id) ON DELETE CASCADE,
  reporter_id     TEXT        NOT NULL,
  actor_id        TEXT        NOT NULL,
  actor_role      TEXT        NOT NULL CHECK (actor_role IN ('client', 'partner', 'captain', 'operator', 'system')),
  event_type      TEXT        NOT NULL CHECK (event_type IN ('created', 'message_added', 'status_changed', 'escalated', 'closed')),
  correlation_id  TEXT        NOT NULL,
  metadata        JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_support_ticket_event_correlation
  ON dsh_support_ticket_events(ticket_id, event_type, correlation_id);

CREATE INDEX IF NOT EXISTS idx_dsh_support_ticket_events_ticket_created
  ON dsh_support_ticket_events(ticket_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_dsh_support_ticket_events_reporter_created
  ON dsh_support_ticket_events(reporter_id, created_at DESC);

COMMIT;
