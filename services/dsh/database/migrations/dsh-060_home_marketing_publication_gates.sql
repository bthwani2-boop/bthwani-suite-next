-- DSH-060: client home marketing publication gates
--
-- Every banner/promo visible in app-client must carry an explicit marketing
-- publication decision and publication window. Existing active content is
-- grandfathered as a recorded migration approval because it was already owned
-- by the marketing-only home-discovery operator surface. All future writes
-- record the authenticated marketing actor.

ALTER TABLE dsh_home_banners
    ADD COLUMN IF NOT EXISTS publication_status TEXT NOT NULL DEFAULT 'draft'
        CHECK (publication_status IN ('draft','published','paused','archived')),
    ADD COLUMN IF NOT EXISTS publish_from TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS publish_until TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS created_by_actor_id TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS approved_by_actor_id TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0);

ALTER TABLE dsh_home_promos
    ADD COLUMN IF NOT EXISTS publication_status TEXT NOT NULL DEFAULT 'draft'
        CHECK (publication_status IN ('draft','published','paused','archived')),
    ADD COLUMN IF NOT EXISTS publish_from TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS publish_until TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS created_by_actor_id TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS approved_by_actor_id TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0);

UPDATE dsh_home_banners
SET publication_status = CASE WHEN is_active THEN 'published' ELSE 'paused' END,
    approved_by_actor_id = CASE WHEN is_active THEN 'migration:dsh-060' ELSE approved_by_actor_id END,
    approved_at = CASE WHEN is_active THEN COALESCE(approved_at, updated_at, created_at, NOW()) ELSE approved_at END,
    created_by_actor_id = CASE WHEN created_by_actor_id = '' THEN 'migration:dsh-060' ELSE created_by_actor_id END
WHERE created_by_actor_id = '' OR publication_status = 'draft';

UPDATE dsh_home_promos
SET publication_status = CASE WHEN is_active THEN 'published' ELSE 'paused' END,
    approved_by_actor_id = CASE WHEN is_active THEN 'migration:dsh-060' ELSE approved_by_actor_id END,
    approved_at = CASE WHEN is_active THEN COALESCE(approved_at, updated_at, created_at, NOW()) ELSE approved_at END,
    created_by_actor_id = CASE WHEN created_by_actor_id = '' THEN 'migration:dsh-060' ELSE created_by_actor_id END
WHERE created_by_actor_id = '' OR publication_status = 'draft';

ALTER TABLE dsh_home_banners
    DROP CONSTRAINT IF EXISTS dsh_home_banners_publish_window_chk;
ALTER TABLE dsh_home_banners
    ADD CONSTRAINT dsh_home_banners_publish_window_chk
    CHECK (publish_until IS NULL OR publish_from IS NULL OR publish_until > publish_from);

ALTER TABLE dsh_home_promos
    DROP CONSTRAINT IF EXISTS dsh_home_promos_publish_window_chk;
ALTER TABLE dsh_home_promos
    ADD CONSTRAINT dsh_home_promos_publish_window_chk
    CHECK (publish_until IS NULL OR publish_from IS NULL OR publish_until > publish_from);

CREATE INDEX IF NOT EXISTS idx_dsh_home_banners_publication
    ON dsh_home_banners(publication_status, publish_from, publish_until, sort_order)
    WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_dsh_home_promos_publication
    ON dsh_home_promos(publication_status, publish_from, publish_until, sort_order)
    WHERE is_active = TRUE;

COMMENT ON COLUMN dsh_home_banners.approved_by_actor_id IS
    'Authenticated marketing operator that approved client publication.';
COMMENT ON COLUMN dsh_home_promos.approved_by_actor_id IS
    'Authenticated marketing operator that approved client publication.';
