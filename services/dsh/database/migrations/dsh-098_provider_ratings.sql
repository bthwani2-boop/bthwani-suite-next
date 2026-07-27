-- DSH-098: lightweight governed provider ratings.
-- Ratings are accepted only from real operational sources:
--   * a partner rates the field provider linked to its activated onboarding;
--   * a client rates the captain and the order after delivery.
-- The table stores immutable source ownership and supports idempotent updates by
-- the same rater. Financial decisions remain outside this table.

CREATE TABLE IF NOT EXISTS dsh_provider_ratings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         text NOT NULL DEFAULT 'default',
  rater_kind        text NOT NULL CHECK (rater_kind IN ('partner','client')),
  rater_actor_id    text NOT NULL,
  target_kind       text NOT NULL CHECK (target_kind IN ('field','captain','order')),
  target_actor_id   text NOT NULL DEFAULT '',
  source_kind       text NOT NULL CHECK (source_kind IN ('partner_activation','order_delivery')),
  source_id         text NOT NULL,
  score             smallint NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment           text NOT NULL DEFAULT '' CHECK (char_length(comment) <= 1000),
  status            text NOT NULL DEFAULT 'active' CHECK (status IN ('active','retracted')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dsh_provider_ratings_target_actor_chk CHECK (
    (target_kind = 'order' AND target_actor_id = '') OR
    (target_kind IN ('field','captain') AND target_actor_id <> '')
  ),
  CONSTRAINT dsh_provider_ratings_source_target_chk CHECK (
    (source_kind = 'partner_activation' AND target_kind = 'field' AND rater_kind = 'partner') OR
    (source_kind = 'order_delivery' AND target_kind IN ('captain','order') AND rater_kind = 'client')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_provider_ratings_rater_source_target
  ON dsh_provider_ratings(tenant_id, rater_actor_id, source_kind, source_id, target_kind);

CREATE INDEX IF NOT EXISTS idx_dsh_provider_ratings_target
  ON dsh_provider_ratings(tenant_id, target_kind, target_actor_id, created_at DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_dsh_provider_ratings_source
  ON dsh_provider_ratings(tenant_id, source_kind, source_id, created_at DESC);

CREATE TABLE IF NOT EXISTS dsh_provider_rating_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id       uuid NOT NULL REFERENCES dsh_provider_ratings(id) ON DELETE CASCADE,
  tenant_id       text NOT NULL DEFAULT 'default',
  action          text NOT NULL CHECK (action IN ('created','updated','retracted')),
  actor_id        text NOT NULL,
  score           smallint NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment         text NOT NULL DEFAULT '',
  correlation_id  text NOT NULL DEFAULT '',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dsh_provider_rating_events_rating
  ON dsh_provider_rating_events(rating_id, created_at DESC);
