package store

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	"dsh-api/internal/workforceclient"
)

var (
	ErrScopedStoreNotFound = errors.New("scoped store not found")
	ErrVersionConflict     = errors.New("store version conflict")
	ErrIdempotencyConflict = errors.New("idempotency conflict")
)

type StoreActor struct {
	ID                string
	Role              string
	OperatorContextID string
	PhoneE164         string
}

type StoreScope struct {
	StoreID string
	Type    string
}

type WorkforceScopeResolver interface {
	GetActorScopes(ctx context.Context, actorID, operatorContextID, role string) (*workforceclient.ActorScopes, error)
}

func trustedSubjectForStoreActor(ctx context.Context, actor StoreActor) TrustedSubject {
	if subject, ok := TrustedSubjectFromContext(ctx); ok {
		return subject
	}
	role := strings.ToLower(strings.TrimSpace(actor.Role))
	roles := []string{}
	if role == "partner" || role == "field" || role == "captain" || role == "operator" {
		roles = append(roles, role)
	}
	return TrustedSubject{
		ID:                strings.TrimSpace(actor.ID),
		OperatorContextID: strings.TrimSpace(actor.OperatorContextID),
		Roles:             roles,
	}
}

// TrustedSubjectForActor exposes the trusted Identity assertion already bound
// to the request context. The StoreActor fallback carries identity and known
// role metadata only; it never synthesizes permissions.
func TrustedSubjectForActor(ctx context.Context, actor StoreActor) TrustedSubject {
	return trustedSubjectForStoreActor(ctx, actor)
}

// ResolveActorStore resolves the first active Workforce assignment and then
// asks DSH's object authorizer to verify that the store belongs to the trusted
// operator context. DSH-local scope rows are not an assignment authority.
func ResolveActorStore(ctx context.Context, db *sql.DB, wf WorkforceScopeResolver, actor StoreActor) (*DshStoreRow, StoreScope, error) {
	if db == nil || wf == nil {
		return nil, StoreScope{}, ErrAuthorizationUnavailable
	}
	subject := trustedSubjectForStoreActor(ctx, actor)
	if subject.ID == "" || subject.OperatorContextID == "" {
		return nil, StoreScope{}, ErrScopedStoreNotFound
	}
	authorizer := NewStoreAccessAuthorizer(db, wf)
	for _, role := range subject.Roles {
		role = strings.ToLower(strings.TrimSpace(role))
		if role != "partner" && role != "field" && role != "captain" {
			continue
		}
		scopes, err := wf.GetActorScopes(ctx, subject.ID, subject.OperatorContextID, role)
		if err != nil {
			return nil, StoreScope{}, err
		}
		if scopes == nil ||
			strings.TrimSpace(scopes.ActorID) != subject.ID ||
			strings.TrimSpace(scopes.OperatorContextID) != subject.OperatorContextID ||
			!strings.EqualFold(strings.TrimSpace(scopes.Role), role) {
			return nil, StoreScope{}, ErrScopedStoreNotFound
		}
		for _, storeID := range scopes.StoreIDs {
			storeID = strings.TrimSpace(storeID)
			if storeID == "" {
				continue
			}
			decision, err := authorizer.AuthorizeStoreAccess(ctx, subject, storeID, "store.read")
			if err != nil || !decision.Allowed {
				continue
			}
			row, err := GetStoreByIDInternalForOperatorContext(ctx, db, subject.OperatorContextID, storeID)
			if err != nil {
				return nil, StoreScope{}, err
			}
			return row, StoreScope{StoreID: storeID, Type: "workforce:" + role}, nil
		}
	}
	return nil, StoreScope{}, ErrScopedStoreNotFound
}

func ResolveActorStoreForID(ctx context.Context, db *sql.DB, wf WorkforceScopeResolver, actor StoreActor, storeID string) (*DshStoreRow, StoreScope, error) {
	storeID = strings.TrimSpace(storeID)
	if storeID == "" {
		return ResolveActorStore(ctx, db, wf, actor)
	}
	if db == nil || wf == nil {
		return nil, StoreScope{}, ErrAuthorizationUnavailable
	}
	subject := trustedSubjectForStoreActor(ctx, actor)
	decision, err := NewStoreAccessAuthorizer(db, wf).AuthorizeStoreAccess(ctx, subject, storeID, "store.read")
	if err != nil || !decision.Allowed {
		if errors.Is(err, ErrAuthorizationUnavailable) {
			return nil, StoreScope{}, err
		}
		return nil, StoreScope{}, ErrScopedStoreNotFound
	}
	row, err := GetStoreByIDInternalForOperatorContext(ctx, db, subject.OperatorContextID, storeID)
	if err != nil {
		return nil, StoreScope{}, err
	}
	return row, StoreScope{StoreID: storeID, Type: decision.GrantedBy}, nil
}

func GetStoreByIDInternal(ctx context.Context, db *sql.DB, storeID string) (*DshStoreRow, error) {
	return getStoreByIDContext(ctx, db, storeID)
}

// ActorCanAccessStore is the compatibility entry point for existing domain
// operations. It delegates to the explicit authorizer and never interprets a
// role name or a `permission:` prefix as authority.
func ActorCanAccessStore(
	ctx context.Context,
	db queryer,
	wf WorkforceScopeResolver,
	actor StoreActor,
	storeID string,
	action ...string,
) (bool, error) {
	sqlDB, ok := db.(*sql.DB)
	if !ok || sqlDB == nil || wf == nil {
		return false, ErrAuthorizationUnavailable
	}
	requestedAction := "store.read"
	if len(action) > 0 && strings.TrimSpace(action[0]) != "" {
		requestedAction = strings.TrimSpace(action[0])
	}
	decision, err := NewStoreAccessAuthorizer(sqlDB, wf).AuthorizeStoreAccess(
		ctx,
		trustedSubjectForStoreActor(ctx, actor),
		strings.TrimSpace(storeID),
		requestedAction,
	)
	if errors.Is(err, ErrStoreAccessDenied) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return decision.Allowed, nil
}
