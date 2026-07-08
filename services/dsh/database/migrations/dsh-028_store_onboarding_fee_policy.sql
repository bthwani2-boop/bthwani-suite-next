-- DSH-028: Store onboarding fee policy (control-panel platform config).
-- A single, platform-wide policy row. DSH owns the policy DEFINITION only;
-- it never creates a ledger entry. WLT remains the sole owner of financial
-- truth once a settlement/payment for this fee is actually recorded.

CREATE TABLE IF NOT EXISTS dsh_platform_store_onboarding_fee_policy (
    id             SMALLINT     PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    enabled        BOOLEAN      NOT NULL DEFAULT FALSE,
    amount         NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency       TEXT         NOT NULL DEFAULT 'YER',
    applies_to     TEXT         NOT NULL DEFAULT 'first_store'
                       CHECK (applies_to IN ('first_store', 'additional_store', 'all_stores')),
    charge_timing  TEXT         NOT NULL DEFAULT 'on_approval'
                       CHECK (charge_timing IN ('on_approval', 'on_publication', 'on_first_order', 'manual')),
    actor_charged  TEXT         NOT NULL DEFAULT 'partner' CHECK (actor_charged = 'partner'),
    effective_from TIMESTAMPTZ,
    notes          TEXT         NOT NULL DEFAULT '',
    updated_by     TEXT,
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO dsh_platform_store_onboarding_fee_policy (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;
