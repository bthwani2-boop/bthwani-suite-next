-- DSH-019: Marketing news ticker backend activation.
-- Backs the control-panel Ticker Command Deck (previously isBackedByApi:false
-- with mutating actions disabled). Governed lifecycle draft -> published|paused,
-- soft delete, and audit trail via the shared dsh_marketing_audit_events table.

CREATE TABLE IF NOT EXISTS dsh_marketing_tickers (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message            TEXT        NOT NULL,
  kind               TEXT        NOT NULL DEFAULT 'news'   CHECK (kind IN ('alert','news','promo')),
  status             TEXT        NOT NULL DEFAULT 'draft'  CHECK (status IN ('draft','published','paused')),
  source             TEXT        NOT NULL DEFAULT 'ops'    CHECK (source IN ('system','ops','partner')),
  audience           TEXT        NOT NULL DEFAULT 'all'    CHECK (audience IN ('all','client','partner','captain')),
  delivery_mode      TEXT        NOT NULL DEFAULT 'scroll' CHECK (delivery_mode IN ('scroll','toast','overlay')),
  priority           TEXT        NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','critical')),
  pinned             BOOLEAN     NOT NULL DEFAULT FALSE,
  action_type        TEXT        NOT NULL DEFAULT '',
  action_target      TEXT        NOT NULL DEFAULT '',
  clicks             INTEGER     NOT NULL DEFAULT 0 CHECK (clicks >= 0),
  impressions        INTEGER     NOT NULL DEFAULT 0 CHECK (impressions >= 0),
  open_hour          INTEGER     CHECK (open_hour BETWEEN 0 AND 23),
  close_hour         INTEGER     CHECK (close_hour BETWEEN 0 AND 23),
  cooldown_minutes   INTEGER     CHECK (cooldown_minutes >= 0),
  repeat_gap_minutes INTEGER     CHECK (repeat_gap_minutes >= 0),
  created_by         TEXT,
  deleted_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_marketing_tickers_live
  ON dsh_marketing_tickers (status, pinned)
  WHERE deleted_at IS NULL;
