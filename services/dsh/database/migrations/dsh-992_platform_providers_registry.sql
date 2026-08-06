-- dsh-992_platform_providers_registry.sql

CREATE TABLE IF NOT EXISTS dsh_platform_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain VARCHAR(100) NOT NULL, -- e.g., 'map', 'sms', 'notification'
    capability VARCHAR(100) NOT NULL, -- e.g., 'reverse-geocoding', 'otp-sms'
    environment VARCHAR(50) NOT NULL, -- e.g., 'sandbox', 'production'
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    is_maintenance BOOLEAN NOT NULL DEFAULT FALSE,
    secret_reference VARCHAR(255) NOT NULL, -- e.g., 'env:MAP_PROVIDER_API_KEY' or 'secret-manager:prod/map/key'
    timeout_budget_ms INTEGER NOT NULL DEFAULT 8000,
    retry_budget INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_health_check_at TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX idx_dsh_platform_providers_domain_capability_env ON dsh_platform_providers(domain, capability, environment);
