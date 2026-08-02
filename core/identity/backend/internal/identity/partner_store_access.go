package identity

import (
	"context"
	"encoding/json"
	"strings"
)

type PartnerStoreAccessInput struct {
	StoreID           string
	PermissionBundle  string
	OperatorContextID string
	Enabled           bool
}

func removePartnerStorePermissions(current []Permission, storeID string) []Permission {
	targetScope := "store:" + strings.TrimSpace(storeID)
	result := make([]Permission, 0, len(current))
	for _, permission := range current {
		if permission.Service == "dsh" &&
			permission.Surface == "app-partner" &&
			permission.Scope == targetScope {
			continue
		}
		result = append(result, permission)
	}
	return result
}

func hasAnyPartnerStorePermission(permissions []Permission) bool {
	for _, permission := range permissions {
		if permission.Service == "dsh" &&
			permission.Surface == "app-partner" &&
			strings.HasPrefix(permission.Scope, "store:") {
			return true
		}
	}
	return false
}

func actorHasOnlyPartnerRole(roles []string) bool {
	return len(roles) == 1 && roles[0] == "partner"
}

// SetPartnerStoreAccess is the sovereign permission mutation for DSH team
// membership changes. Every mutation replaces or removes exactly one store
// scope and revokes all live sessions so no token can retain stale authority.
// When a partner-only actor loses its final store scope, authentication is
// suspended until a governed store assignment is restored.
func (r *Repository) SetPartnerStoreAccess(
	ctx context.Context,
	actorID string,
	input PartnerStoreAccessInput,
) (ActorAdminView, error) {
	actorID = strings.TrimSpace(actorID)
	storeID := strings.TrimSpace(input.StoreID)
	operatorContextID := strings.TrimSpace(input.OperatorContextID)
	bundle := strings.TrimSpace(input.PermissionBundle)
	if actorID == "" || storeID == "" || operatorContextID == "" {
		return ActorAdminView{}, ErrInvalidActivation
	}
	if input.Enabled && !registeredPartnerBundle(bundle) {
		return ActorAdminView{}, ErrInvalidActivation
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return ActorAdminView{}, err
	}
	defer tx.Rollback()

	actor, err := actorByIDForUpdateTx(ctx, tx, actorID)
	if err != nil {
		return ActorAdminView{}, err
	}
	if strings.TrimSpace(actor.OperatorContextID) != operatorContextID || !hasRole(actor.Roles, "partner") {
		return ActorAdminView{}, ErrForbidden
	}

	permissions := removePartnerStorePermissions(actor.Permissions, storeID)
	active := actor.Active
	if input.Enabled {
		replacements := PartnerBundlePermissions(bundle, storeID)
		if len(replacements) == 0 {
			return ActorAdminView{}, ErrInvalidActivation
		}
		permissions = replacePartnerStorePermissions(permissions, replacements, storeID)
		active = true
	} else if !hasAnyPartnerStorePermission(permissions) && actorHasOnlyPartnerRole(actor.Roles) {
		active = false
	}

	permissionsJSON, err := json.Marshal(permissions)
	if err != nil {
		return ActorAdminView{}, err
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE identity_actors
		SET permissions = $2::jsonb,
		    active = $3,
		    updated_at = now()
		WHERE id = $1`, actor.ID, string(permissionsJSON), active); err != nil {
		return ActorAdminView{}, err
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE identity_sessions
		SET revoked_at = now()
		WHERE actor_id = $1 AND revoked_at IS NULL`, actor.ID); err != nil {
		return ActorAdminView{}, err
	}
	if !input.Enabled {
		if _, err := tx.ExecContext(ctx, `
			UPDATE identity_activation_challenges
			SET status = 'revoked', updated_at = now()
			WHERE actor_id = $1 AND actor_type = 'partner' AND status = 'pending'`, actor.ID); err != nil {
			return ActorAdminView{}, err
		}
	}
	if err := tx.Commit(); err != nil {
		return ActorAdminView{}, err
	}
	return ActorAdminView{
		ActorID:   actor.ID,
		Username:  actor.Username,
		PhoneE164: actor.PhoneE164,
		Roles:     append([]string(nil), actor.Roles...),
		Active:    active,
	}, nil
}
