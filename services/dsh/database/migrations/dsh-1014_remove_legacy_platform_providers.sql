-- DSH-1014: remove the retired local provider registry.
-- External provider configuration and health are owned by core/providers.
DROP TABLE IF EXISTS dsh_platform_providers;
