CREATE TABLE workforce_provisioning_cases (
    id UUID PRIMARY KEY,
    idempotency_key VARCHAR(128) NOT NULL,
    status VARCHAR(64) NOT NULL,
    workforce_kind VARCHAR(32) NOT NULL,
    actor_id VARCHAR(64),
    workforce_code VARCHAR(32),
    payload JSONB NOT NULL,
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_workforce_provisioning_cases_idempotency
ON workforce_provisioning_cases(idempotency_key);
