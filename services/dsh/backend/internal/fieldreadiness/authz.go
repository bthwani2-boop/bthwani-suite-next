package fieldreadiness

import (
	"context"
	"database/sql"
	"errors"

	"dsh-api/internal/store"
)

func authorizeStoreAction(
	ctx context.Context,
	db *sql.DB,
	wf store.WorkforceScopeResolver,
	actor store.StoreActor,
	storeID string,
	action string,
) (store.AuthorizationDecision, error) {
	if db == nil || wf == nil {
		return store.AuthorizationDecision{}, store.ErrAuthorizationUnavailable
	}
	decision, err := store.NewStoreAccessAuthorizer(db, wf).AuthorizeStoreAccess(
		ctx,
		store.TrustedSubjectForActor(ctx, actor),
		storeID,
		action,
	)
	if errors.Is(err, store.ErrStoreAccessDenied) || !decision.Allowed {
		return decision, ErrForbidden
	}
	return decision, err
}

// AuthorizeStore verifies explicit Identity permissions or an active Workforce
// assignment and then DSH object ownership. Role names never grant access.
func AuthorizeStore(ctx context.Context, db *sql.DB, wf store.WorkforceScopeResolver, actor store.StoreActor, storeID string) error {
	_, err := authorizeStoreAction(ctx, db, wf, actor, storeID, "field.store.access")
	return err
}

// GetOwnedVisit requires both store authorization and visit ownership. Access
// to another actor's visit requires an explicit Identity object permission for
// field.visit.cross-actor; an operator role is never a bypass.
func GetOwnedVisit(ctx context.Context, db *sql.DB, wf store.WorkforceScopeResolver, actor store.StoreActor, visitID string) (Visit, error) {
	v, err := GetVisit(ctx, db, visitID)
	if err != nil {
		return Visit{}, err
	}
	if v.FieldAgentID == actor.ID {
		if err := AuthorizeStore(ctx, db, wf, actor, v.StoreID); err != nil {
			return Visit{}, err
		}
		return v, nil
	}
	decision, err := authorizeStoreAction(ctx, db, wf, actor, v.StoreID, "field.visit.cross-actor")
	if err != nil {
		return Visit{}, err
	}
	if !decision.AllowCrossActor {
		return Visit{}, ErrForbidden
	}
	return v, nil
}
