-- Enforce activation-to-session causality at the database boundary.
--
-- Password, refresh and already-active login flows do not update the actor row
-- in the same transaction as session creation. Activation flows do update the
-- actor and must also consume an actor-bound challenge in that transaction.
-- This blocks retired universal-code paths that activate an actor and create a
-- session without consuming a real challenge, even if an HTTP middleware is
-- bypassed by an internal caller.
CREATE OR REPLACE FUNCTION identity_require_consumed_challenge_for_activation_session()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  actor_updated_at timestamptz;
BEGIN
  SELECT updated_at
  INTO actor_updated_at
  FROM identity_actors
  WHERE id = NEW.actor_id;

  IF actor_updated_at = transaction_timestamp()
     AND NOT EXISTS (
       SELECT 1
       FROM identity_activation_challenges
       WHERE actor_id = NEW.actor_id
         AND status = 'consumed'
         AND consumed_at = transaction_timestamp()
     )
  THEN
    RAISE EXCEPTION 'session creation requires a consumed activation challenge'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS identity_activation_session_causality_guard
  ON identity_sessions;

CREATE TRIGGER identity_activation_session_causality_guard
BEFORE INSERT ON identity_sessions
FOR EACH ROW
EXECUTE FUNCTION identity_require_consumed_challenge_for_activation_session();
