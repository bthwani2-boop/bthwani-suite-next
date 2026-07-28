package payout

import "database/sql"

// GetPayoutRequest reloads the basic payout projection after the reconciliation
// handler has already acquired and validated the payout through lockedPayout.
// Direct HTTP reads use the tenant-scoped HandleGetPayoutRequestWithProviderProof
// path; this compatibility helper must not become a standalone read authority.
func GetPayoutRequest(db *sql.DB, payoutID string) (*PayoutRequest, error) {
	rows, err := db.Query(
		"SELECT "+requestCols+" FROM wlt_payout_requests WHERE id = $1 LIMIT 1",
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
