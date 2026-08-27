-- wlt-948: seed the financial rail registry authority.
--
-- The financial rail fails closed without the wlt_financial_providers
-- registry (root #5 closure): unenforced money movement is forbidden in
-- every mode. This seed guarantees every environment that runs the wlt
-- migrations starts with an ACTIVE, non-maintenance sandbox payment-gateway
-- authority, so mock/sandbox flows keep working while active/maintenance/
-- timeout enforcement is genuinely enforced. Production rows must be
-- provisioned explicitly by deployment, never by this seed.

INSERT INTO wlt_financial_providers (provider_type, environment, is_active, is_maintenance, secret_reference, timeout_budget_ms)
VALUES ('payment-gateway', 'sandbox', true, false, 'env:WLT_FINANCIAL_PROVIDER_SANDBOX_SECRET', 15000)
ON CONFLICT (provider_type, environment) DO NOTHING;
