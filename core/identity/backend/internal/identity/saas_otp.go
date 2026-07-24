package identity

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strings"

	"github.com/lib/pq"
)

var ErrTenantMismatch = errors.New("actor tenant does not match active runtime tenant")

func otpRoleSurface(role string) (string, error) {
	if surface, ok := activationSurfaceFor(role); ok {
		return surface, nil
	}
	switch role {
	case "client":
		return "app-client", nil
	case "partner":
		return "app-partner", nil
	default:
		return "", ErrInvalidActivation
	}
}

func otpRolePermissions(role, surface string) ([]byte, error) {
	switch role {
	case "client":
		return json.Marshal([]Permission{
			{Service: "dsh", Surface: "app-client", Action: "store:read", Scope: "all"},
		})
	case "partner":
		return json.Marshal([]Permission{
			{Service: "dsh", Surface: "app-partner", Action: "store:read", Scope: "own"},
			{Service: "dsh", Surface: "app-partner", Action: "store:write", Scope: "own"},
		})
	default:
		return providerPermissions(surface)
	}
}

// RequestOtpForTenant is the SaaS-safe OTP provisioning path. The tenant is
// supplied by trusted server runtime configuration, not by the mobile request.
// A phone already bound to another tenant is rejected before any role or
// permission can be merged into that actor.
func (r *Repository) RequestOtpForTenant(
	ctx context.Context,
	tenantID string,
	input OtpInput,
) (IssueActivationResult, error) {
	tenantID = strings.TrimSpace(tenantID)
	if tenantID == "" {
		return IssueActivationResult{}, ErrTenantMismatch
	}
	phone, err := NormalizePhoneE164(input.Phone)
	if err != nil {
		return IssueActivationResult{}, err
	}
	role := strings.TrimSpace(input.ActorType)
	surface, err := otpRoleSurface(role)
	if err != nil {
		return IssueActivationResult{}, err
	}
	permissions, err := otpRolePermissions(role, surface)
	if err != nil {
		return IssueActivationResult{}, err
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return IssueActivationResult{}, err
	}
	defer tx.Rollback()

	actor, err := actorByPhoneAnyRoleTx(ctx, tx, phone)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return IssueActivationResult{}, err
	}

	if errors.Is(err, sql.ErrNoRows) {
		suffix, err := randomToken(9)
		if err != nil {
			return IssueActivationResult{}, err
		}
		actorID := role + "-" + suffix
		username := role + "-" + phone
		_, err = tx.ExecContext(ctx, `
			INSERT INTO identity_actors
				(id, username, password_hash, tenant_id, phone_e164, roles, permissions, active, updated_at)
			VALUES ($1, $2, '', $3, $4, $5, $6::jsonb, false, now())`,
			actorID, username, tenantID, phone, pq.Array([]string{role}), string(permissions))
		if err != nil {
			return IssueActivationResult{}, mapUniqueViolation(err)
		}
		actor, err = actorByIDTx(ctx, tx, actorID)
		if err != nil {
			return IssueActivationResult{}, err
		}
	} else {
		if strings.TrimSpace(actor.TenantID) != tenantID {
			return IssueActivationResult{}, ErrTenantMismatch
		}
		if !hasRole(actor.Roles, role) {
			_, err = tx.ExecContext(ctx, `
				UPDATE identity_actors
				SET roles = array_append(roles, $2),
				    permissions = permissions || $3::jsonb,
				    updated_at = now()
				WHERE id = $1 AND tenant_id = $4`,
				actor.ID, role, string(permissions), tenantID)
			if err != nil {
				return IssueActivationResult{}, err
			}
			actor, err = actorByIDTx(ctx, tx, actor.ID)
			if err != nil {
				return IssueActivationResult{}, err
			}
		}
	}

	result, err := r.issueChallengeTx(ctx, tx, actor, role, surface, "system", "", "")
	if err != nil {
		return IssueActivationResult{}, err
	}
	if err := tx.Commit(); err != nil {
		return IssueActivationResult{}, err
	}
	return result, nil
}
