-- Core Providers initial schema defining external technical provider configurations,
-- credentials, fallbacks, and audit logging.

CREATE TABLE IF NOT EXISTS external_providers (
  provider_id  text PRIMARY KEY,
  kind         text NOT NULL CHECK (kind IN ('sms', 'maps', 'payment', 'push', 'email', 'storage', 'search', 'fraud')),
  code         text NOT NULL UNIQUE,
  active       boolean NOT NULL DEFAULT false,
  credentials  jsonb NOT NULL DEFAULT '{}'::jsonb,
  parameters   jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS providers_action_audit (
  id              bigserial PRIMARY KEY,
  actor_id        text NOT NULL,
  actor_role      text NOT NULL,
  target_id       text,
  action          text NOT NULL,
  from_state      jsonb,
  to_state        jsonb,
  reason          text,
  correlation_id  text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS providers_idempotency (
  actor_id        text NOT NULL,
  operation       text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash    text NOT NULL,
  response_body   jsonb NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_id, operation, idempotency_key)
);

INSERT INTO external_providers (provider_id, kind, code, active, credentials, parameters) VALUES
  ('sms-twilio', 'sms', 'twilio', true, '{"account_sid": "mock", "auth_token": "mock"}'::jsonb, '{"sender": "BThwani"}'::jsonb),
  ('maps-google', 'maps', 'google-maps', true, '{"api_key": "mock"}'::jsonb, '{}'::jsonb),
  ('payment-wlt-mock', 'payment', 'wlt-mock', true, '{}'::jsonb, '{}'::jsonb)
ON CONFLICT (provider_id) DO NOTHING;
