ALTER TABLE identity_actors
  ADD COLUMN IF NOT EXISTS phone_e164 text;

CREATE UNIQUE INDEX IF NOT EXISTS identity_actors_phone_e164_idx
  ON identity_actors(phone_e164)
  WHERE phone_e164 IS NOT NULL;

CREATE TABLE IF NOT EXISTS identity_activation_challenges (
  id                 text PRIMARY KEY,
  actor_id           text NOT NULL REFERENCES identity_actors(id) ON DELETE CASCADE,
  actor_type         text NOT NULL CHECK (actor_type IN ('field', 'captain')),
  phone_e164         text NOT NULL,
  surface            text NOT NULL CHECK (surface IN ('app-field', 'app-captain')),
  code_hash          text NOT NULL,
  status             text NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'consumed', 'revoked', 'expired', 'locked')),
  attempts           integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  expires_at         timestamptz NOT NULL,
  consumed_at        timestamptz,
  issued_by_actor_id text NOT NULL REFERENCES identity_actors(id),
  idempotency_key    text,
  correlation_id     text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS identity_activation_one_pending_idx
  ON identity_activation_challenges(actor_type, phone_e164)
  WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS identity_activation_idempotency_idx
  ON identity_activation_challenges(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS identity_activation_lookup_idx
  ON identity_activation_challenges(actor_type, phone_e164, surface, created_at DESC);
