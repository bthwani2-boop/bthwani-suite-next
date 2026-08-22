package identity

import (
	"context"
	"encoding/json"
	"testing"
)

func TestLocalBootstrapConvergenceDetectsAndRepairsOperatorPermissionDriftDBIntegration(t *testing.T) {
	db := openIdentityTestDB(t)
	repo := newOtpTestRepository(t, db)
	input := localBootstrapTestInput()
	ctx := context.Background()

	bootstrapLocalIdentityState(t, repo, input)

	underPrivileged := []Permission{
		{Service: "dsh", Surface: "control-panel", Action: "store:read", Scope: "all"},
	}
	underPrivilegedJSON, err := json.Marshal(underPrivileged)
	if err != nil {
		t.Fatalf("marshal under-privileged operator fixture: %v", err)
	}
	driftTx, err := db.Begin()
	if err != nil {
		t.Fatalf("begin projection drift fixture: %v", err)
	}
	if _, err := driftTx.Exec(`SELECT set_config('bthwani.identity_access_projection', '1', true)`); err != nil {
		t.Fatalf("enable projection fixture: %v", err)
	}
	if _, err := driftTx.Exec(`UPDATE identity_actors SET permissions = $1::jsonb WHERE id = 'operator-local-001'`, string(underPrivilegedJSON)); err != nil {
		_ = driftTx.Rollback()
		t.Fatalf("corrupt operator actor permissions: %v", err)
	}
	if err := driftTx.Commit(); err != nil {
		t.Fatalf("commit projection drift fixture: %v", err)
	}

	var operatorRoleID string
	if err := db.QueryRow(`SELECT id FROM identity_roles WHERE name = 'operator'`).Scan(&operatorRoleID); err != nil {
		t.Fatalf("read operator role: %v", err)
	}
	var stalePermissionID string
	if err := db.QueryRow(`
INSERT INTO identity_permission_vocabulary(service, surface, action, description)
VALUES ('dsh', 'control-panel', 'platform:variables:approve', 'stale local bootstrap permission')
ON CONFLICT (service, surface, action) DO UPDATE SET description = EXCLUDED.description
RETURNING id`).Scan(&stalePermissionID); err != nil {
		t.Fatalf("create stale permission vocabulary row: %v", err)
	}
	if _, err := db.Exec(`
INSERT INTO identity_role_permissions(role_id, permission_id, scope)
VALUES ($1, $2, 'all')
ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = EXCLUDED.scope`, operatorRoleID, stalePermissionID); err != nil {
		t.Fatalf("attach stale operator role permission: %v", err)
	}

	converged, err := repo.LocalBootstrapConverged(ctx, input)
	if err != nil {
		t.Fatalf("convergence check after permission drift: %v", err)
	}
	if converged {
		t.Fatal("under-privileged actor plus stale role grant must not report local bootstrap convergence")
	}

	bootstrapLocalIdentityState(t, repo, input)

	converged, err = repo.LocalBootstrapConverged(ctx, input)
	if err != nil {
		t.Fatalf("convergence check after permission repair: %v", err)
	}
	if !converged {
		t.Fatal("canonical local bootstrap must repair actor and role permission drift")
	}

	var repairedJSON []byte
	if err := db.QueryRow(`SELECT permissions FROM identity_actors WHERE id = 'operator-local-001'`).Scan(&repairedJSON); err != nil {
		t.Fatalf("read repaired operator permissions: %v", err)
	}
	var repaired []Permission
	if err := json.Unmarshal(repairedJSON, &repaired); err != nil {
		t.Fatalf("decode repaired operator permissions: %v", err)
	}
	if !permissionSetsEqual(repaired, localOperatorDevelopmentPermissions()) {
		t.Fatal("operator actor permissions did not converge to the single local authority")
	}

	var staleRoleGrantCount int
	if err := db.QueryRow(`
SELECT count(*)
FROM identity_role_permissions
WHERE role_id = $1 AND permission_id = $2`, operatorRoleID, stalePermissionID).Scan(&staleRoleGrantCount); err != nil {
		t.Fatalf("check stale role permission removal: %v", err)
	}
	if staleRoleGrantCount != 0 {
		t.Fatalf("stale operator role permission survived convergence: count=%d", staleRoleGrantCount)
	}
}
