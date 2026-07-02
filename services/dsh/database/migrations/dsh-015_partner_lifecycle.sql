-- LEGACY_FILENAME_ONLY — not a slice reference
-- DSH-015: Partner Lifecycle & Store Activation (SLICE-002)
-- Partners are first-class entities separate from stores.
-- Partner owns N stores; activation lifecycle is partner-level.
-- Field agents collect evidence per partner; CP owns all approval decisions.
-- WLT owns all financial operations — not referenced here.

-- ─── Partner entity ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dsh_partners (
    id                      TEXT        PRIMARY KEY DEFAULT 'prt_' || replace(gen_random_uuid()::text, '-', ''),
    legal_name_ar           TEXT        NOT NULL,
    legal_name_en           TEXT        NOT NULL DEFAULT '',
    display_name            TEXT        NOT NULL,
    legal_identity_type     TEXT        NOT NULL DEFAULT 'commercial_register'
                                CHECK (legal_identity_type IN (
                                    'commercial_register','national_id','freelancer_certificate'
                                )),
    legal_identity_number   TEXT        NOT NULL,
    owner_name              TEXT        NOT NULL DEFAULT '',
    primary_phone           TEXT        NOT NULL,
    secondary_phone         TEXT        NOT NULL DEFAULT '',
    email                   TEXT        NOT NULL DEFAULT '',
    category                TEXT        NOT NULL DEFAULT 'default'
                                CHECK (category IN ('restaurant','grocery','pharmacy','bakery','default')),
    activation_status       TEXT        NOT NULL DEFAULT 'draft'
                                CHECK (activation_status IN (
                                    'draft',
                                    'submitted',
                                    'field_visit_scheduled',
                                    'field_visit_completed',
                                    'documents_missing',
                                    'documents_uploaded',
                                    'documents_verified',
                                    'catalog_not_ready',
                                    'catalog_ready',
                                    'delivery_modes_not_ready',
                                    'delivery_modes_ready',
                                    'ops_review',
                                    'ops_approved',
                                    'ops_rejected',
                                    'partner_active',
                                    'partner_deactivated',
                                    'client_visible',
                                    'client_hidden'
                                )),
    created_by_actor_id     TEXT        NOT NULL DEFAULT '',
    created_by_surface      TEXT        NOT NULL DEFAULT 'app-field'
                                CHECK (created_by_surface IN ('app-field','control-panel','system')),
    notes                   TEXT        NOT NULL DEFAULT '',
    version                 INTEGER     NOT NULL DEFAULT 1,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT dsh_partners_legal_identity_unique
        UNIQUE (legal_identity_type, legal_identity_number)
);

CREATE INDEX IF NOT EXISTS idx_dsh_partners_activation_status
    ON dsh_partners(activation_status);
CREATE INDEX IF NOT EXISTS idx_dsh_partners_created_at
    ON dsh_partners(created_at DESC);

-- ─── Partner ↔ Store ownership ─────────────────────────────────────────────
-- Nullable: existing stores without a partner remain valid.
-- After slice-002 all new stores must have a partner_id.

ALTER TABLE dsh_stores
    ADD COLUMN IF NOT EXISTS partner_id TEXT REFERENCES dsh_partners(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_dsh_stores_partner_id
    ON dsh_stores(partner_id);

-- ─── Partner documents ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dsh_partner_documents (
    id                      TEXT        PRIMARY KEY DEFAULT 'doc_' || replace(gen_random_uuid()::text, '-', ''),
    partner_id              TEXT        NOT NULL REFERENCES dsh_partners(id) ON DELETE CASCADE,
    document_type           TEXT        NOT NULL
                                CHECK (document_type IN (
                                    'national_id',
                                    'commercial_register',
                                    'lease_agreement',
                                    'health_certificate',
                                    'store_photo',
                                    'owner_photo',
                                    'other'
                                )),
    document_status         TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (document_status IN (
                                    'pending','under_review','approved','rejected'
                                )),
    uploaded_by_actor_id    TEXT        NOT NULL,
    media_ref               TEXT        NOT NULL,
    notes                   TEXT        NOT NULL DEFAULT '',
    rejection_reason        TEXT        NOT NULL DEFAULT '',
    version                 INTEGER     NOT NULL DEFAULT 1,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_partner_documents_partner_id
    ON dsh_partner_documents(partner_id);
CREATE INDEX IF NOT EXISTS idx_dsh_partner_documents_status
    ON dsh_partner_documents(document_status);

-- ─── Partner document reviews ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dsh_partner_document_reviews (
    id                      TEXT        PRIMARY KEY DEFAULT 'drev_' || replace(gen_random_uuid()::text, '-', ''),
    document_id             TEXT        NOT NULL REFERENCES dsh_partner_documents(id) ON DELETE CASCADE,
    partner_id              TEXT        NOT NULL REFERENCES dsh_partners(id) ON DELETE CASCADE,
    reviewed_by_actor_id    TEXT        NOT NULL,
    decision                TEXT        NOT NULL
                                CHECK (decision IN ('approved','rejected','needs_resubmit')),
    reason                  TEXT        NOT NULL DEFAULT '',
    correlation_id          TEXT        NOT NULL DEFAULT '',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_partner_doc_reviews_document_id
    ON dsh_partner_document_reviews(document_id);
CREATE INDEX IF NOT EXISTS idx_dsh_partner_doc_reviews_partner_id
    ON dsh_partner_document_reviews(partner_id);

-- ─── Partner field visits (partner-centric, store_id optional) ────────────
-- Separate from dsh_field_visits which is store-centric quality assurance.

CREATE TABLE IF NOT EXISTS dsh_partner_field_visits (
    id                      TEXT        PRIMARY KEY DEFAULT 'pfv_' || replace(gen_random_uuid()::text, '-', ''),
    partner_id              TEXT        NOT NULL REFERENCES dsh_partners(id) ON DELETE CASCADE,
    store_id                TEXT        REFERENCES dsh_stores(id) ON DELETE SET NULL,
    field_actor_id          TEXT        NOT NULL,
    visit_status            TEXT        NOT NULL DEFAULT 'draft'
                                CHECK (visit_status IN ('draft','in_progress','submitted','escalated')),
    visit_notes             TEXT        NOT NULL DEFAULT '',
    location_latitude       NUMERIC(10,7),
    location_longitude      NUMERIC(10,7),
    evidence_media_refs     TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
    version                 INTEGER     NOT NULL DEFAULT 1,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    submitted_at            TIMESTAMPTZ,
    CONSTRAINT dsh_partner_field_visits_location_chk
        CHECK (
            (location_latitude IS NULL AND location_longitude IS NULL) OR
            (location_latitude IS NOT NULL AND location_longitude IS NOT NULL)
        )
);

CREATE INDEX IF NOT EXISTS idx_dsh_partner_field_visits_partner_id
    ON dsh_partner_field_visits(partner_id);
CREATE INDEX IF NOT EXISTS idx_dsh_partner_field_visits_actor_id
    ON dsh_partner_field_visits(field_actor_id);
CREATE INDEX IF NOT EXISTS idx_dsh_partner_field_visits_status
    ON dsh_partner_field_visits(visit_status);

-- ─── Partner activation events (immutable audit trail) ────────────────────

CREATE TABLE IF NOT EXISTS dsh_partner_activation_events (
    id                      TEXT        PRIMARY KEY DEFAULT 'pae_' || replace(gen_random_uuid()::text, '-', ''),
    partner_id              TEXT        NOT NULL REFERENCES dsh_partners(id) ON DELETE CASCADE,
    from_status             TEXT        NOT NULL,
    to_status               TEXT        NOT NULL,
    actor_id                TEXT        NOT NULL,
    actor_surface           TEXT        NOT NULL
                                CHECK (actor_surface IN (
                                    'app-field','app-partner','app-captain','control-panel','system'
                                )),
    reason                  TEXT        NOT NULL DEFAULT '',
    correlation_id          TEXT        NOT NULL DEFAULT '',
    idempotency_key         TEXT        NOT NULL DEFAULT '',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_partner_activation_events_partner_id
    ON dsh_partner_activation_events(partner_id);
CREATE INDEX IF NOT EXISTS idx_dsh_partner_activation_events_created_at
    ON dsh_partner_activation_events(created_at DESC);

-- ─── Partner store visibility events ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS dsh_partner_store_visibility_events (
    id                      TEXT        PRIMARY KEY DEFAULT 'psve_' || replace(gen_random_uuid()::text, '-', ''),
    partner_id              TEXT        NOT NULL REFERENCES dsh_partners(id) ON DELETE CASCADE,
    store_id                TEXT        NOT NULL REFERENCES dsh_stores(id) ON DELETE CASCADE,
    from_visibility         TEXT        NOT NULL,
    to_visibility           TEXT        NOT NULL,
    actor_id                TEXT        NOT NULL,
    reason                  TEXT        NOT NULL DEFAULT '',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_partner_store_vis_events_partner_id
    ON dsh_partner_store_visibility_events(partner_id);
CREATE INDEX IF NOT EXISTS idx_dsh_partner_store_vis_events_store_id
    ON dsh_partner_store_visibility_events(store_id);
