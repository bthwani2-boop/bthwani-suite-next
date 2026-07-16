-- DSH-050: Partner Store Team, Courier Settings, Coverage Zones (SLICE-050)
-- Closes the frontend/backend gap for app-partner team management,
-- store courier settings, and coverage zone visibility. These operations
-- already exist in dsh.openapi.yaml and are already called by the
-- app-partner frontend (services/dsh/frontend/shared/partner/partner.api.ts)
-- but had zero backing tables/handlers until this slice.

-- ─── Store team members ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dsh_store_team_members (
    id                      TEXT        PRIMARY KEY DEFAULT 'stm_' || replace(gen_random_uuid()::text, '-', ''),
    store_id                TEXT        NOT NULL REFERENCES dsh_stores(id) ON DELETE CASCADE,
    name                    TEXT        NOT NULL,
    role                    TEXT        NOT NULL DEFAULT 'staff'
                                CHECK (role IN ('owner','supervisor','staff','courier')),
    status                  TEXT        NOT NULL DEFAULT 'invited'
                                CHECK (status IN ('active','paused','invited','blocked','review-needed')),
    branch_assignment       TEXT        NOT NULL DEFAULT '',
    permissions_summary     TEXT        NOT NULL DEFAULT '',
    delivery_assignment     TEXT        NOT NULL DEFAULT '',
    invite_lifecycle        TEXT        NOT NULL DEFAULT '',
    operational_impact      TEXT        NOT NULL DEFAULT '',
    audit_note              TEXT        NOT NULL DEFAULT '',
    invited_identity        TEXT        NOT NULL DEFAULT '',
    invited_by_actor_id     TEXT        NOT NULL DEFAULT '',
    version                 INTEGER     NOT NULL DEFAULT 1,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_store_team_members_store_id
    ON dsh_store_team_members(store_id);
CREATE INDEX IF NOT EXISTS idx_dsh_store_team_members_status
    ON dsh_store_team_members(status);

-- ─── Store team member action audit trail ──────────────────────────────────

CREATE TABLE IF NOT EXISTS dsh_store_team_member_actions (
    id                      TEXT        PRIMARY KEY DEFAULT 'stma_' || replace(gen_random_uuid()::text, '-', ''),
    member_id               TEXT        NOT NULL REFERENCES dsh_store_team_members(id) ON DELETE CASCADE,
    store_id                TEXT        NOT NULL REFERENCES dsh_stores(id) ON DELETE CASCADE,
    action_label            TEXT        NOT NULL,
    from_status             TEXT        NOT NULL DEFAULT '',
    to_status               TEXT        NOT NULL DEFAULT '',
    actor_id                TEXT        NOT NULL DEFAULT '',
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_store_team_member_actions_member_id
    ON dsh_store_team_member_actions(member_id);

-- ─── Store courier settings (one row per store) ────────────────────────────
-- policy/pricing_source/compensation mirror the frontend enums exactly
-- (services/dsh/frontend/shared/store/store-delivery.types.ts).

CREATE TABLE IF NOT EXISTS dsh_store_courier_settings (
    store_id                TEXT        PRIMARY KEY REFERENCES dsh_stores(id) ON DELETE CASCADE,
    courier_name            TEXT        NOT NULL DEFAULT '',
    courier_phone           TEXT        NOT NULL DEFAULT '',
    is_active               BOOLEAN     NOT NULL DEFAULT false,
    policy                  TEXT        NOT NULL DEFAULT 'free_delivery'
                                CHECK (policy IN (
                                    'free_delivery',
                                    'courier_per_delivery_payout',
                                    'store_retained_fee_salary_courier'
                                )),
    pricing_source          TEXT        NOT NULL DEFAULT 'bthwani_pricing'
                                CHECK (pricing_source IN (
                                    'bthwani_pricing',
                                    'store_fixed_price',
                                    'control_panel_zone_pricing'
                                )),
    compensation            TEXT        NOT NULL DEFAULT 'none'
                                CHECK (compensation IN (
                                    'none',
                                    'fixed_per_delivery',
                                    'percentage_of_delivery_fee'
                                )),
    selected_branch_ids     TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
    version                 INTEGER     NOT NULL DEFAULT 1,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Store coverage zones ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dsh_store_coverage_zones (
    id                      TEXT        PRIMARY KEY DEFAULT 'scz_' || replace(gen_random_uuid()::text, '-', ''),
    store_id                TEXT        NOT NULL REFERENCES dsh_stores(id) ON DELETE CASCADE,
    name                    TEXT        NOT NULL,
    status                  TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('active','pending','blocked')),
    status_label            TEXT        NOT NULL DEFAULT '',
    branch_relation         TEXT        NOT NULL DEFAULT '',
    service_mode_relation   TEXT        NOT NULL DEFAULT '',
    policy_summary          TEXT        NOT NULL DEFAULT '',
    policy_reason           TEXT        NOT NULL DEFAULT '',
    operational_impact      TEXT        NOT NULL DEFAULT '',
    pricing_reference       TEXT        NOT NULL DEFAULT '',
    commission_reference    TEXT        NOT NULL DEFAULT '',
    payout_reference        TEXT        NOT NULL DEFAULT '',
    review_action_label     TEXT        NOT NULL DEFAULT '',
    audit_note              TEXT        NOT NULL DEFAULT '',
    version                 INTEGER     NOT NULL DEFAULT 1,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_store_coverage_zones_store_id
    ON dsh_store_coverage_zones(store_id);
CREATE INDEX IF NOT EXISTS idx_dsh_store_coverage_zones_status
    ON dsh_store_coverage_zones(status);
