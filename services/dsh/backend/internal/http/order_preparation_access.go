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
	tenantID,
	captainID string,
) (bool, error) {
	orderID = strings.TrimSpace(orderID)
	tenantID = strings.TrimSpace(tenantID)
	captainID = strings.TrimSpace(captainID)
	if db == nil || orderID == "" || tenantID == "" || captainID == "" {
		return false, nil
	}
	var allowed bool
	err := db.QueryRowContext(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM dsh_assignments
			WHERE order_id=$1::uuid
			  AND tenant_id=$2
			  AND captain_id=$3
			  AND status IN ('offered','accepted','completed')
		)`, orderID, tenantID, captainID).Scan(&allowed)
	return allowed, err
}
