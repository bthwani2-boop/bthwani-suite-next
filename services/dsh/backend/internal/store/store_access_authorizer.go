package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"dsh-api/internal/workforceclient"
)

var (
	ErrAuthorizationUnavailable = errors.New("store authorization dependency unavailable")
	ErrStoreAccessDenied        = errors.New("store access denied")
)

type TrustedPermission struct {
	Service string
	Surface string
	Action  string
	Scope   string
}

type TrustedSubject struct {
	ID                string
	OperatorContextID string
	Roles             []string
	Permissions       []TrustedPermission
}

type AuthorizationDecision struct {
	Allowed         bool
	ReasonCode      string
	GrantedBy       string
	StoreID         string
	PartnerID       string
	Action          string
	AllowCrossActor bool
}

type StoreAccessAuthorizer interface {
	AuthorizeStoreAccess(
		ctx context.Context,
		subject TrustedSubject,
		storeID string,
		action string,
	) (AuthorizationDecision, error)
}

type trustedSubjectContextKey struct{}

func WithTrustedSubject(ctx context.Context, subject TrustedSubject) context.Context {
	subject.ID = strings.TrimSpace(subject.ID)
	subject.OperatorContextID = strings.TrimSpace(subject.OperatorContextID)
	return context.WithValue(ctx, trustedSubjectContextKey{}, subject)
}

func TrustedSubjectFromContext(ctx context.Context) (TrustedSubject, bool) {
	subject, ok := ctx.Value(trustedSubjectContextKey{}).(TrustedSubject)
	if !ok || strings.TrimSpace(subject.ID) == "" || strings.TrimSpace(subject.OperatorContextID) == "" {
		return TrustedSubject{}, false
	}
	return subject, true
}

type sqlStoreAccessAuthorizer struct {
	db        *sql.DB
	workforce WorkforceScopeResolver
}

func NewStoreAccessAuthorizer(db *sql.DB, workforce WorkforceScopeResolver) StoreAccessAuthorizer {
	return &sqlStoreAccessAuthorizer{db: db, workforce: workforce}
}

func (a *sqlStoreAccessAuthorizer) AuthorizeStoreAccess(
	ctx context.Context,
	subject TrustedSubject,
	storeID string,
	action string,
) (AuthorizationDecision, error) {
	decision := AuthorizationDecision{
		Allowed:    false,
		ReasonCode: "STORE_ACCESS_DENIED",
		StoreID:    strings.TrimSpace(storeID),
		Action:     strings.TrimSpace(action),
	}
	if a == nil || a.db == nil || a.workforce == nil {
		decision.ReasonCode = "STORE_AUTHORIZATION_UNAVAILABLE"
		return decision, ErrAuthorizationUnavailable
	}
	subject = normalizeTrustedSubject(subject)
	if subject.ID == "" || subject.OperatorContextID == "" || decision.StoreID == "" || decision.Action == "" {
		decision.ReasonCode = "STORE_AUTHORIZATION_INPUT_INVALID"
		return decision, ErrStoreAccessDenied
	}

	var storeOperatorContextID, partnerID string
	err := a.db.QueryRowContext(ctx, `
		SELECT operator_context_id, partner_id
		FROM dsh_stores
		WHERE id=$1`, decision.StoreID,
	).Scan(&storeOperatorContextID, &partnerID)
	if errors.Is(err, sql.ErrNoRows) {
		decision.ReasonCode = "STORE_NOT_FOUND"
		return decision, ErrStoreAccessDenied
	}
	if err != nil {
		decision.ReasonCode = "STORE_AUTHORIZATION_QUERY_FAILED"
		return decision, fmt.Errorf("authorize store access: load store: %w", err)
	}
	decision.PartnerID = strings.TrimSpace(partnerID)
	if strings.TrimSpace(storeOperatorContextID) != subject.OperatorContextID {
		decision.ReasonCode = "CROSS_OPERATOR_CONTEXT_STORE_ACCESS_DENIED"
		return decision, ErrStoreAccessDenied
	}

	if permission, ok := matchingObjectPermission(subject.Permissions, decision.StoreID, decision.PartnerID, decision.Action); ok {
		decision.Allowed = true
		decision.ReasonCode = "IDENTITY_OBJECT_PERMISSION_GRANTED"
		decision.GrantedBy = "identity"
		decision.AllowCrossActor = permissionAllowsCrossActor(permission, decision.Action)
		return decision, nil
	}

	for _, role := range subject.Roles {
		role = strings.ToLower(strings.TrimSpace(role))
		if role != "partner" && role != "field" && role != "captain" {
			continue
		}
		scopes, err := a.workforce.GetActorScopes(ctx, subject.ID, subject.OperatorContextID, role)
		if err != nil {
			decision.ReasonCode = "WORKFORCE_ASSIGNMENTS_UNAVAILABLE"
			return decision, fmt.Errorf("%w: %v", ErrAuthorizationUnavailable, err)
		}
		if !trustedWorkforceScopeIdentity(scopes, subject, role) {
			decision.ReasonCode = "WORKFORCE_ASSIGNMENT_IDENTITY_MISMATCH"
			return decision, ErrStoreAccessDenied
		}
		if activeAssignmentAllowsStore(scopes, decision.StoreID, decision.PartnerID) {
			decision.Allowed = true
			decision.ReasonCode = "WORKFORCE_ACTIVE_ASSIGNMENT_GRANTED"
			decision.GrantedBy = "workforce"
			return decision, nil
		}
	}

	decision.ReasonCode = "NO_ACTIVE_OBJECT_ASSIGNMENT_OR_PERMISSION"
	return decision, ErrStoreAccessDenied
}

func normalizeTrustedSubject(subject TrustedSubject) TrustedSubject {
	subject.ID = strings.TrimSpace(subject.ID)
	subject.OperatorContextID = strings.TrimSpace(subject.OperatorContextID)
	roles := make([]string, 0, len(subject.Roles))
	seen := map[string]struct{}{}
	for _, role := range subject.Roles {
		role = strings.ToLower(strings.TrimSpace(role))
		if role == "" {
			continue
		}
		if _, exists := seen[role]; exists {
			continue
		}
		seen[role] = struct{}{}
		roles = append(roles, role)
	}
	subject.Roles = roles
	return subject
}

func trustedWorkforceScopeIdentity(scopes *workforceclient.ActorScopes, subject TrustedSubject, role string) bool {
	return scopes != nil &&
		strings.TrimSpace(scopes.ActorID) == subject.ID &&
		strings.TrimSpace(scopes.OperatorContextID) == subject.OperatorContextID &&
		strings.EqualFold(strings.TrimSpace(scopes.Role), role)
}

// Workforce returns active assignments only. An expired, suspended, missing,
// or cross-object assignment therefore reaches this function without the
// requested store/partner and is denied.
func activeAssignmentAllowsStore(scopes *workforceclient.ActorScopes, storeID string, partnerID string) bool {
	if scopes == nil {
		return false
	}
	for _, assignedStoreID := range scopes.StoreIDs {
		if strings.TrimSpace(assignedStoreID) == storeID {
			return true
		}
	}
	if partnerID == "" {
		return false
	}
	for _, assignedPartnerID := range scopes.PartnerIDs {
		if strings.TrimSpace(assignedPartnerID) == partnerID {
			return true
		}
	}
	return false
}

func matchingObjectPermission(
	permissions []TrustedPermission,
	storeID string,
	partnerID string,
	action string,
) (TrustedPermission, bool) {
	allowedScopes := map[string]struct{}{
		"store:" + storeID: {},
		"store/" + storeID: {},
	}
	if partnerID != "" {
		allowedScopes["partner:"+partnerID] = struct{}{}
		allowedScopes["partner/"+partnerID] = struct{}{}
	}
	for _, permission := range permissions {
		service := strings.ToLower(strings.TrimSpace(permission.Service))
		permissionAction := strings.TrimSpace(permission.Action)
		scope := strings.TrimSpace(permission.Scope)
		if service != "dsh" && service != "*" {
			continue
		}
		if permissionAction != action && permissionAction != "*" && permissionAction != "store.*" {
			continue
		}
		if _, ok := allowedScopes[scope]; !ok {
			continue
		}
		return permission, true
	}
	return TrustedPermission{}, false
}

func permissionAllowsCrossActor(permission TrustedPermission, action string) bool {
	permissionAction := strings.TrimSpace(permission.Action)
	return permissionAction == "*" ||
		permissionAction == "field.visit.cross-actor" ||
		strings.Contains(action, "cross-actor")
}
