BEGIN;

CREATE TABLE IF NOT EXISTS wlt_store_onboarding_fee_policy_versions (
    id BIGSERIAL PRIMARY KEY,
    operator_context_id VARCHAR(128) NOT NULL,
    version INT NOT NULL CHECK (version > 0),
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    amount_minor_units BIGINT NOT NULL DEFAULT 0 CHECK (amount_minor_units >= 0),
    currency VARCHAR(3) NOT NULL,
    applies_to VARCHAR(64) NOT NULL,
    charge_timing VARCHAR(64) NOT NULL,
    actor_charged VARCHAR(64) NOT NULL DEFAULT 'partner',
    effective_from TIMESTAMP WITH TIME ZONE,
    notes VARCHAR(1000) NOT NULL DEFAULT '',
    reason VARCHAR(1000) NOT NULL,
    correlation_id VARCHAR(200) NOT NULL,
    idempotency_key VARCHAR(200) NOT NULL,
    created_by_actor_id VARCHAR(200) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT wlt_store_onboarding_fee_policy_versions_scope_version_uq
        UNIQUE (operator_context_id, version),
    CONSTRAINT wlt_store_onboarding_fee_policy_versions_scope_idempotency_uq
        UNIQUE (operator_context_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS wlt_store_onboarding_fee_policy_versions_scope_version_idx
    ON wlt_store_onboarding_fee_policy_versions (operator_context_id, version DESC);

CREATE TABLE IF NOT EXISTS wlt_store_onboarding_fee_policy_legacy_reviews (
    legacy_policy_id INT PRIMARY KEY,
    legacy_amount NUMERIC(12,2) NOT NULL,
    legacy_currency VARCHAR(3) NOT NULL,
    legacy_enabled BOOLEAN NOT NULL,
    legacy_applies_to VARCHAR(64) NOT NULL,
    legacy_charge_timing VARCHAR(64) NOT NULL,
    legacy_effective_from TIMESTAMP WITH TIME ZONE,
    amount_has_fractional_units BOOLEAN NOT NULL,
    review_status VARCHAR(64) NOT NULL DEFAULT 'requires_operator_context',
    detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CHECK (review_status IN ('requires_operator_context', 'reviewed'))
);

INSERT INTO wlt_store_onboarding_fee_policy_legacy_reviews (
    legacy_policy_id,
    legacy_amount,
    legacy_currency,
    legacy_enabled,
    legacy_applies_to,
    legacy_charge_timing,
    legacy_effective_from,
    amount_has_fractional_units
)
SELECT
    id,
    amount,
    currency,
    enabled,
    applies_to,
    charge_timing,
    effective_from,
    amount <> trunc(amount)
FROM wlt_financial_store_onboarding_fee_policy
ON CONFLICT (legacy_policy_id) DO NOTHING;

COMMENT ON TABLE wlt_store_onboarding_fee_policy_versions IS
    'Canonical immutable OperatorContext-scoped onboarding fee policy history. Current authority is the highest version for the scope; money is exact integer minor units and each version carries audit/idempotency metadata.';

COMMENT ON TABLE wlt_store_onboarding_fee_policy_legacy_reviews IS
    'Legacy singleton onboarding fee rows retained for finance review only. They are never canonical financial authority.';

COMMIT;
