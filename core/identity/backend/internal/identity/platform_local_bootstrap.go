package identity

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

// BootstrapLocalPlatformActors applies separation of duties to the local
// control-plane accounts. It runs only when the existing local bootstrap is
// explicitly enabled and never affects production actors.
func (r *Repository) BootstrapLocalPlatformActors(ctx context.Context, input LocalBootstrap) error {
	if !input.Enabled {
		return nil
	}
	if len(input.Password) < 6 {
		return errors.New("IDENTITY_LOCAL_BOOTSTRAP_PASSWORD must contain at least 6 characters")
	}
	operatorContextID := strings.TrimSpace(input.OperatorContextID)
	if operatorContextID == "" {
		return errors.New("BTHWANI_OPERATOR_CONTEXT_ID is required when IDENTITY_LOCAL_BOOTSTRAP=true")
	}
	if err := r.reconcileLocalOperatorPermissions(ctx); err != nil {
		return err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	actors := []struct {
		id          string
		username    string
		role        string
		phone       string
		permissions []Permission
	}{
		{
			id:       "platform-approver-local-001",
			username: "platform-approver",
			role:     "platform-approver",
			phone:    "+967770000101",
			permissions: []Permission{
				{Service: "dsh", Surface: "control-panel", Action: "platform:read", Scope: "all"},
				{Service: "dsh", Surface: "control-panel", Action: "platform:health:read", Scope: "all"},
				{Service: "dsh", Surface: "control-panel", Action: "platform:audit:read", Scope: "all"},
				{Service: "dsh", Surface: "control-panel", Action: "platform:variables:approve", Scope: "all"},
			},
		},
		{
			id:       "platform-applier-local-001",
			username: "platform-applier",
			role:     "platform-applier",
			phone:    "+967770000102",
			permissions: []Permission{
				{Service: "dsh", Surface: "control-panel", Action: "platform:read", Scope: "all"},
				{Service: "dsh", Surface: "control-panel", Action: "platform:health:read", Scope: "all"},
				{Service: "dsh", Surface: "control-panel", Action: "platform:audit:read", Scope: "all"},
				{Service: "dsh", Surface: "control-panel", Action: "platform:variables:apply", Scope: "all"},
				{Service: "dsh", Surface: "control-panel", Action: "platform:variables:rollback", Scope: "all"},
			},
		},
		{
			id:       "platform-rollout-manager-local-001",
			username: "platform-rollout-manager",
			role:     "platform-rollout-manager",
			phone:    "+967770000103",
			permissions: []Permission{
				{Service: "dsh", Surface: "control-panel", Action: "platform:read", Scope: "all"},
				{Service: "dsh", Surface: "control-panel", Action: "platform:health:read", Scope: "all"},
				{Service: "dsh", Surface: "control-panel", Action: "platform:audit:read", Scope: "all"},
				{Service: "dsh", Surface: "control-panel", Action: "platform:rollouts:manage", Scope: "all"},
			},
		},
	}

	for _, actor := range actors {
		permissions, err := json.Marshal(actor.permissions)
		if err != nil {
			return err
		}
		if _, err := r.db.ExecContext(ctx, `
INSERT INTO identity_actors
    (id, username, password_hash, operator_context_id, phone_e164, roles, permissions, status, version, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, 'ACTIVE', 1, NOW())
ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    password_hash = EXCLUDED.password_hash,
    operator_context_id = EXCLUDED.operator_context_id,
    phone_e164 = EXCLUDED.phone_e164,
    roles = EXCLUDED.roles,
    permissions = EXCLUDED.permissions,
    status = 'ACTIVE',
    version = identity_actors.version + 1,
    updated_at = NOW()`,
			actor.id,
			actor.username,
			string(hash),
			operatorContextID,
			actor.phone,
			pq.Array([]string{actor.role}),
			string(permissions),
		); err != nil {
			return err
		}
	}
	return nil
}

// reconcileLocalOperatorPermissions replaces the bootstrap actor's provisional
// permission payload with the exact local-development contract. Replacement is
// intentional: it removes stale aliases and privileged platform actions rather
// than accumulating them across bootstrap runs.
func (r *Repository) reconcileLocalOperatorPermissions(ctx context.Context) error {
	encoded, err := json.Marshal(localOperatorDevelopmentPermissions())
	if err != nil {
		return err
	}
	result, err := r.db.ExecContext(ctx, `
UPDATE identity_actors
SET permissions = $2::jsonb, updated_at = NOW()
WHERE id = $1`, "operator-local-001", string(encoded))
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected != 1 {
		return errors.New("operator-local-001 must exist before platform permission reconciliation")
	}
	return nil
}
