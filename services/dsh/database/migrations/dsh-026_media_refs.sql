CREATE TABLE IF NOT EXISTS dsh_media_refs (
    media_ref           TEXT        PRIMARY KEY DEFAULT 'media_' || replace(gen_random_uuid()::text, '-', ''),
    storage_key         TEXT        NOT NULL UNIQUE,
    owner_actor_id      TEXT        NOT NULL,
    owner_actor_role    TEXT        NOT NULL,
    partner_id          TEXT        NOT NULL REFERENCES dsh_partners(id) ON DELETE CASCADE,
    store_id            TEXT        REFERENCES dsh_stores(id) ON DELETE SET NULL,
    purpose             TEXT        NOT NULL,
    content_type        TEXT        NOT NULL,
    original_filename   TEXT        NOT NULL DEFAULT '',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_media_refs_owner
    ON dsh_media_refs(owner_actor_id, owner_actor_role);

CREATE INDEX IF NOT EXISTS idx_dsh_media_refs_partner
    ON dsh_media_refs(partner_id);
