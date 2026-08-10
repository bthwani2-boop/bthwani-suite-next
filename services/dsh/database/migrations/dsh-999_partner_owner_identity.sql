-- DSH-999: close the partner owner identity schema/runtime boundary.
--
-- Partner creation and canonical readback distinguish an authenticated owner
-- actor from a Workforce person reference. The runtime has required these
-- fields since governed partner creation was introduced, but the authoritative
-- DSH schema never persisted them. Keep legacy drafts representable with empty
-- values; transition readiness already fails closed until at least one owner
-- reference is supplied.

ALTER TABLE dsh_partners
  ADD COLUMN IF NOT EXISTS owner_actor_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS workforce_person_id TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_dsh_partners_operator_context_owner_actor
  ON dsh_partners (operator_context_id, owner_actor_id)
  WHERE btrim(owner_actor_id) <> '';

CREATE INDEX IF NOT EXISTS idx_dsh_partners_operator_context_workforce_person
  ON dsh_partners (operator_context_id, workforce_person_id)
  WHERE btrim(workforce_person_id) <> '';

COMMENT ON COLUMN dsh_partners.owner_actor_id IS
  'Authenticated partner owner actor reference; empty only for incomplete legacy or draft onboarding.';
COMMENT ON COLUMN dsh_partners.workforce_person_id IS
  'Workforce person reference captured by governed onboarding; empty when ownership is actor-backed.';
