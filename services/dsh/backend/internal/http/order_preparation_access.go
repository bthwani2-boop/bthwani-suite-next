package http

import (
	"context"
	"database/sql"
	"strings"
)

func captainCanReadOrderPreparation(
	ctx context.Context,
	db *sql.DB,
	orderID,
	operatorContextID,
	captainID string,
) (bool, error) {
	orderID = strings.TrimSpace(orderID)
	operatorContextID = strings.TrimSpace(operatorContextID)
	captainID = strings.TrimSpace(captainID)
	if db == nil || orderID == "" || operatorContextID == "" || captainID == "" {
		return false, nil
	}
	var allowed bool
	err := db.QueryRowContext(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM dsh_assignments
			WHERE order_id=$1::uuid
			  AND operator_context_id=$2
			  AND captain_id=$3
			  AND status IN ('offered','accepted','completed')
		)`, orderID, operatorContextID, captainID).Scan(&allowed)
	return allowed, err
}
