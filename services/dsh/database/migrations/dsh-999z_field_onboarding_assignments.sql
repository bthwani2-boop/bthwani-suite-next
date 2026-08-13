-- DSH-999z: canonical field onboarding assignments.
-- Assignment is a bounded DSH business work item. It does not grant store
-- scope and does not create a partner/store until the field worker converts it.

CREATE TABLE IF NOT EXISTS dsh_field_onboarding_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_context_id TEXT NOT NULL,
  field_actor_id TEXT NOT NULL,
  store_name_hint TEXT NOT NULL,
  phone_hint TEXT,
  address_hint TEXT,
  location_latitude NUMERIC(9,6),
  location_longitude NUMERIC(9,6),
  status TEXT NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned', 'in_progress', 'draft_linked', 'cancelled')),
  draft_partner_id TEXT REFERENCES dsh_partners(id),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by_actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (phone_hint IS NOT NULL OR address_hint IS NOT NULL),
  CHECK ((location_latitude IS NULL) = (location_longitude IS NULL)),
  CHECK (location_latitude IS NULL OR (location_latitude >= -90 AND location_latitude <= 90)),
  CHECK (location_longitude IS NULL OR (location_longitude >= -180 AND location_longitude <= 180))
);

CREATE INDEX IF NOT EXISTS idx_dsh_field_onboarding_assignments_operator
  ON dsh_field_onboarding_assignments (operator_context_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsh_field_onboarding_assignments_actor
  ON dsh_field_onboarding_assignments (operator_context_id, field_actor_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS dsh_field_onboarding_assignment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES dsh_field_onboarding_assignments(id) ON DELETE CASCADE,
  operator_context_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'opened', 'reassigned', 'cancelled', 'draft_linked')),
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  previous_field_actor_id TEXT,
  next_field_actor_id TEXT,
  draft_partner_id TEXT REFERENCES dsh_partners(id),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_field_onboarding_assignment_events
  ON dsh_field_onboarding_assignment_events (assignment_id, created_at DESC);
