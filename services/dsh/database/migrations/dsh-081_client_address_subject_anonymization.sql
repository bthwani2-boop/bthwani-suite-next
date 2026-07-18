-- dsh-081_client_address_subject_anonymization.sql
-- Strengthens irreversible anonymization by severing the deleted address-book
-- row from the original client subject and scrubbing historical address-event
-- metadata that could retain address details. Order snapshots are governed by
-- their own operational and legal retention policy.

BEGIN;

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
    v_subject_hash TEXT;
    v_deleted_subject TEXT;
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
        v_subject_hash := encode(digest(v_row.client_id, 'sha256'), 'hex');
        v_deleted_subject := 'deleted:' || encode(
            digest(v_row.client_id || ':' || v_row.id, 'sha256'),
            'hex'
        );

        UPDATE dsh_client_address_events
           SET client_id = v_deleted_subject,
               correlation_id = NULL,
               metadata = jsonb_build_object('piiAnonymized', TRUE)
         WHERE address_id = v_row.id;

        UPDATE dsh_client_addresses
           SET client_id = v_deleted_subject,
               label = 'deleted',
               recipient_name = 'deleted-user',
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
            v_subject_hash,
            'anonymized',
            p_actor_id,
            NULLIF(btrim(COALESCE(p_correlation_id, '')), ''),
            v_policy_version,
            jsonb_build_object(
                'anonymizedAt', NOW(),
                'subjectLinkSevered', TRUE,
                'addressEventsScrubbed', TRUE
            )
        );

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

COMMIT;
