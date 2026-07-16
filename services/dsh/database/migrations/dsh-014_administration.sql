-- LEGACY_FILENAME_ONLY — not a slice reference
-- DSH-014: Administration, Roles & Activation

CREATE TABLE IF NOT EXISTS dsh_admin_roles (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dsh_admin_staff_assignments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    TEXT        NOT NULL,
  role_id     UUID        NOT NULL REFERENCES dsh_admin_roles(id) ON DELETE CASCADE,
  assigned_by TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (actor_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_dsh_admin_staff_actor ON dsh_admin_staff_assignments (actor_id);

CREATE TABLE IF NOT EXISTS dsh_admin_partner_activations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id  TEXT        NOT NULL UNIQUE,
  status      TEXT        NOT NULL DEFAULT 'submitted'
              CHECK (status IN ('submitted','ops_approved','partner_active','blocked')),
  reviewed_by TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_admin_partner_status ON dsh_admin_partner_activations (status);

CREATE TABLE IF NOT EXISTS dsh_admin_captain_credentials (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  captain_id     TEXT        NOT NULL UNIQUE,
  license_number TEXT,
  vehicle_type   TEXT,
  status         TEXT        NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','approved','rejected','suspended')),
  reviewed_by    TEXT,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dsh_admin_audit (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id   TEXT        NOT NULL,
  action     TEXT        NOT NULL,
  target_id  TEXT,
  detail     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_admin_audit_actor ON dsh_admin_audit (actor_id);
CREATE INDEX IF NOT EXISTS idx_dsh_admin_audit_time ON dsh_admin_audit (created_at DESC);
