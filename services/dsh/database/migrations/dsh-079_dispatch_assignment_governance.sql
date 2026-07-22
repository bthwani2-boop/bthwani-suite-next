-- Governed captain assignment and distribution.
-- DSH owns operational dispatch truth; financial truth remains outside this scope.

ALTER TABLE dsh_assignments
  ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS service_area_code text,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS priority smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS distance_meters integer,
  ADD COLUMN IF NOT EXISTS offer_reason text,
  ADD COLUMN IF NOT EXISTS response_reason text,
  ADD COLUMN IF NOT EXISTS expired_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by text,
  ADD COLUMN IF NOT EXISTS supersedes_assignment_id uuid REFERENCES dsh_assignments(id),
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

ALTER TABLE dsh_assignments DROP CONSTRAINT IF EXISTS dsh_assignments_priority_check;
ALTER TABLE dsh_assignments ADD CONSTRAINT dsh_assignments_priority_check
  CHECK (priority BETWEEN 0 AND 100);

ALTER TABLE dsh_assignments DROP CONSTRAINT IF EXISTS dsh_assignments_distance_meters_check;
ALTER TABLE dsh_assignments ADD CONSTRAINT dsh_assignments_distance_meters_check
  CHECK (distance_meters IS NULL OR distance_meters >= 0);

ALTER TABLE dsh_assignments DROP CONSTRAINT IF EXISTS dsh_assignments_version_check;
ALTER TABLE dsh_assignments ADD CONSTRAINT dsh_assignments_version_check
  CHECK (version > 0);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_assignments_tenant_idempotency
  ON dsh_assignments(tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dsh_assignments_active_captain
  ON dsh_assignments(tenant_id, captain_id, response_deadline_at)
  WHERE status IN ('offered', 'accepted');

CREATE INDEX IF NOT EXISTS idx_dsh_assignments_active_order
  ON dsh_assignments(tenant_id, order_id, created_at DESC)
  WHERE order_id IS NOT NULL AND status IN ('offered', 'accepted');

CREATE TABLE IF NOT EXISTS dsh_captain_dispatch_profiles (
  tenant_id             text        NOT NULL DEFAULT 'default',
  captain_id            text        NOT NULL,
  accreditation_status  text        NOT NULL DEFAULT 'pending'
    CHECK (accreditation_status IN ('pending', 'approved', 'suspended', 'expired')),
  availability_status   text        NOT NULL DEFAULT 'offline'
    CHECK (availability_status IN ('available', 'busy', 'offline', 'suspended')),
  max_active_assignments integer     NOT NULL DEFAULT 1
    CHECK (max_active_assignments BETWEEN 1 AND 20),
  priority_score        integer     NOT NULL DEFAULT 0
    CHECK (priority_score BETWEEN 0 AND 1000),
  updated_by            text        NOT NULL,
  version               integer     NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, captain_id)
);

CREATE INDEX IF NOT EXISTS idx_dsh_captain_dispatch_profiles_candidate
  ON dsh_captain_dispatch_profiles(
    tenant_id,
    accreditation_status,
    availability_status,
    priority_score DESC,
    captain_id
  );

CREATE TABLE IF NOT EXISTS dsh_dispatch_decisions (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      text        NOT NULL DEFAULT 'default',
  assignment_id  uuid        REFERENCES dsh_assignments(id),
  order_id       uuid        REFERENCES dsh_orders(id),
  captain_id     text,
  action         text        NOT NULL CHECK (action IN (
    'offered',
    'accepted',
    'declined',
    'expired',
    'cancelled',
    'reassigned',
    'eligibility_rejected',
    'capacity_rejected'
  )),
  reason_code    text,
  reason         text,
  actor_id       text        NOT NULL,
  actor_role     text        NOT NULL CHECK (actor_role IN ('operator', 'captain', 'system')),
  metadata       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dsh_dispatch_decisions_assignment
  ON dsh_dispatch_decisions(tenant_id, assignment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dsh_dispatch_decisions_order
  ON dsh_dispatch_decisions(tenant_id, order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dsh_dispatch_decisions_captain
  ON dsh_dispatch_decisions(tenant_id, captain_id, created_at DESC);
