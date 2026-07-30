-- JRN-039: provider registry must not bootstrap active runtime truth from mock credentials.
-- Existing installations receive the same cleanup as fresh installations after providers-001.

UPDATE external_providers
SET active = false,
    credentials = '{}'::jsonb,
    parameters = parameters - 'healthUrl',
    updated_at = now()
WHERE provider_id IN ('sms-twilio', 'maps-google', 'payment-wlt-mock')
  AND (
    credentials::text ILIKE '%"mock"%'
    OR code = 'wlt-mock'
  );

CREATE INDEX IF NOT EXISTS external_providers_kind_active_idx
  ON external_providers (kind, active, updated_at DESC);

COMMENT ON COLUMN external_providers.credentials IS
  'Backend-only secret material. Never return it in API responses, audit payloads, logs, or frontend state.';

COMMENT ON COLUMN external_providers.parameters IS
  'Non-secret provider parameters. healthUrl is probed only when its hostname is explicitly allowlisted at runtime.';
