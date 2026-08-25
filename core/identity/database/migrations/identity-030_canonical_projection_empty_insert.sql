-- identity-030: canonical writers may create an actor with an empty derived
-- projection before the same transaction assigns normalized roles/grants.
-- The old roles-array check made that safe canonical sequence impossible and
-- forced callers back toward projection writes. Identity remains fail-closed:
-- the projection guard rejects non-empty direct writes, while canonical RBAC
-- writers rebuild it atomically after validating the normalized vocabulary.

ALTER TABLE identity_actors
    DROP CONSTRAINT IF EXISTS identity_actors_roles_nonempty_check;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'identity_actors_roles_nonempty_check'
          AND conrelid = 'identity_actors'::regclass
    ) THEN
        RAISE EXCEPTION 'legacy non-empty actor roles constraint remains after canonical projection cutover';
    END IF;
END
$$;
