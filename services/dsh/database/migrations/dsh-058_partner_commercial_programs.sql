-- DSH-058: governed partner/client commercial programs
--
-- DSH owns program definitions, eligibility and client-visible entitlement
-- references. WLT remains the source of truth for payment, settlement, refunds
-- and any monetary movement. No synthetic subscription payment success is
-- represented by these tables.

CREATE TABLE IF NOT EXISTS dsh_loyalty_tiers (
    id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ar                      TEXT NOT NULL,
    name_en                      TEXT NOT NULL DEFAULT '',
    min_points                   BIGINT NOT NULL DEFAULT 0 CHECK (min_points >= 0),
    discount_percent             NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    free_delivery_threshold_yer  BIGINT NOT NULL DEFAULT 0 CHECK (free_delivery_threshold_yer >= 0),
    badge                        TEXT NOT NULL DEFAULT '',
    status                       TEXT NOT NULL DEFAULT 'draft'
                                 CHECK (status IN ('draft','active','paused','archived')),
    version                      INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    created_by_actor_id          TEXT NOT NULL DEFAULT '',
    approved_by_actor_id         TEXT NOT NULL DEFAULT '',
    approved_at                  TIMESTAMPTZ,
    archived_at                  TIMESTAMPTZ,
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_loyalty_tiers_name_ar_live
    ON dsh_loyalty_tiers (lower(name_ar))
    WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dsh_loyalty_tiers_status
    ON dsh_loyalty_tiers (status) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS dsh_subscription_plans (
    id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ar                      TEXT NOT NULL,
    name_en                      TEXT NOT NULL DEFAULT '',
    price_yer                    BIGINT NOT NULL CHECK (price_yer > 0),
    billing_cycle                TEXT NOT NULL CHECK (billing_cycle IN ('monthly','quarterly','annual')),
    include_free_delivery        BOOLEAN NOT NULL DEFAULT FALSE,
    points_multiplier            NUMERIC(6,2) NOT NULL DEFAULT 1 CHECK (points_multiplier >= 1),
    order_cap                    INTEGER NOT NULL DEFAULT 0 CHECK (order_cap >= 0),
    badge                        TEXT NOT NULL DEFAULT '',
    status                       TEXT NOT NULL DEFAULT 'draft'
                                 CHECK (status IN ('draft','active','paused','archived')),
    wlt_product_reference        TEXT NOT NULL DEFAULT '',
    version                      INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    created_by_actor_id          TEXT NOT NULL DEFAULT '',
    approved_by_actor_id         TEXT NOT NULL DEFAULT '',
    approved_at                  TIMESTAMPTZ,
    archived_at                  TIMESTAMPTZ,
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_subscription_plans_name_ar_live
    ON dsh_subscription_plans (lower(name_ar))
    WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dsh_subscription_plans_status
    ON dsh_subscription_plans (status) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS dsh_client_loyalty_accounts (
    client_actor_id              TEXT PRIMARY KEY,
    points_balance               BIGINT NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
    lifetime_points              BIGINT NOT NULL DEFAULT 0 CHECK (lifetime_points >= 0),
    tier_id                      UUID REFERENCES dsh_loyalty_tiers(id) ON DELETE SET NULL,
    version                      INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dsh_loyalty_ledger (
    id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_actor_id              TEXT NOT NULL REFERENCES dsh_client_loyalty_accounts(client_actor_id) ON DELETE RESTRICT,
    points_delta                 BIGINT NOT NULL CHECK (points_delta <> 0),
    balance_after                BIGINT NOT NULL CHECK (balance_after >= 0),
    event_type                   TEXT NOT NULL,
    source_type                  TEXT NOT NULL,
    source_id                    TEXT NOT NULL,
    idempotency_key              TEXT NOT NULL,
    created_by_actor_id          TEXT NOT NULL DEFAULT '',
    metadata                     JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (client_actor_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_dsh_loyalty_ledger_client_created
    ON dsh_loyalty_ledger (client_actor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS dsh_client_subscriptions (
    id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_actor_id              TEXT NOT NULL,
    plan_id                      UUID NOT NULL REFERENCES dsh_subscription_plans(id) ON DELETE RESTRICT,
    status                       TEXT NOT NULL DEFAULT 'pending_payment'
                                 CHECK (status IN ('pending_payment','active','paused','expired','cancelled','payment_failed')),
    wlt_subscription_reference   TEXT NOT NULL DEFAULT '',
    starts_at                    TIMESTAMPTZ,
    ends_at                      TIMESTAMPTZ,
    version                      INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (client_actor_id, plan_id)
);

CREATE INDEX IF NOT EXISTS idx_dsh_client_subscriptions_actor_status
    ON dsh_client_subscriptions (client_actor_id, status);

COMMENT ON COLUMN dsh_subscription_plans.wlt_product_reference IS
    'Reference only. WLT owns price collection and monetary transaction truth.';
COMMENT ON COLUMN dsh_client_subscriptions.wlt_subscription_reference IS
    'Reference only. Active status must be produced from a verified WLT event, never from client input.';
