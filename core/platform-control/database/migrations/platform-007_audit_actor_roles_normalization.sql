-- PLATFORM-007: preserve a non-null audit role set for internal and test callers.
-- PostgreSQL column defaults do not apply when a client explicitly supplies
-- NULL. The repository uses pq.Array for actor roles, and a nil Go slice is
-- encoded as NULL. Normalize that boundary to the canonical empty role array
-- before the NOT NULL constraint is evaluated.

ALTER TABLE platform_audit_events
    ALTER COLUMN actor_roles SET DEFAULT ARRAY[]::TEXT[];

CREATE OR REPLACE FUNCTION platform_normalize_audit_actor_roles()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.actor_roles IS NULL THEN
        NEW.actor_roles := ARRAY[]::TEXT[];
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_platform_normalize_audit_actor_roles
    ON platform_audit_events;

CREATE TRIGGER trg_platform_normalize_audit_actor_roles
BEFORE INSERT OR UPDATE OF actor_roles
ON platform_audit_events
FOR EACH ROW
EXECUTE FUNCTION platform_normalize_audit_actor_roles();

COMMENT ON FUNCTION platform_normalize_audit_actor_roles() IS
    'Normalizes explicit NULL audit actor roles to the canonical empty text array before NOT NULL enforcement.';
