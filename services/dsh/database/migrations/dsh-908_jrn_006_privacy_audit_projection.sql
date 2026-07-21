-- dsh-908_jrn_006_privacy_audit_projection.sql
-- Exposes only hashed-subject privacy events. Raw client/address PII is structurally absent.

BEGIN;

CREATE OR REPLACE VIEW dsh_client_address_privacy_audit_projection AS
SELECT
    id AS event_id,
    address_id,
    client_subject_hash,
    action,
    actor_id,
    correlation_id,
    policy_version,
    metadata,
    created_at
FROM dsh_client_address_privacy_events;

COMMENT ON VIEW dsh_client_address_privacy_audit_projection IS
'JRN-006 PII-safe audit projection. It intentionally excludes client_id, recipient_name, phone_e164, address_line, delivery instructions, and coordinates.';

COMMIT;
