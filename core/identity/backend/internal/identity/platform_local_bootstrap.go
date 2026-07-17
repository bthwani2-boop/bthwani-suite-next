package identity

import (
	"context"
	"encoding/json"
	"errors"
	"strings"

	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

var platformPrivilegedActions = map[string]struct{}{
	"platform:variables:approve":  {},
	"platform:variables:apply":    {},
	"platform:variables:rollback": {},
}

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
	if err := r.restrictLocalOperatorPlatformPermissions(ctx); err != nil {
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
	}

	for _, actor := range actors {
		permissions, err := json.Marshal(actor.permissions)
		if err != nil {
			return err
		}
		if _, err := r.db.ExecContext(ctx, `
INSERT INTO identity_actors
    (id, username, password_hash, tenant_id, phone_e164, roles, permissions, active, updated_at)
VALUES ($1, $2, $3, 'local-dsh', $4, $5, $6::jsonb, true, NOW())
ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    password_hash = EXCLUDED.password_hash,
    phone_e164 = EXCLUDED.phone_e164,
    roles = EXCLUDED.roles,
    permissions = EXCLUDED.permissions,
    active = true,
    updated_at = NOW()`,
			actor.id,
			actor.username,
			string(hash),
			actor.phone,
			pq.Array([]string{actor.role}),
			string(permissions),
		); err != nil {
			return err
		}
	}
	return nil
}

func (r *Repository) restrictLocalOperatorPlatformPermissions(ctx context.Context) error {
	var raw []byte
	if err := r.db.QueryRowContext(ctx, `
SELECT permissions
FROM identity_actors
WHERE id = 'operator-local-001'`).Scan(&raw); err != nil {
		return err
	}
	var permissions []Permission
	if err := json.Unmarshal(raw, &permissions); err != nil {
		return err
	}
	filtered := make([]Permission, 0, len(permissions))
	for _, permission := range permissions {
		if permission.Surface == "control-panel" && strings.HasPrefix(permission.Action, "platform:") {
			if _, privileged := platformPrivilegedActions[permission.Action]; privileged {
				continue
			}
		}
		filtered = append(filtered, permission)
	}
	encoded, err := json.Marshal(filtered)
	if err != nil {
		return err
	}
	_, err = r.db.ExecContext(ctx, `
UPDATE identity_actors
SET permissions = $2::jsonb, updated_at = NOW()
WHERE id = $1`, "operator-local-001", string(encoded))
	return err
}
