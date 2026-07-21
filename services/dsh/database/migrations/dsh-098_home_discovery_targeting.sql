-- DSH-098 / JRN-007 S3: governed region and audience targeting for client-home content.
-- Absence of rows for one target_type means unrestricted for that dimension.
-- Content truth remains in dsh_home_banners/dsh_home_promos; this table owns only
-- the targeting projection and therefore does not create a second content owner.

CREATE TABLE IF NOT EXISTS dsh_home_content_targets (
  content_kind       TEXT        NOT NULL CHECK (content_kind IN ('banners','promos')),
  content_id         TEXT        NOT NULL,
  target_type        TEXT        NOT NULL CHECK (target_type IN ('city','service_area','audience')),
  target_value       TEXT        NOT NULL CHECK (length(trim(target_value)) BETWEEN 1 AND 80),
  created_by_actor_id TEXT       NOT NULL,
  correlation_id     TEXT        NOT NULL CHECK (length(trim(correlation_id)) >= 8),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (content_kind, content_id, target_type, target_value)
);

CREATE INDEX IF NOT EXISTS idx_dsh_home_content_targets_lookup
  ON dsh_home_content_targets(content_kind, content_id, target_type, target_value);

CREATE INDEX IF NOT EXISTS idx_dsh_home_content_targets_reverse
  ON dsh_home_content_targets(target_type, target_value, content_kind, content_id);

COMMENT ON TABLE dsh_home_content_targets IS
  'JRN-007 targeting projection. Empty dimension = all; audience values are guest/authenticated.';
