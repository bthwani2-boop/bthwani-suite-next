package identity

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strings"

	"github.com/lib/pq"
)

// PartnerActorProvisionInput is accepted only from the authenticated DSH
// service boundary. The operator context is injected by the Identity runtime,
// never selected by a client payload.
type PartnerActorProvisionInput struct {
	Username          string
	PhoneE164         string
	PermissionBundle  string
	StoreID           string
	OperatorContextID string
}

type PartnerActivationInput struct {
	IssuedByActorID   string
	StoreID           string
	OperatorContextID string
}

func registeredPartnerBundle(code string) bool {
	code = strings.TrimSpace(code)
	for _, descriptor := range PartnerPermissionBundles() {
		if descriptor.Code == code {
			return true
		}
	}
	return false
}

func mergePermissions(current, additions []Permission) []Permission {
	type permissionKey struct {
		service string
		surface string
		action  string
		scope   string
	}
	seen := make(map[permissionKey]struct{}, len(current)+len(additions))
	merged := make([]Permission, 0, len(current)+len(additions))
	appendUnique := func(permission Permission) {
		key := permissionKey{
			service: permission.Service,
			surface: permission.Surface,
			action:  permission.Action,
			scope:   permission.Scope,
		}
		if _, exists := seen[key]; exists {
			return
		}
		seen[key] = struct{}{}
		merged = append(merged, permission)
	}
	for _, permission := range current {
		appendUnique(permission)
	}
	for _, permission := range additions {
		appendUnique(permission)
	}
	return merged
}

// ProvisionPartnerActor creates or extends one Identity actor for a governed
// partner-store assignment. DSH supplies the resource identifiers, while
// Identity remains the sole owner of roles and executable permissions.
func (r *Repository) ProvisionPartnerActor(ctx context.Context, input PartnerActorProvisionInput) (ActorAdminView, error) {
	username := strings.TrimSpace(input.Username)
	operatorContextID := strings.TrimSpace(input.OperatorContextID)
	bundle := strings.TrimSpace(input.PermissionBundle)
	storeID := strings.TrimSpace(input.StoreID)
	if username == "" || operatorContextID == "" || storeID == "" || !registeredPartnerBundle(bundle) {
		return ActorAdminView{}, ErrInvalidActivation
	}
	phone, err := NormalizePhoneE164(input.PhoneE164)
	if err != nil {
		return ActorAdminView{}, err
	}
	permissions := PartnerBundlePermissions(bundle, storeID)
	if len(permissions) == 0 {
		return ActorAdminView{}, ErrInvalidActivation
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return ActorAdminView{}, err
	}
	defer tx.Rollback()

	existing, err := actorByPhoneAnyRoleTx(ctx, tx, phone)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return ActorAdminView{}, err
	}
	if err == nil {
		if strings.TrimSpace(existing.OperatorContextID) != operatorContextID {
			return ActorAdminView{}, ErrForbidden
		}
		roles := append([]string(nil), existing.Roles...)
		if !hasRole(roles, "partner") {
			roles = append(roles, "partner")
		}
		mergedPermissions := mergePermissions(existing.Permissions, permissions)
		permissionsJSON, marshalErr := json.Marshal(mergedPermissions)
		if marshalErr != nil {
			return ActorAdminView{}, marshalErr
		}
		if _, err = tx.ExecContext(ctx, `
			UPDATE identity_actors
			SET roles = $2,
			    permissions = $3::jsonb,
			    updated_at = now()
			WHERE id = $1`, existing.ID, pq.Array(roles), string(permissionsJSON)); err != nil {
			return ActorAdminView{}, err
		}
		if err := tx.Commit(); err != nil {
			return ActorAdminView{}, err
		}
		return r.ActorAdminByID(ctx, existing.ID)
	}

	suffix, err := randomToken(9)
	if err != nil {
		return ActorAdminView{}, err
	}
	actorID := "partner-" + suffix
	permissionsJSON, err := json.Marshal(permissions)
	if err != nil {
		return ActorAdminView{}, err
	}
	if _, err = tx.ExecContext(ctx, `
		INSERT INTO identity_actors
			(id, username, password_hash, operator_context_id, phone_e164, roles, permissions, active, updated_at)
		VALUES ($1, $2, '', $3, $4, $5, $6::jsonb, false, now())`,
		actorID, username, operatorContextID, phone, pq.Array([]string{"partner"}), string(permissionsJSON)); err != nil {
		return ActorAdminView{}, mapUniqueViolation(err)
	}
	if err := tx.Commit(); err != nil {
		return ActorAdminView{}, err
	}
	return ActorAdminView{
		ActorID:   actorID,
		Username:  username,
		PhoneE164: phone,
		Roles:     []string{"partner"},
		Active:    false,
	}, nil
}

// IssuePartnerActivationForActor issues a single-use app-partner challenge only
// when the actor owns an Identity permission scoped to the requested store.
func (r *Repository) IssuePartnerActivationForActor(
	ctx context.Context,
	actorID string,
	input PartnerActivationInput,
	idempotencyKey string,
	correlationID string,
) (IssueActivationResult, error) {
	if len(r.activationSecret) < minimumActivationSecretLength {
		return IssueActivationResult{}, ErrActivationUnavailable
	}
	actorID = strings.TrimSpace(actorID)
	issuedByActorID := strings.TrimSpace(input.IssuedByActorID)
	storeID := strings.TrimSpace(input.StoreID)
	operatorContextID := strings.TrimSpace(input.OperatorContextID)
	if actorID == "" || issuedByActorID == "" || storeID == "" || operatorContextID == "" {
		return IssueActivationResult{}, ErrInvalidActivation
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return IssueActivationResult{}, err
	}
	defer tx.Rollback()

	actor, err := actorByIDForUpdateTx(ctx, tx, actorID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return IssueActivationResult{}, ErrActorNotFound
		}
		return IssueActivationResult{}, err
	}
	if strings.TrimSpace(actor.OperatorContextID) != operatorContextID || !hasRole(actor.Roles, "partner") || strings.TrimSpace(actor.PhoneE164) == "" {
		return IssueActivationResult{}, ErrInvalidActivation
	}
	expectedScope := "store:" + storeID
	hasStoreScope := false
	for _, permission := range actor.Permissions {
		if permission.Service == "dsh" && permission.Surface == "app-partner" && permission.Scope == expectedScope {
			hasStoreScope = true
			break
		}
	}
	if !hasStoreScope {
		return IssueActivationResult{}, ErrForbidden
	}

	result, err := r.issueChallengeTx(
		ctx,
		tx,
		actor,
		"partner",
		"app-partner",
		issuedByActorID,
		scopedActivationIdempotencyKey(idempotencyKey, "partner", "app-partner"),
		correlationID,
	)
	if err != nil {
		return IssueActivationResult{}, err
	}
	if err := tx.Commit(); err != nil {
		return IssueActivationResult{}, err
	}
	return result, nil
}

const minimumActivationSecretLength = 32
