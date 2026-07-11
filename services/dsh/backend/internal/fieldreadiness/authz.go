package fieldreadiness

import (
	"context"
	"database/sql"

	"dsh-api/internal/store"
)

// AuthorizeStore ensures the actor is allowed to operate against storeID
// (assigned scope, or operator override), returning ErrForbidden otherwise.
func AuthorizeStore(ctx context.Context, db *sql.DB, actor store.StoreActor, storeID string) error {
	allowed, err := store.ActorCanAccessStore(ctx, db, actor, storeID)
	if err != nil {
		return err
	}
	if !allowed {
		return ErrForbidden
	}
	return nil
}

// GetOwnedVisit loads a visit and verifies the actor may access the store it
// belongs to. Returns ErrNotFound if the visit doesn't exist, ErrForbidden if
// the actor cannot access its store.
func GetOwnedVisit(ctx context.Context, db *sql.DB, actor store.StoreActor, visitID string) (Visit, error) {
	v, err := GetVisit(ctx, db, visitID)
	if err != nil {
		return Visit{}, err
	}
	if err := AuthorizeStore(ctx, db, actor, v.StoreID); err != nil {
		return Visit{}, err
	}
	return v, nil
}
