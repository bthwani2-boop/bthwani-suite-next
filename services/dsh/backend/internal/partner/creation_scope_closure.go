package partner

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	"dsh-api/internal/store"
)

// ReconcilePartnerCreationScopes closes authorization after the idempotent
// partner+first-store primitive. The legacy primitive historically inserted a
// field scope for every creator; this function makes the final scope reflect
// the actual creating surface and grants the partner owner its own scope.
func ReconcilePartnerCreationScopes(ctx context.Context, db *sql.DB, operatorContextID string, p Partner) error {
	operatorContextID = strings.TrimSpace(operatorContextID)
	if operatorContextID == "" || strings.TrimSpace(p.ID) == "" {
		return ErrInvalid
	}

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	var storeID string
	var storeCount int
	if err := tx.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM dsh_stores
		WHERE partner_id = $1 AND operator_context_id = $2`,
		p.ID, operatorContextID).Scan(&storeCount); err != nil {
		return err
	}
	if storeCount > 1 {
		return store.ErrAmbiguousPartnerStores
	}
	err = tx.QueryRowContext(ctx, `
		SELECT id FROM dsh_stores
		WHERE partner_id = $1 AND operator_context_id = $2
		FOR UPDATE`,
		p.ID, operatorContextID,
	).Scan(&storeID)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}

	creatorID := strings.TrimSpace(p.CreatedByActorID)
	if p.CreatedBySurface == "app-field" {
		if err := store.EnsureFieldAssignedScopeTx(ctx, tx, operatorContextID, storeID, creatorID); err != nil {
			return err
		}
	} else if creatorID != "" {
		if _, err := tx.ExecContext(ctx, `
			UPDATE dsh_store_actor_scopes SET active = false
			WHERE actor_id = $1 AND actor_role = 'field' AND store_id = $2`, creatorID, storeID); err != nil {
			return err
		}
	}

	if err := store.EnsurePartnerOwnerScopeTx(ctx, tx, operatorContextID, storeID, p.OwnerActorID); err != nil {
		return err
	}
	return tx.Commit()
}
