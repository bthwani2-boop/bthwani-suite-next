-- Identity-008: register administrative employee access codes in the persisted
-- activation challenge contract. Employee access codes are platform-issued,
-- actor-bound invitations for the control-panel surface; they are not phone OTPs.

ALTER TABLE identity_activation_challenges
  DROP CONSTRAINT IF EXISTS identity_activation_challenges_actor_type_check,
  DROP CONSTRAINT IF EXISTS identity_activation_challenges_surface_check;

-- Repair rows created while the employee surface was incorrectly named webapp.
-- The code hash does not contain the surface, so preserving a still-valid pending
-- invitation while correcting its target is safe and keeps retries idempotent.
UPDATE identity_activation_challenges
SET surface = 'control-panel', updated_at = now()
WHERE actor_type = 'employee' AND surface = 'webapp';

ALTER TABLE identity_activation_challenges
  ADD CONSTRAINT identity_activation_challenges_actor_type_check
    CHECK (actor_type IN ('field', 'captain', 'client', 'partner', 'operator', 'employee')),
  ADD CONSTRAINT identity_activation_challenges_surface_check
    CHECK (surface IN ('app-field', 'app-captain', 'app-client', 'app-partner', 'control-panel'));

COMMENT ON COLUMN identity_activation_challenges.actor_type IS
  'Actor class receiving the challenge. employee is an administrative Workforce identity.';

COMMENT ON COLUMN identity_activation_challenges.surface IS
  'Single target surface. Administrative employee first-login invitations target control-panel.';
