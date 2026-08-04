BEGIN;

CREATE TABLE IF NOT EXISTS wlt_financial_store_onboarding_fee_policy (
    id SERIAL PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'YER',
    applies_to VARCHAR(64) NOT NULL DEFAULT 'first_store',
    charge_timing VARCHAR(64) NOT NULL DEFAULT 'on_approval',
    actor_charged VARCHAR(64) NOT NULL DEFAULT 'partner',
    effective_from TIMESTAMP WITH TIME ZONE,
    notes VARCHAR(1000) NOT NULL DEFAULT '',
    updated_by VARCHAR(64),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version INT NOT NULL DEFAULT 1
);

INSERT INTO wlt_financial_store_onboarding_fee_policy (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

COMMIT;
