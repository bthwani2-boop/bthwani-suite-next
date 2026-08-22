package identity

import (
	"context"
	"database/sql"
	"encoding/json"
	"strings"
	"testing"
	"time"
)

func cleanupCanonicalAccessProjectionTest(t *testing.T, db *sql.DB, actorID, roleName string) {
	t.Helper()
	cleanup := func() {
		_, _ = db.Exec(`DELETE FROM identity_rbac_operation_ledger WHERE caller = 'identity' AND (idempotency_key LIKE $1 OR idempotency_key LIKE $2)`, "legacy-grant:"+actorID+":%", "legacy-revoke:"+actorID+":%")
		_, _ = db.Exec(`DELETE FROM identity_actors WHERE id = $1`, actorID)
		_, _ = db.Exec(`DELETE FROM identity_roles WHERE name = $1`, roleName)
		_, _ = db.Exec(`
			DELETE FROM identity_permission_vocabulary vocabulary
			WHERE vocabulary.service = 'providers'
			  AND vocabulary.surface = 'control-panel'
			  AND vocabulary.action = 'maps:invoke'
			  AND NOT EXISTS (
			      SELECT 1 FROM identity_role_permissions rp WHERE rp.permission_id = vocabulary.id
			  )
			  AND NOT EXISTS (
			      SELECT 1 FROM identity_actor_direct_permissions dp WHERE dp.permission_id = vocabulary.id
			  )`)
	}
	cleanup()
	t.Cleanup(cleanup)
}

func hasCanonicalPermission(permissions []Permission, service, surface, action, scope string) bool {
	for _, permission := range permissions {
		if permission.Service == service &&
			permission.Surface == surface &&
			permission.Action == action &&
			permission.Scope == scope {
			return true
		}
	}
	return false
}

func TestCanonicalAccessProjectionMakesRoleGrantAndRevokeImmediateForExistingSession(t *testing.T) {
	db := openIdentityTestDB(t)
	repository := NewRepository(db)

	suffix := strings.ToLower(strings.ReplaceAll(t.Name(), "/", "-"))
	if len(suffix) > 40 {
		suffix = suffix[len(suffix)-40:]
	}
	actorID := "agent2-access-" + suffix
	roleName := "agent2_access_" + strings.ReplaceAll(suffix, "-", "_")
	if len(roleName) > 79 {
		roleName = roleName[:79]
	}
	cleanupCanonicalAccessProjectionTest(t, db, actorID, roleName)

	directPermissions := []Permission{{
		Service: "dsh", Surface: "control-panel", Action: "platform.read", Scope: "all",
	}}
	_, err := db.Exec(`
		INSERT INTO identity_actors
		    (id, username, password_hash, operator_context_id, phone_e164,
		     roles, permissions, status, version, updated_at)
		VALUES ($1, $2, '', 'local-dsh', NULL, ARRAY[]::text[], '[]'::jsonb, 'ACTIVE', 1, now())`,
		actorID, actorID)
	if err != nil {
		t.Fatalf("insert actor: %v", err)
	}

	var role RbacRole
	if err := db.QueryRow(`INSERT INTO identity_roles(name, description) VALUES ($1, $2) RETURNING id, name, description, active, version, created_at, updated_at`, roleName, "Agent 2 canonical access projection test").Scan(&role.ID, &role.Name, &role.Description, &role.Active, &role.Version, &role.CreatedAt, &role.UpdatedAt); err != nil {
		t.Fatalf("create role: %v", err)
	}

	var permissionID string
	err = db.QueryRow(`
		INSERT INTO identity_permission_vocabulary(service, surface, action, description)
		VALUES ('providers', 'control-panel', 'maps:invoke', 'Agent 2 canonical access projection test')
		ON CONFLICT (service, surface, action)
		DO UPDATE SET description = EXCLUDED.description
		RETURNING id`).Scan(&permissionID)
	if err != nil {
		t.Fatalf("create permission vocabulary: %v", err)
	}
	if _, err := db.Exec(`
		INSERT INTO identity_role_permissions(role_id, permission_id, scope)
		VALUES ($1, $2, 'all')
		ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = EXCLUDED.scope`,
		role.ID, permissionID); err != nil {
		t.Fatalf("attach permission to role: %v", err)
	}
	if err := repository.replaceActorAccess(context.Background(), actorID, []string{"employee"}, directPermissions, "projection-test"); err != nil {
		t.Fatalf("seed canonical actor access: %v", err)
	}

	accessToken := "agent2-existing-session-access-token"
	refreshRandom := "agent2-existing-session-refresh-token-material-that-is-long-enough"
	if _, err := db.Exec(`
		INSERT INTO identity_sessions
		    (id, actor_id, access_token_hash, refresh_token_hash, surface,
		     access_expires_at, refresh_expires_at)
		VALUES ($1, $2, $3, $4, 'control-panel', $5, $6)`,
		"agent2-session-"+suffix,
		actorID,
		tokenHash(accessToken),
		tokenHash(refreshRandom),
		time.Now().Add(15*time.Minute),
		time.Now().Add(24*time.Hour),
	); err != nil {
		t.Fatalf("insert session: %v", err)
	}
	before, err := repository.ResolveAccessToken(context.Background(), accessToken)
	if err != nil {
		t.Fatalf("resolve before grant: %v", err)
	}
	if hasRole(before.Roles, roleName) || hasCanonicalPermission(before.Permissions, "providers", "control-panel", "maps:invoke", "all") {
		t.Fatalf("role authority existed before grant: %#v", before)
	}
	if !hasCanonicalPermission(before.Permissions, "dsh", "control-panel", "platform.read", "all") {
		t.Fatalf("direct actor permission was lost before grant: %#v", before.Permissions)
	}

	if _, inserted, err := repository.Enforcer.GrantRole(context.Background(), actorID, roleName, "reviewer-agent2"); err != nil || !inserted {
		t.Fatalf("grant role: inserted=%v err=%v", inserted, err)
	}

	granted, err := repository.ResolveAccessToken(context.Background(), accessToken)
	if err != nil {
		t.Fatalf("resolve after grant: %v", err)
	}
	if !hasRole(granted.Roles, roleName) {
		t.Fatalf("existing session did not observe granted role: %#v", granted.Roles)
	}
	if !hasCanonicalPermission(granted.Permissions, "providers", "control-panel", "maps:invoke", "all") {
		t.Fatalf("existing session did not observe role-derived permission: %#v", granted.Permissions)
	}

	// Legacy projection writes are rejected. Canonical role-derived authority is
	// rebuilt only by normalized Identity writers.
	effectiveJSON, err := json.Marshal(granted.Permissions)
	if err != nil {
		t.Fatalf("marshal effective permissions: %v", err)
	}
	if _, err := db.Exec(`UPDATE identity_actors SET permissions = $2::jsonb WHERE id = $1`, actorID, string(effectiveJSON)); err == nil {
		t.Fatal("legacy projection write unexpectedly succeeded")
	}

	var redundantDirect int
	if err := db.QueryRow(`
		SELECT count(*)
		FROM identity_actor_direct_permissions direct_permission
		WHERE direct_permission.actor_id = $1
		  AND direct_permission.permission_id = $2
		  AND direct_permission.scope = 'all'`,
		actorID, permissionID).Scan(&redundantDirect); err != nil {
		t.Fatalf("read direct grant provenance: %v", err)
	}
	if redundantDirect != 0 {
		t.Fatalf("role-derived permission was promoted into direct authority: count=%d", redundantDirect)
	}

	if err := repository.Enforcer.RevokeRole(context.Background(), actorID, roleName, "reviewer-agent2"); err != nil {
		t.Fatalf("revoke role: %v", err)
	}

	revoked, err := repository.ResolveAccessToken(context.Background(), accessToken)
	if err != nil {
		t.Fatalf("resolve after revoke: %v", err)
	}
	if hasRole(revoked.Roles, roleName) {
		t.Fatalf("revoked role remained visible to existing session: %#v", revoked.Roles)
	}
	if hasCanonicalPermission(revoked.Permissions, "providers", "control-panel", "maps:invoke", "all") {
		t.Fatalf("revoked role permission remained executable: %#v", revoked.Permissions)
	}
	if !hasCanonicalPermission(revoked.Permissions, "dsh", "control-panel", "platform.read", "all") {
		t.Fatalf("unrelated direct permission was removed by role revoke: %#v", revoked.Permissions)
	}

	var projectionDrift bool
	if err := db.QueryRow(`
		SELECT roles IS DISTINCT FROM identity_effective_roles(id)
		    OR permissions IS DISTINCT FROM identity_effective_permissions(id)
		FROM identity_actors
		WHERE id = $1`, actorID).Scan(&projectionDrift); err != nil {
		t.Fatalf("read projection drift: %v", err)
	}
	if projectionDrift {
		t.Fatal("actor access projection drifted from canonical normalized authority")
	}

	effectiveFromEnforcer, err := repository.Enforcer.GetActorPermissions(context.Background(), actorID)
	if err != nil {
		t.Fatalf("read effective permissions through enforcer: %v", err)
	}
	if !hasCanonicalPermission(effectiveFromEnforcer, "dsh", "control-panel", "platform.read", "all") {
		t.Fatalf("enforcer omitted direct actor authority: %#v", effectiveFromEnforcer)
	}
	if hasCanonicalPermission(effectiveFromEnforcer, "providers", "control-panel", "maps:invoke", "all") {
		t.Fatalf("enforcer returned revoked role authority: %#v", effectiveFromEnforcer)
	}
}
