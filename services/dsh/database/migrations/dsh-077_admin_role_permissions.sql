-- JRN-031: bind approved DSH administration roles to real permission checks.

ALTER TABLE dsh_admin_roles
  ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE dsh_admin_roles
  DROP CONSTRAINT IF EXISTS dsh_admin_roles_permissions_array;

ALTER TABLE dsh_admin_roles
  ADD CONSTRAINT dsh_admin_roles_permissions_array
  CHECK (jsonb_typeof(permissions) = 'array');

CREATE INDEX IF NOT EXISTS idx_dsh_admin_roles_permissions
  ON dsh_admin_roles USING GIN (permissions);

-- Existing deployments may already have named roles. Bind only exact governed
-- names and never infer broad permissions from arbitrary legacy labels.
UPDATE dsh_admin_roles
SET permissions = '["administration.read","administration.manage","administration.approve"]'::jsonb
WHERE name = 'super-admin' AND permissions = '[]'::jsonb;

UPDATE dsh_admin_roles
SET permissions = '["administration.read","administration.manage"]'::jsonb
WHERE name IN ('platform-governor','platform-operator') AND permissions = '[]'::jsonb;

UPDATE dsh_admin_roles
SET permissions = '["administration.read","administration.approve"]'::jsonb
WHERE name = 'platform-approver' AND permissions = '[]'::jsonb;

UPDATE dsh_admin_roles
SET permissions = '["administration.read"]'::jsonb
WHERE name IN ('viewer','finance-approver') AND permissions = '[]'::jsonb;
