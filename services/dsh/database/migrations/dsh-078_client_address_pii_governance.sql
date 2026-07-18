-- dsh-078_client_address_pii_governance.sql
-- Governs retention and irreversible anonymization of deleted client addresses.
-- Active addresses remain operational DSH truth; deleted address snapshots already
-- embedded in immutable orders are governed separately by order-retention policy.

BEGIN;

CREATE TABLE IF NOT EXISTS dsh_client_address_privacy_policy (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    retention_days INTEGER NOT NULL DEFAULT 30 CHECK (retention_days BETWEEN 0 AND 3650),
    batch_limit INTEGER NOT NULL DEFAULT 500 CHECK (batch_limit BETWEEN 1 AND 10000),
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    updated_by TEXT NOT NULL DEFAULT 'system',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO dsh_client_address_privacy_policy (
    id, enabled, retention_days, batch_limit, updated_by
) VALUES (1, TRUE, 30, 500, 'migration')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE dsh_client_addresses
    ADD COLUMN IF NOT EXISTS pii_purge_after TIMESTAMPTZ;
ALTER TABLE dsh_client_addresses
    ADD COLUMN IF NOT EXISTS pii_anonymized_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_dsh_client_addresses_pii_purge_due
    ON dsh_client_addresses(pii_purge_after, id)
    WHERE deleted_at IS NOT NULL AND pii_anonymized_at IS NULL;

CREATE TABLE IF NOT EXISTS dsh_client_address_privacy_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    address_id TEXT NOT NULL,
    client_subject_hash TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('retention_scheduled', 'anonymized', 'policy_updated')),
    actor_id TEXT NOT NULL,
    correlation_id TEXT,
    policy_version INTEGER NOT NULL CHECK (policy_version >= 1),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_client_address_privacy_events_address
    ON dsh_client_address_privacy_events(address_id, created_at DESC);

CREATE TABLE IF NOT EXISTS dsh_client_address_privacy_mutation_results (
    actor_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    response_body JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (actor_id, operation, idempotency_key)
);

CREATE OR REPLACE FUNCTION dsh_schedule_client_address_pii_purge()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_enabled BOOLEAN;
    v_retention_days INTEGER;
    v_policy_version INTEGER;
BEGIN
    IF NEW.deleted_at IS NULL OR NEW.pii_anonymized_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    SELECT enabled, retention_days, version
      INTO v_enabled, v_retention_days, v_policy_version
      FROM dsh_client_address_privacy_policy
     WHERE id = 1;

    IF NOT v_enabled THEN
        NEW.pii_purge_after := NULL;
        RETURN NEW;
    END IF;

    NEW.pii_purge_after := COALESCE(
        NEW.pii_purge_after,
        NEW.deleted_at + make_interval(days => v_retention_days)
    );

    IF TG_OP = 'UPDATE' AND OLD.deleted_at IS NULL THEN
        INSERT INTO dsh_client_address_privacy_events (
            address_id,
            client_subject_hash,
            action,
            actor_id,
            policy_version,
            metadata
        ) VALUES (
            NEW.id,
            encode(digest(NEW.client_id, 'sha256'), 'hex'),
            'retention_scheduled',
            'database-trigger',
            v_policy_version,
            jsonb_build_object('purgeAfter', NEW.pii_purge_after)
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_client_address_pii_schedule
    ON dsh_client_addresses;
CREATE TRIGGER trg_dsh_client_address_pii_schedule
BEFORE UPDATE OF deleted_at ON dsh_client_addresses
FOR EACH ROW
EXECUTE FUNCTION dsh_schedule_client_address_pii_purge();

UPDATE dsh_client_addresses a
   SET pii_purge_after = a.deleted_at + make_interval(days => p.retention_days)
  FROM dsh_client_address_privacy_policy p
 WHERE p.id = 1
   AND p.enabled = TRUE
   AND a.deleted_at IS NOT NULL
   AND a.pii_anonymized_at IS NULL
   AND a.pii_purge_after IS NULL;

CREATE OR REPLACE FUNCTION dsh_anonymize_expired_client_addresses(
    p_batch_limit INTEGER,
    p_actor_id TEXT,
    p_correlation_id TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_limit INTEGER;
    v_policy_version INTEGER;
    v_count INTEGER := 0;
    v_row RECORD;
BEGIN
    IF btrim(COALESCE(p_actor_id, '')) = '' THEN
        RAISE EXCEPTION 'actor id is required';
    END IF;

    SELECT LEAST(GREATEST(COALESCE(p_batch_limit, batch_limit), 1), 10000), version
      INTO v_limit, v_policy_version
      FROM dsh_client_address_privacy_policy
     WHERE id = 1
       AND enabled = TRUE;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    FOR v_row IN
        SELECT id, client_id
          FROM dsh_client_addresses
         WHERE deleted_at IS NOT NULL
           AND pii_anonymized_at IS NULL
           AND pii_purge_after IS NOT NULL
           AND pii_purge_after <= NOW()
         ORDER BY pii_purge_after, id
         FOR UPDATE SKIP LOCKED
         LIMIT v_limit
    LOOP
        UPDATE dsh_client_addresses
           SET recipient_name = 'deleted-user',
               phone_e164 = '+96700000000',
               address_line = 'deleted-address',
               service_area_code = 'deleted',
               building = NULL,
               floor = NULL,
               unit = NULL,
               delivery_instructions = NULL,
               latitude = NULL,
               longitude = NULL,
               create_idempotency_key = 'anonymized:' || id,
               pii_anonymized_at = NOW(),
               updated_at = NOW(),
               version = version + 1
         WHERE id = v_row.id;

        INSERT INTO dsh_client_address_privacy_events (
            address_id,
            client_subject_hash,
            action,
            actor_id,
            correlation_id,
            policy_version,
            metadata
        ) VALUES (
            v_row.id,
            encode(digest(v_row.client_id, 'sha256'), 'hex'),
            'anonymized',
            p_actor_id,
            NULLIF(btrim(COALESCE(p_correlation_id, '')), ''),
            v_policy_version,
            jsonb_build_object('anonymizedAt', NOW())
        );

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

COMMIT;
