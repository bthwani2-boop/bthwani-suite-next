-- JRN-002 FS-05: database invariants, concurrency indexes, and retention support.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'identity_actors_roles_nonempty_check'
  ) THEN
    ALTER TABLE identity_actors
      ADD CONSTRAINT identity_actors_roles_nonempty_check
      CHECK (cardinality(roles) > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'identity_actors_phone_e164_check'
  ) THEN
    ALTER TABLE identity_actors
      ADD CONSTRAINT identity_actors_phone_e164_check
      CHECK (phone_e164 IS NULL OR phone_e164 ~ '^\+[1-9][0-9]{7,14}$');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'identity_sessions_expiry_order_check'
  ) THEN
    ALTER TABLE identity_sessions
      ADD CONSTRAINT identity_sessions_expiry_order_check
      CHECK (refresh_expires_at > access_expires_at AND access_expires_at > created_at);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'identity_sessions_revocation_time_check'
  ) THEN
    ALTER TABLE identity_sessions
      ADD CONSTRAINT identity_sessions_revocation_time_check
      CHECK (revoked_at IS NULL OR revoked_at >= created_at);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'identity_activation_attempts_upper_check'
  ) THEN
    ALTER TABLE identity_activation_challenges
      ADD CONSTRAINT identity_activation_attempts_upper_check
      CHECK (attempts <= 5);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'identity_activation_consumed_time_check'
  ) THEN
    ALTER TABLE identity_activation_challenges
      ADD CONSTRAINT identity_activation_consumed_time_check
      CHECK (
        (status = 'consumed' AND consumed_at IS NOT NULL)
        OR (status <> 'consumed' AND consumed_at IS NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS identity_sessions_actor_active_idx
  ON identity_sessions(actor_id, access_expires_at DESC)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS identity_activation_pending_expiry_idx
  ON identity_activation_challenges(expires_at, actor_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS identity_account_deletions_outbox_pending_idx
  ON identity_account_deletions_outbox(created_at, id)
  WHERE processed_at IS NULL;

COMMENT ON TABLE identity_sessions IS
  'Sovereign JRN-002 access/refresh sessions; refresh tokens rotate and revoked sessions never reactivate.';
COMMENT ON TABLE identity_activation_challenges IS
  'Typed, surface-bound, single-use activation challenges with bounded attempts.';
