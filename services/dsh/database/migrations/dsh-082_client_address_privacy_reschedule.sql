-- dsh-082_client_address_privacy_reschedule.sql
-- Any policy change must immediately reclassify every deleted, non-anonymized
-- address. This keeps database truth correct even when the policy is changed
-- through a future worker or administrative integration.

BEGIN;

CREATE OR REPLACE FUNCTION dsh_reschedule_client_address_privacy_queue()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.enabled THEN
        UPDATE dsh_client_addresses
           SET pii_purge_after = deleted_at + make_interval(days => NEW.retention_days),
               updated_at = NOW()
         WHERE deleted_at IS NOT NULL
           AND pii_anonymized_at IS NULL;
    ELSE
        UPDATE dsh_client_addresses
           SET pii_purge_after = NULL,
               updated_at = NOW()
         WHERE deleted_at IS NOT NULL
           AND pii_anonymized_at IS NULL;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_client_address_privacy_policy_reschedule
    ON dsh_client_address_privacy_policy;
CREATE TRIGGER trg_dsh_client_address_privacy_policy_reschedule
AFTER UPDATE OF enabled, retention_days
ON dsh_client_address_privacy_policy
FOR EACH ROW
WHEN (
    OLD.enabled IS DISTINCT FROM NEW.enabled OR
    OLD.retention_days IS DISTINCT FROM NEW.retention_days
)
EXECUTE FUNCTION dsh_reschedule_client_address_privacy_queue();

COMMIT;
