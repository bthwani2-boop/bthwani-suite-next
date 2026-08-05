-- DSH-990: Workforce Assignment Cleanup
-- J014 Canonical Assignment Model: DSH must consume assignment truth from Workforce, not store it locally.
--
-- dsh_store_actor_scopes and dsh_admin_roles are NOT dropped here: both are
-- live, load-bearing tables (dsh_store_actor_scopes backs partner/media/
-- ratings/support store-access authorization across six call sites;
-- dsh_admin_roles backs GET /dsh/operator/admin/roles). store/governance.go
-- documents dsh_store_actor_scopes as the deliberate, canonical DSH-owned
-- store-access boundary that must not become a parallel Workforce-backed
-- authority -- the opposite of what this migration's title describes. The
-- other tables below have zero remaining Go consumers; their owning code was
-- already retired.

DROP TABLE IF EXISTS dsh_store_team_member_actions CASCADE;
DROP TABLE IF EXISTS dsh_store_team_members CASCADE;
DROP TABLE IF EXISTS dsh_actor_service_area_scopes CASCADE;
DROP TABLE IF EXISTS dsh_workforce_scope_audit CASCADE;
DROP TABLE IF EXISTS dsh_admin_staff_assignments CASCADE;
DROP TABLE IF EXISTS dsh_admin_approval_requests CASCADE;
DROP TABLE IF EXISTS dsh_admin_rollback_requests CASCADE;
DROP TABLE IF EXISTS dsh_admin_role_definition_requests CASCADE;
