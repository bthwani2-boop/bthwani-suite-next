-- J002: case-insensitive username uniqueness for concurrency-safe actor provisioning.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM identity_actors
    GROUP BY lower(btrim(username))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_CANONICAL_ACTOR_USERNAME';
  END IF;
END $$;

ALTER TABLE identity_actors
  DROP CONSTRAINT IF EXISTS identity_actors_username_key;

CREATE UNIQUE INDEX IF NOT EXISTS identity_actors_username_key
  ON identity_actors ((lower(btrim(username))));
