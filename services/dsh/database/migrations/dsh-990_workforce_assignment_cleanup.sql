-- DSH-990: Workforce Assignment Cleanup
-- J014 Canonical Assignment Model: DSH must consume assignment truth from Workforce, not store it locally.

DROP TABLE IF EXISTS dsh_store_team_member_actions CASCADE;
DROP TABLE IF EXISTS dsh_store_team_members CASCADE;
DROP TABLE IF EXISTS dsh_actor_service_area_scopes CASCADE;
DROP TABLE IF EXISTS dsh_workforce_scope_audit CASCADE;
DROP TABLE IF EXISTS dsh_store_actor_scopes CASCADE;
DROP TABLE IF EXISTS dsh_admin_staff_assignments CASCADE;
DROP TABLE IF EXISTS dsh_admin_approval_requests CASCADE;
DROP TABLE IF EXISTS dsh_admin_rollback_requests CASCADE;
DROP TABLE IF EXISTS dsh_admin_role_definition_requests CASCADE;
DROP TABLE IF EXISTS dsh_admin_roles CASCADE;
