package orders

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

// MarkReadyWithIssueGuard makes the open-issue check and readiness transition
// one database transaction. A screen cannot bypass this invariant by racing a
// stale read or by calling the mutation directly.
func MarkReadyWithIssueGuard(db *sql.DB, orderID, actorID string) (*Order, error) {
	orderID = strings.TrimSpace(orderID)
	actorID = strings.TrimSpace(actorID)
	if db == nil || orderID == "" || actorID == "" {
		return nil, ErrInvalid
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var current OrderStatus
	if err := tx.QueryRow(`
		SELECT status
		FROM dsh_orders
		WHERE id=$1::uuid
		FOR UPDATE`, orderID).Scan(&current); errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	} else if err != nil {
		return nil, err
	}
	if current != StatusPreparing {
		return nil, fmt.Errorf("%w: cannot mark ready from %s", ErrConflict, current)
	}

	openIssueCount, err := countOpenPreparationIssuesTx(tx, orderID)
	if err != nil {
		return nil, err
	}
	if openIssueCount > 0 {
		return nil, fmt.Errorf("%w: %d preparation issues must be resolved before readiness", ErrConflict, openIssueCount)
	}

	result, err := tx.Exec(`
		UPDATE dsh_orders
		SET status=$2,
		    ready_at=COALESCE(ready_at,NOW()),
		    updated_at=NOW()
		WHERE id=$1::uuid AND status=$3`,
		orderID,
		string(StatusReadyForPickup),
		string(StatusPreparing),
	)
	if err != nil {
		return nil, err
	}
	if affected, _ := result.RowsAffected(); affected != 1 {
		return nil, ErrConflict
	}
	if _, err := tx.Exec(`
		INSERT INTO dsh_order_status_events(order_id,actor_role,from_status,to_status,note)
		VALUES($1::uuid,'partner',$2,$3,'order ready after preparation issue gate')`,
		orderID,
		string(StatusPreparing),
		string(StatusReadyForPickup),
	); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return GetOrder(db, orderID)
}
