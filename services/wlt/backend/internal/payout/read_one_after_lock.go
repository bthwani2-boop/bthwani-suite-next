package payout

import (
	"context"
	"database/sql"

	"wlt-api/internal/shared"
)

// GetPayoutRequest reloads the basic payout projection after the caller has
// already established the trusted tenant context and completed a tenant-scoped
// lock/transition. The tenant predicate remains mandatory on the readback.
func GetPayoutRequest(ctx context.Context, db *sql.DB, payoutID string) (*PayoutRequest, error) {
	tenantID, err := shared.RequireTenantContext(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := db.QueryContext(ctx,
		"SELECT "+requestCols+" FROM wlt_payout_requests WHERE tenant_id = $1 AND id = $2 LIMIT 1",
		tenantID,
		payoutID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	if !rows.Next() {
		return nil, sql.ErrNoRows
	}
	return scanPayoutRequest(rows)
}
