package clientaddress

import (
	"context"
	"database/sql"
	"fmt"
)

func normalizeReceiptPurgeLimit(limit int) int {
	if limit < 1 {
		return 1000
	}
	if limit > 10000 {
		return 10000
	}
	return limit
}

// PurgeExpiredMutationReceipts executes the bounded PostgreSQL retention
// function. It returns only an aggregate count and never reads receipt payloads.
func PurgeExpiredMutationReceipts(ctx context.Context, db *sql.DB, limit int) (int, error) {
	var deleted int
	if err := db.QueryRowContext(
		ctx,
		`SELECT dsh_purge_expired_client_address_mutation_receipts($1)`,
		normalizeReceiptPurgeLimit(limit),
	).Scan(&deleted); err != nil {
		return 0, fmt.Errorf("purge expired client address mutation receipts: %w", err)
	}
	return deleted, nil
}
