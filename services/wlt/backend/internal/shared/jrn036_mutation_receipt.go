package shared

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
)

var ErrJrn036MutationIdempotencyConflict = errors.New("idempotency key was already used with different mutation inputs")

// LoadJrn036MutationReceiptTx serializes callers sharing an idempotency key,
// then returns the original canonical response when the exact mutation was
// already committed. The advisory lock is transaction-scoped, so the receipt
// and the financial mutation can be committed atomically by the caller.
func LoadJrn036MutationReceiptTx(
	ctx context.Context,
	tx *sql.Tx,
	idempotencyKey string,
	requestHash string,
) (json.RawMessage, bool, error) {
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	requestHash = strings.TrimSpace(requestHash)
	if idempotencyKey == "" || requestHash == "" {
		return nil, false, fmt.Errorf("idempotencyKey and requestHash are required")
	}
	if len(idempotencyKey) > 200 {
		return nil, false, fmt.Errorf("idempotencyKey must not exceed 200 characters")
	}

	if _, err := tx.ExecContext(
		ctx,
		`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
		idempotencyKey,
	); err != nil {
		return nil, false, err
	}

	var storedHash string
	var responseText string
	err := tx.QueryRowContext(ctx, `
		SELECT request_hash, response_json::text
		FROM wlt_jrn036_mutation_receipts
		WHERE idempotency_key = $1`, idempotencyKey).Scan(&storedHash, &responseText)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, false, nil
	}
	if err != nil {
		return nil, false, err
	}
	if storedHash != requestHash {
		return nil, false, ErrJrn036MutationIdempotencyConflict
	}
	return json.RawMessage(responseText), true, nil
}

func StoreJrn036MutationReceiptTx(
	ctx context.Context,
	tx *sql.Tx,
	idempotencyKey string,
	requestHash string,
	mutationType string,
	aggregateID string,
	response any,
) error {
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	requestHash = strings.TrimSpace(requestHash)
	mutationType = strings.TrimSpace(mutationType)
	aggregateID = strings.TrimSpace(aggregateID)
	if idempotencyKey == "" || requestHash == "" || mutationType == "" || aggregateID == "" {
		return fmt.Errorf("complete JRN-036 mutation receipt identity is required")
	}
	encoded, err := json.Marshal(response)
	if err != nil {
		return fmt.Errorf("encode JRN-036 mutation receipt: %w", err)
	}
	_, err = tx.ExecContext(ctx, `
		INSERT INTO wlt_jrn036_mutation_receipts
		(idempotency_key, request_hash, mutation_type, aggregate_id, response_json)
		VALUES ($1, $2, $3, $4, $5::jsonb)`,
		idempotencyKey,
		requestHash,
		mutationType,
		aggregateID,
		string(encoded),
	)
	return err
}
