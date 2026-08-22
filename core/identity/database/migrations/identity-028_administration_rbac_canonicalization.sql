-- identity-028_administration_rbac_canonicalization.sql
--
-- Replace broad administration umbrella permissions with exact control-panel
-- actions while preserving existing intended grants. Identity remains the sole
-- RBAC authority; DSH consumes this vocabulary but never creates permissions.

INSERT INTO identity_permission_vocabulary(service, surface, action, description)
VALUES
    ('dsh', 'control-panel', 'administration.role.read', 'Read governed role definitions and role-definition requests'),
    ('dsh', 'control-panel', 'administration.role.request', 'Request a governed role definition change'),
    ('dsh', 'control-panel', 'administration.role.approve', 'Approve or reject governed role definition changes'),
    ('dsh', 'control-panel', 'administration.staff.read', 'Read governed staff and role assignments'),
    ('dsh', 'control-panel', 'administration.staff.request', 'Request a governed staff role assignment change'),
    ('dsh', 'control-panel', 'administration.staff.approve', 'Approve or reject governed staff role assignment changes'),
    ('dsh', 'control-panel', 'administration.approval.read', 'Read governed role-assignment approval requests'),
    ('dsh', 'control-panel', 'administration.audit.read', 'Read administration audit history'),
    ('dsh', 'control-panel', 'administration.diagnostics.read', 'Read administration diagnostics'),
    ('dsh', 'control-panel', 'administration.rollback.read', 'Read governed administration rollback requests'),
    ('dsh', 'control-panel', 'administration.rollback.request', 'Request rollback of an approved administration decision'),
    ('dsh', 'control-panel', 'administration.rollback.approve', 'Approve or reject administration rollback requests')
ON CONFLICT (service, surface, action)
DO UPDATE SET description = EXCLUDED.description;

-- Preserve the effective intent of legacy broad role grants by expanding them
-- into exact permissions before the broad bindings are removed.
WITH broad_map(broad_action, exact_action) AS (
    VALUES
        ('administration.read', 'administration.role.read'),
        ('administration.read', 'administration.staff.read'),
        ('administration.read', 'administration.approval.read'),
        ('administration.read', 'administration.audit.read'),
        ('administration.read', 'administration.diagnostics.read'),
        ('administration.read', 'administration.rollback.read'),
        ('administration.manage', 'administration.role.request'),
        ('administration.manage', 'administration.staff.request'),
        ('administration.manage', 'administration.rollback.request'),
        ('administration.approve', 'administration.role.approve'),
        ('administration.approve', 'administration.staff.approve'),
        ('administration.approve', 'administration.rollback.approve')
)
INSERT INTO identity_role_permissions(role_id, permission_id, scope)
SELECT
    legacy_binding.role_id,
    exact_permission.id,
    legacy_binding.scope
FROM identity_role_permissions legacy_binding
JOIN identity_permission_vocabulary broad_permission
  ON broad_permission.id = legacy_binding.permission_id
 AND broad_permission.service = 'dsh'
 AND broad_permission.surface = 'control-panel'
JOIN broad_map mapping
  ON mapping.broad_action = broad_permission.action
JOIN identity_permission_vocabulary exact_permission
  ON exact_permission.service = 'dsh'
 AND exact_permission.surface = 'control-panel'
 AND exact_permission.action = mapping.exact_action
ON CONFLICT (role_id, permission_id)
DO UPDATE SET scope = EXCLUDED.scope;

-- Do the same for direct actor grants so removing umbrella permissions never
-- silently removes a previously intended capability.
WITH broad_map(broad_action, exact_action) AS (
    VALUES
        ('administration.read', 'administration.role.read'),
        ('administration.read', 'administration.staff.read'),
        ('administration.read', 'administration.approval.read'),
        ('administration.read', 'administration.audit.read'),
        ('administration.read', 'administration.diagnostics.read'),
        ('administration.read', 'administration.rollback.read'),
        ('administration.manage', 'administration.role.request'),
        ('administration.manage', 'administration.staff.request'),
        ('administration.manage', 'administration.rollback.request'),
        ('administration.approve', 'administration.role.approve'),
        ('administration.approve', 'administration.staff.approve'),
        ('administration.approve', 'administration.rollback.approve')
)
INSERT INTO identity_actor_direct_permissions(actor_id, permission_id, scope, granted_by)
SELECT
    direct_grant.actor_id,
    exact_permission.id,
    direct_grant.scope,
    'administration-rbac-canonicalization'
FROM identity_actor_direct_permissions direct_grant
JOIN identity_permission_vocabulary broad_permission
  ON broad_permission.id = direct_grant.permission_id
 AND broad_permission.service = 'dsh'
 AND broad_permission.surface = 'control-panel'
JOIN broad_map mapping
  ON mapping.broad_action = broad_permission.action
JOIN identity_permission_vocabulary exact_permission
  ON exact_permission.service = 'dsh'
 AND exact_permission.surface = 'control-panel'
 AND exact_permission.action = mapping.exact_action
ON CONFLICT (actor_id, permission_id, scope) DO NOTHING;

DELETE FROM identity_role_permissions role_permission
USING identity_permission_vocabulary permission
WHERE permission.id = role_permission.permission_id
  AND permission.service = 'dsh'
  AND permission.surface = 'control-panel'
  AND permission.action IN ('administration.read', 'administration.manage', 'administration.approve');

DELETE FROM identity_actor_direct_permissions direct_permission
USING identity_permission_vocabulary permission
WHERE permission.id = direct_permission.permission_id
  AND permission.service = 'dsh'
  AND permission.surface = 'control-panel'
  AND permission.action IN ('administration.read', 'administration.manage', 'administration.approve');

DO $$
DECLARE
    actor_record record;
BEGIN
    FOR actor_record IN SELECT id FROM identity_actors
    LOOP
        PERFORM identity_rebuild_actor_access_projection(actor_record.id);
    END LOOP;
END
$$;

-- Broad vocabulary rows are deleted only after every normalized binding has
-- been migrated. Any remaining consumer would now fail closed rather than
-- receiving hidden umbrella authority.
DELETE FROM identity_permission_vocabulary
WHERE service = 'dsh'
  AND surface = 'control-panel'
  AND action IN ('administration.read', 'administration.manage', 'administration.approve');

DO $$
DECLARE
    broad_binding_count bigint;
    missing_exact_count bigint;
BEGIN
    SELECT count(*)
    INTO broad_binding_count
    FROM identity_permission_vocabulary
    WHERE service = 'dsh'
      AND surface = 'control-panel'
      AND action IN ('administration.read', 'administration.manage', 'administration.approve');

    IF broad_binding_count <> 0 THEN
        RAISE EXCEPTION 'broad administration permissions remain after canonicalization';
    END IF;

    SELECT count(*)
    INTO missing_exact_count
    FROM (VALUES
        ('administration.role.read'),
        ('administration.role.request'),
        ('administration.role.approve'),
        ('administration.staff.read'),
        ('administration.staff.request'),
        ('administration.staff.approve'),
        ('administration.approval.read'),
        ('administration.audit.read'),
        ('administration.diagnostics.read'),
        ('administration.rollback.read'),
        ('administration.rollback.request'),
        ('administration.rollback.approve')
    ) required(action)
    WHERE NOT EXISTS (
        SELECT 1
        FROM identity_permission_vocabulary permission
        WHERE permission.service = 'dsh'
          AND permission.surface = 'control-panel'
          AND permission.action = required.action
    );

    IF missing_exact_count <> 0 THEN
        RAISE EXCEPTION 'canonical administration vocabulary is incomplete';
    END IF;
END
$$;
