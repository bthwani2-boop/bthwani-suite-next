package cart

import (
	"context"
	"database/sql"
	"errors"
)

var ErrMutationOutcomeUnknown = errors.New("cart mutation outcome is preserved but cannot be replayed safely")

func mutationOutcomeQuarantinedTx(
	ctx context.Context,
	tx *sql.Tx,
	clientID string,
	idempotencyKey string,
) (bool, error) {
	var quarantined bool
	err := tx.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM dsh_cart_mutation_receipt_quarantine
			WHERE client_id = $1 AND idempotency_key = $2
		)`,
		clientID,
		idempotencyKey,
	).Scan(&quarantined)
	return quarantined, err
}

// FindMutationReceiptWithOutcome preserves the existing committed-receipt API
// while distinguishing a deliberately quarantined historical key from a key
// that was never committed. Quarantine is evidence only; it never fabricates
// a replayable cart version or mutation result.
func FindMutationReceiptWithOutcome(
	ctx context.Context,
	db *sql.DB,
	clientID string,
	idempotencyKey string,
) (*MutationReceipt, error) {
	receipt, err := FindMutationReceipt(ctx, db, clientID, idempotencyKey)
	if !errors.Is(err, ErrMutationReceiptNotFound) {
		return receipt, err
	}
	if db == nil {
		return nil, ErrMutationReceiptNotFound
	}

	var quarantined bool
	queryErr := db.QueryRowContext(ctx, `
		SELECT EXISTS (
			SELECT 1
			FROM dsh_cart_mutation_receipt_quarantine
			WHERE client_id = $1 AND idempotency_key = $2
		)`,
		clientID,
		idempotencyKey,
	).Scan(&quarantined)
	if queryErr != nil {
		return nil, queryErr
	}
	if quarantined {
		return nil, ErrMutationOutcomeUnknown
	}
	return nil, ErrMutationReceiptNotFound
}
