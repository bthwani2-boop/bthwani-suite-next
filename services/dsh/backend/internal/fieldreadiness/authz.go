package fieldreadiness

import (
	"context"
	"database/sql"

	"dsh-api/internal/store"
)

// AuthorizeStore ensures the actor has an active canonical DSH store scope.
// Identity roles or permission labels never bypass object authorization.
func AuthorizeStore(ctx context.Context, db *sql.DB, wf store.WorkforceScopeResolver, actor store.StoreActor, storeID string) error {
	allowed, err := store.ActorCanAccessStore(ctx, db, wf, actor, storeID)
	if err != nil {
		return err
	}
	if !allowed {
		return ErrForbidden
	}
	return nil
}

// GetOwnedVisit loads a visit and requires both visit ownership and canonical
// store scope. Operators must use separate governed operator operations; a role
// name never overrides field-agent ownership.
func GetOwnedVisit(ctx context.Context, db *sql.DB, wf store.WorkforceScopeResolver, actor store.StoreActor, visitID string) (Visit, error) {
	v, err := GetVisit(ctx, db, visitID)
	if err != nil {
		return Visit{}, err
	}
	if v.FieldAgentID != actor.ID {
		return Visit{}, ErrForbidden
	}
	if err := AuthorizeStore(ctx, db, wf, actor, v.StoreID); err != nil {
		return Visit{}, err
	}
	return v, nil
}
