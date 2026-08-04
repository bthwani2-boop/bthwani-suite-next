-- identity-020_rbac_foundation.sql

-- Define the authoritative vocabulary of permissions in the system.
CREATE TABLE identity_permission_vocabulary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service VARCHAR(64) NOT NULL,
    surface VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(service, surface, action)
);

-- Define roles that group permissions.
CREATE TABLE identity_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(128) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Map permissions to roles with a specific scope default.
CREATE TABLE identity_role_permissions (
    role_id UUID NOT NULL REFERENCES identity_roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES identity_permission_vocabulary(id) ON DELETE CASCADE,
    scope VARCHAR(64) NOT NULL DEFAULT 'assigned',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

-- Assign roles to actors.
CREATE TABLE identity_actor_roles (
    actor_id VARCHAR(128) NOT NULL,
    role_id UUID NOT NULL REFERENCES identity_roles(id) ON DELETE CASCADE,
    granted_by VARCHAR(128) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (actor_id, role_id)
);

-- Data Migration: Seed initial vocabulary and roles based on existing known roles
INSERT INTO identity_roles (name, description) VALUES
  ('client', 'Standard consumer client'),
  ('captain', 'Delivery Captain'),
  ('partner', 'Store Partner'),
  ('platform_admin', 'Platform Administrator'),
  ('customer_support', 'Customer Support Agent')
ON CONFLICT DO NOTHING;

-- Map existing actors to their roles (based on the legacy 'roles' array)
INSERT INTO identity_actor_roles (actor_id, role_id, granted_by)
SELECT a.id, r.id, 'system_migration'
FROM identity_actors a, unnest(a.roles) as legacy_role
JOIN identity_roles r ON r.name = legacy_role
ON CONFLICT DO NOTHING;
