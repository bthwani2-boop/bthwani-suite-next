-- wlt-907_financial_providers.sql

CREATE TABLE IF NOT EXISTS wlt_financial_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_type VARCHAR(100) NOT NULL, -- e.g., 'payment-gateway', 'payout-processor'
    environment VARCHAR(50) NOT NULL, -- e.g., 'sandbox', 'production'
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    is_maintenance BOOLEAN NOT NULL DEFAULT FALSE,
    secret_reference VARCHAR(255) NOT NULL, -- e.g., 'env:PAYMENT_GATEWAY_API_KEY'
    timeout_budget_ms INTEGER NOT NULL DEFAULT 15000,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_wlt_financial_providers_type_env ON wlt_financial_providers(provider_type, environment);
