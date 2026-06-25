-- DSH-011: Notifications & Actor Communication
-- Creates notification tables with actor-scoped routing.

CREATE TABLE IF NOT EXISTS dsh_notifications (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      TEXT        NOT NULL,
  actor_type    TEXT        NOT NULL CHECK (actor_type IN ('client','partner','captain','field','operator')),
  topic         TEXT        NOT NULL,
  title         TEXT        NOT NULL,
  body          TEXT        NOT NULL,
  action_url    TEXT,
  is_read       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dsh_notifications_actor ON dsh_notifications (actor_id, actor_type);
CREATE INDEX IF NOT EXISTS idx_dsh_notifications_unread ON dsh_notifications (actor_id, is_read) WHERE is_read = FALSE;

CREATE TABLE IF NOT EXISTS dsh_notification_preferences (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      TEXT        NOT NULL,
  actor_type    TEXT        NOT NULL,
  topic         TEXT        NOT NULL,
  enabled       BOOLEAN     NOT NULL DEFAULT TRUE,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (actor_id, actor_type, topic)
);

CREATE TABLE IF NOT EXISTS dsh_platform_notification_config (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  topic         TEXT        NOT NULL UNIQUE,
  actor_types   TEXT[]      NOT NULL DEFAULT '{}',
  is_enabled    BOOLEAN     NOT NULL DEFAULT TRUE,
  description   TEXT,
  updated_by    TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
