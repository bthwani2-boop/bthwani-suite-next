-- dsh-908_jrn_006_privacy_audit_projection.sql
-- Requires dsh-078 and dsh-908 migrations.

DO $$
DECLARE
    forbidden_column TEXT;
BEGIN
    SELECT column_name INTO forbidden_column
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'dsh_client_address_privacy_audit_projection'
      AND column_name IN (
        'client_id', 'recipient_name', 'phone_e164', 'address_line',
        'building', 'floor', 'unit', 'delivery_instructions', 'latitude', 'longitude'
      )
    LIMIT 1;

    IF forbidden_column IS NOT NULL THEN
        RAISE EXCEPTION 'PII column leaked through privacy audit projection: %', forbidden_column;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'dsh_client_address_privacy_audit_projection'
          AND column_name = 'client_subject_hash'
    ) THEN
        RAISE EXCEPTION 'hashed subject column missing from privacy audit projection';
    END IF;
END;
$$;
