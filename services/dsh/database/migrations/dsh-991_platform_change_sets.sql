BEGIN;

-- 1. Create the platform change sets table (J015)
CREATE TABLE IF NOT EXISTS dsh_platform_change_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type VARCHAR(64) NOT NULL, -- e.g. ZONE, SLA_RULE, CAPACITY_CONFIG
    target_id VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT', -- DRAFT, REVIEW, APPROVED, SCHEDULED, APPLIED, ROLLED_BACK, FAILED
    base_version INT NOT NULL,
    proposed_payload JSONB NOT NULL,
    created_by VARCHAR(64) NOT NULL,
    reviewed_by VARCHAR(64),
    approved_by VARCHAR(64),
    applied_by VARCHAR(64),
    effective_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dsh_platform_change_sets_target ON dsh_platform_change_sets(target_type, target_id);
CREATE INDEX idx_dsh_platform_change_sets_status ON dsh_platform_change_sets(status);

-- 2. Drop the improperly placed financial policy from DSH (J017)
DROP TABLE IF EXISTS dsh_platform_store_onboarding_fee_policy;

COMMIT;
