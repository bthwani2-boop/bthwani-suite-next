package identity

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	"github.com/lib/pq"
)

var ErrOperatorContextMismatch = errors.New("actor operator context does not match active runtime operator context")

// otpRoleSurface and otpRolePermissions delegate to the single central
// activation registry so the public OTP path can never diverge from it —
// see TestActivationIssuancePoliciesSeparatePublicAndWorkforceRoles, which
// asserts field/captain must stay Workforce-managed-only and unreachable
// here.
func otpRoleSurface(role string) (string, error) {
	if !publicOtpActorTypes[role] {
		return "", ErrInvalidActivation
	}
	surface, ok := activationSurfaceFor(role)
	if !ok {
		return "", ErrInvalidActivation
	}
	return surface, nil
}

func otpRolePermissions(role, surface string) ([]byte, error) {
	return publicActorPermissions(role, surface)
}

// RequestOtpForOperatorContext is the trusted OTP provisioning path. The
// operator context is supplied by trusted server runtime configuration, not
// by the mobile request. A phone already bound to another operator context
// is rejected before any role or permission can be merged into that actor.
func (r *Repository) RequestOtpForOperatorContext(
	ctx context.Context,
	operatorContextID string,
	input OtpInput,
) (IssueActivationResult, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	if operatorContextID == "" {
		return IssueActivationResult{}, ErrOperatorContextMismatch
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
				(id, username, password_hash, operator_context_id, phone_e164, roles, permissions, active, updated_at)
			VALUES ($1, $2, '', $3, $4, $5, $6::jsonb, false, now())`,
			actorID, username, operatorContextID, phone, pq.Array([]string{role}), string(permissions))
		if err != nil {
			return IssueActivationResult{}, mapUniqueViolation(err)
		}
		actor, err = actorByIDTx(ctx, tx, actorID)
		if err != nil {
			return IssueActivationResult{}, err
		}
	} else {
		if strings.TrimSpace(actor.OperatorContextID) != operatorContextID {
			return IssueActivationResult{}, ErrOperatorContextMismatch
		}
		if !hasRole(actor.Roles, role) {
			_, err = tx.ExecContext(ctx, `
				UPDATE identity_actors
				SET roles = array_append(roles, $2),
				    permissions = permissions || $3::jsonb,
				    updated_at = now()
				WHERE id = $1 AND operator_context_id = $4`,
				actor.ID, role, string(permissions), operatorContextID)
			if err != nil {
				return IssueActivationResult{}, err
			}
			actor, err = actorByIDTx(ctx, tx, actor.ID)
			if err != nil {
				return IssueActivationResult{}, err
			}
		}
	}

	// The self-service consumer path has no operator behind it: the actor is
	// requesting their own phone verification. issued_by_actor_id is NOT NULL
	// with a foreign key onto identity_actors, so the previous literal "system"
	// always violated that key and turned every public client OTP request into
	// an opaque 500. Recording the actor as their own issuer is the accurate
	// audit statement and keeps the platform-access invariant intact: workforce
	// and provider codes still go through IssueActivationForActor, which
	// requires a real issuing operator.
	result, err := r.issueChallengeTx(ctx, tx, actor, role, surface, actor.ID, "", "")
	if err != nil {
		return IssueActivationResult{}, err
	}
	if err := tx.Commit(); err != nil {
		return IssueActivationResult{}, err
	}
	return result, nil
}
