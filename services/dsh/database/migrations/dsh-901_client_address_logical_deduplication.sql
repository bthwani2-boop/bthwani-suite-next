-- dsh-901_client_address_logical_deduplication.sql
-- JRN-005 forward closure: one active logical delivery address per client.
-- Existing exact operational duplicates are soft-deleted deterministically while
-- preserving the default/newest canonical row and retaining historical FK targets.

BEGIN;

CREATE OR REPLACE FUNCTION dsh_client_address_fingerprint(
    p_recipient_name TEXT,
    p_phone_e164 TEXT,
    p_address_line TEXT,
    p_service_area_code TEXT,
    p_building TEXT,
    p_floor TEXT,
    p_unit TEXT,
    p_delivery_instructions TEXT,
    p_latitude DOUBLE PRECISION,
    p_longitude DOUBLE PRECISION
)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
PARALLEL SAFE
AS $$
    SELECT md5(
        lower(btrim(COALESCE(p_recipient_name, ''))) || E'\x1f' ||
        btrim(COALESCE(p_phone_e164, '')) || E'\x1f' ||
        lower(btrim(COALESCE(p_address_line, ''))) || E'\x1f' ||
        lower(btrim(COALESCE(p_service_area_code, ''))) || E'\x1f' ||
        lower(btrim(COALESCE(p_building, ''))) || E'\x1f' ||
        lower(btrim(COALESCE(p_floor, ''))) || E'\x1f' ||
        lower(btrim(COALESCE(p_unit, ''))) || E'\x1f' ||
        lower(btrim(COALESCE(p_delivery_instructions, ''))) || E'\x1f' ||
        COALESCE(p_latitude::TEXT, '') || E'\x1f' ||
        COALESCE(p_longitude::TEXT, '')
    );
$$;

ALTER TABLE dsh_client_addresses
    ADD COLUMN IF NOT EXISTS address_fingerprint TEXT;

UPDATE dsh_client_addresses
SET address_fingerprint = dsh_client_address_fingerprint(
    recipient_name,
    phone_e164,
    address_line,
    service_area_code,
    building,
    floor,
    unit,
    delivery_instructions,
    latitude,
    longitude
)
WHERE address_fingerprint IS DISTINCT FROM dsh_client_address_fingerprint(
    recipient_name,
    phone_e164,
    address_line,
    service_area_code,
    building,
    floor,
    unit,
    delivery_instructions,
    latitude,
    longitude
);

ALTER TABLE dsh_client_addresses
    ALTER COLUMN address_fingerprint SET NOT NULL;

CREATE OR REPLACE FUNCTION dsh_refresh_client_address_fingerprint()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.address_fingerprint := dsh_client_address_fingerprint(
        NEW.recipient_name,
        NEW.phone_e164,
        NEW.address_line,
        NEW.service_area_code,
        NEW.building,
        NEW.floor,
        NEW.unit,
        NEW.delivery_instructions,
        NEW.latitude,
        NEW.longitude
    );
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_client_address_fingerprint ON dsh_client_addresses;
CREATE TRIGGER trg_dsh_client_address_fingerprint
BEFORE INSERT OR UPDATE OF
    recipient_name,
    phone_e164,
    address_line,
    service_area_code,
    building,
    floor,
    unit,
    delivery_instructions,
    latitude,
    longitude
ON dsh_client_addresses
FOR EACH ROW
EXECUTE FUNCTION dsh_refresh_client_address_fingerprint();

ALTER TABLE dsh_client_address_events
    DROP CONSTRAINT IF EXISTS dsh_client_address_events_action_check;
ALTER TABLE dsh_client_address_events
    ADD CONSTRAINT dsh_client_address_events_action_check
    CHECK (action IN ('created', 'updated', 'defaulted', 'deleted', 'deduplicated'));

WITH ranked AS (
    SELECT
        id,
        client_id,
        first_value(id) OVER (
            PARTITION BY client_id, address_fingerprint
            ORDER BY is_default DESC, updated_at DESC, id ASC
        ) AS canonical_id,
        row_number() OVER (
            PARTITION BY client_id, address_fingerprint
            ORDER BY is_default DESC, updated_at DESC, id ASC
        ) AS duplicate_rank
    FROM dsh_client_addresses
    WHERE deleted_at IS NULL
), deduplicated AS (
    UPDATE dsh_client_addresses AS address
    SET deleted_at = NOW(),
        is_default = FALSE,
        version = address.version + 1,
        updated_at = NOW()
    FROM ranked
    WHERE address.id = ranked.id
      AND ranked.duplicate_rank > 1
    RETURNING
        address.id,
        address.client_id,
        address.version,
        ranked.canonical_id
)
INSERT INTO dsh_client_address_events (
    address_id,
    client_id,
    action,
    version,
    metadata
)
SELECT
    id,
    client_id,
    'deduplicated',
    version,
    jsonb_build_object(
        'canonicalAddressId', canonical_id,
        'reason', 'logical_duplicate',
        'migration', 'dsh-901'
    )
FROM deduplicated;

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_client_addresses_active_fingerprint
    ON dsh_client_addresses(client_id, address_fingerprint)
    WHERE deleted_at IS NULL;

COMMENT ON COLUMN dsh_client_addresses.address_fingerprint IS
    'Server-owned normalized signature for preventing duplicate active delivery addresses per client.';

COMMIT;
