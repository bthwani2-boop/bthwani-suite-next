-- dsh-993_client_profiles.sql
-- Operational profiles and preferences for clients (authenticated customers).
-- Core identity (name, auth credentials) remains in the Identity service.

BEGIN;

CREATE TABLE IF NOT EXISTS dsh_client_profiles (
    client_id                TEXT        PRIMARY KEY,
    locale                   TEXT        NOT NULL DEFAULT 'ar-SA',
    currency_preference      TEXT        NOT NULL DEFAULT 'SAR',
    marketing_consent_email  BOOLEAN     NOT NULL DEFAULT FALSE,
    marketing_consent_sms    BOOLEAN     NOT NULL DEFAULT FALSE,
    marketing_consent_push   BOOLEAN     NOT NULL DEFAULT FALSE,
    version                  INTEGER     NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT dsh_client_profiles_locale_check CHECK (char_length(locale) BETWEEN 2 AND 10),
    CONSTRAINT dsh_client_profiles_currency_check CHECK (char_length(currency_preference) = 3)
);

CREATE TABLE IF NOT EXISTS dsh_client_profile_events (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id      TEXT        NOT NULL,
    action         TEXT        NOT NULL CHECK (action IN ('created', 'preferences_updated', 'consents_updated')),
    version        INTEGER     NOT NULL CHECK (version >= 1),
    correlation_id TEXT,
    metadata       JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_client_profile_events_client
  ON dsh_client_profile_events(client_id, created_at DESC);

COMMIT;
