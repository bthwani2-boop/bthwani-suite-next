package identity

import (
	"context"
	"database/sql"
	"errors"
	"strings"
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

// PartnerStoreAccessInput changes one actor's executable authority for a
// single DSH store. Operator context is injected by the trusted service
// boundary and cannot be selected by a client payload.
type PartnerStoreAccessInput struct {
	StoreID           string
	PermissionBundle  string
	Enabled           bool
	Reactivate        bool
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

// replacePartnerStorePermissions removes every previous executable authority
// for one partner-store scope before applying the selected canonical bundle.
// This prevents a downgrade (for example manager -> staff) from retaining the
// former elevated actions.
func replacePartnerStorePermissions(current, replacements []Permission, storeID string) []Permission {
	type permissionKey struct {
		service string
		surface string
		action  string
		scope   string
	}
	targetScope := "store:" + strings.TrimSpace(storeID)
	seen := make(map[permissionKey]struct{}, len(current)+len(replacements))
	result := make([]Permission, 0, len(current)+len(replacements))
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
		result = append(result, permission)
	}
	for _, permission := range current {
		if permission.Service == "dsh" && permission.Surface == "app-partner" && permission.Scope == targetScope {
			continue
		}
		appendUnique(permission)
	}
	for _, permission := range replacements {
		appendUnique(permission)
	}
	return result
}

func hasAnyPartnerStorePermission(permissions []Permission) bool {
	for _, permission := range permissions {
		if permission.Service == "dsh" && permission.Surface == "app-partner" && strings.HasPrefix(permission.Scope, "store:") {
			return true
		}
	}
	return false
}

func hasOnlyPartnerRole(roles []string) bool {
	return len(roles) == 1 && roles[0] == "partner"
}

func revokeActorSessionsTx(ctx context.Context, tx *sql.Tx, actorID string) error {
	_, err := tx.ExecContext(ctx, `
		UPDATE identity_sessions
		SET revoked_at = now()
		WHERE actor_id = $1 AND revoked_at IS NULL`, actorID)
	return err
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
		effectivePermissions := replacePartnerStorePermissions(existing.Permissions, permissions, storeID)
		if err := setActorAccessTx(ctx, tx, existing.ID, roles, effectivePermissions, "partner-provision"); err != nil {
			return ActorAdminView{}, err
		}
		if err := revokeActorSessionsTx(ctx, tx, existing.ID); err != nil {
			return ActorAdminView{}, err
		}
		if err := tx.Commit(); err != nil {
			return ActorAdminView{}, err
		}
		return r.ActorAdminByIDGoverned(ctx, operatorContextID, existing.ID)
	}

	suffix, err := randomToken(9)
	if err != nil {
		return ActorAdminView{}, err
	}
	actorID := "partner-" + suffix
	if _, err = tx.ExecContext(ctx, `
		INSERT INTO identity_actors
			(id, username, password_hash, operator_context_id, phone_e164, roles, permissions, status, version, updated_at)
		VALUES ($1, $2, '', $3, $4, ARRAY[]::text[], '[]'::jsonb, 'PROVISIONED', 1, now())`,
		actorID, username, operatorContextID, phone); err != nil {
		return ActorAdminView{}, mapUniqueViolation(err)
	}
	if err := setActorAccessTx(ctx, tx, actorID, []string{"partner"}, permissions, "partner-provision"); err != nil {
		return ActorAdminView{}, err
	}
	if err := tx.Commit(); err != nil {
		return ActorAdminView{}, err
	}
	return ActorAdminView{
		ActorID:   actorID,
		Username:  username,
		PhoneE164: phone,
		Roles:     []string{"partner"},
		Status:    ActorStatusProvisioned,
		Version:   1,
	}, nil
}

// SetPartnerStoreAccess replaces or removes all executable app-partner
// permissions for exactly one store while preserving unrelated authorities.
// Every change revokes live sessions, so cached tokens cannot retain a removed
// bundle. Losing the final store scope suspends a partner-only actor; restoring
// access reactivates it only for an explicit activate action, never for resend.
func (r *Repository) SetPartnerStoreAccess(ctx context.Context, actorID string, input PartnerStoreAccessInput) (ActorAdminView, error) {
	actorID = strings.TrimSpace(actorID)
	operatorContextID := strings.TrimSpace(input.OperatorContextID)
	storeID := strings.TrimSpace(input.StoreID)
	bundle := strings.TrimSpace(input.PermissionBundle)
	if actorID == "" || operatorContextID == "" || storeID == "" || (input.Reactivate && !input.Enabled) {
		return ActorAdminView{}, ErrInvalidActivation
	}

	replacements := []Permission(nil)
	if input.Enabled {
		if !registeredPartnerBundle(bundle) {
			return ActorAdminView{}, ErrInvalidActivation
		}
		replacements = PartnerBundlePermissions(bundle, storeID)
		if len(replacements) == 0 {
			return ActorAdminView{}, ErrInvalidActivation
		}
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return ActorAdminView{}, err
	}
	defer tx.Rollback()

	actor, err := actorByIDForUpdateTx(ctx, tx, actorID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ActorAdminView{}, ErrActorNotFound
		}
		return ActorAdminView{}, err
	}
	if strings.TrimSpace(actor.OperatorContextID) != operatorContextID || !hasRole(actor.Roles, "partner") {
		return ActorAdminView{}, ErrForbidden
	}

	effectivePermissions := replacePartnerStorePermissions(actor.Permissions, replacements, storeID)
	status := actor.Status
	if input.Reactivate {
		status = ActorStatusActive
	} else if !input.Enabled && !hasAnyPartnerStorePermission(effectivePermissions) && hasOnlyPartnerRole(actor.Roles) {
		status = ActorStatusSuspended
	}
	if err := setActorAccessTx(ctx, tx, actorID, actor.Roles, effectivePermissions, "partner-store-access"); err != nil {
		return ActorAdminView{}, err
	}
	if _, err = tx.ExecContext(ctx, `UPDATE identity_actors SET status = $2, version = version + 1, updated_at = now() WHERE id = $1`, actorID, status); err != nil {
		return ActorAdminView{}, err
	}
	if err := revokeActorSessionsTx(ctx, tx, actorID); err != nil {
		return ActorAdminView{}, err
	}
	if !input.Enabled {
		if _, err = tx.ExecContext(ctx, `
			UPDATE identity_activation_challenges
			SET status = 'revoked', updated_at = now()
			WHERE actor_id = $1 AND actor_type = 'partner' AND status = 'pending'`, actorID); err != nil {
			return ActorAdminView{}, err
		}
	}
	actor.Permissions = effectivePermissions
	actor.Status = status
	view := toAdminView(actor)
	if err := tx.Commit(); err != nil {
		return ActorAdminView{}, err
	}
	return view, nil
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
