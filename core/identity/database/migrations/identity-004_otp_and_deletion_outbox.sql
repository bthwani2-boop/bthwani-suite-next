-- Identity OTP expansion and account deletion outbox

ALTER TABLE identity_activation_challenges
  DROP CONSTRAINT IF EXISTS identity_activation_challenges_actor_type_check,
  DROP CONSTRAINT IF EXISTS identity_activation_challenges_surface_check;

ALTER TABLE identity_activation_challenges
  ADD CONSTRAINT identity_activation_challenges_actor_type_check
    CHECK (actor_type IN ('field', 'captain', 'client', 'partner', 'operator')),
  ADD CONSTRAINT identity_activation_challenges_surface_check
    CHECK (surface IN ('app-field', 'app-captain', 'app-client', 'app-partner', 'control-panel'));

CREATE TABLE IF NOT EXISTS identity_account_deletions_outbox (
  id              bigserial PRIMARY KEY,
  actor_id        text NOT NULL,
  phone_e164      text NOT NULL,
  processed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
