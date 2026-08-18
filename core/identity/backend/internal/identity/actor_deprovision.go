package identity

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	"github.com/lib/pq"
)

// DeprovisionActor removes only an inactive, never-activated Workforce actor
// created by this operator context. It is a saga compensation primitive, not
// a general account-deletion API.
func (r *Repository) DeprovisionActor(ctx context.Context, actorID, operatorContextID string) error {
	actorID = strings.TrimSpace(actorID)
	operatorContextID = strings.TrimSpace(operatorContextID)
	if actorID == "" || operatorContextID == "" {
		return ErrInvalidActivation
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback() //nolint:errcheck

	var status ActorLifecycleStatus
	var passwordHash, actorContext string
	var roles pq.StringArray
	err = tx.QueryRowContext(ctx, `
		SELECT password_hash, operator_context_id, roles, status
		FROM identity_actors WHERE id = $1 FOR UPDATE`, actorID).Scan(
		&passwordHash, &actorContext, &roles, &status,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrActorNotFound
	}
	if err != nil {
		return err
	}
	if actorContext != operatorContextID {
		return ErrForbidden
	}
	if !hasAnyRole([]string(roles), "field", "captain", "employee") {
		return ErrForbidden
	}
	if status != ActorStatusProvisioned || strings.TrimSpace(passwordHash) != "" {
		return ErrInvalidActorTransition
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM identity_actors WHERE id = $1`, actorID); err != nil {
		return err
	}
	return tx.Commit()
}
