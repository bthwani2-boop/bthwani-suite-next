package checkout

import (
	"context"
	"database/sql"
	"errors"
	"strings"
)

var ErrIdempotencyConflict = errors.New("checkout idempotency key was reused for a different request")

type CreateIdempotencyRecord struct {
	IntentID          string
	RequestFingerprint string
}

func normalizeCreateIdempotency(operatorContextID, clientID, key, fingerprint string) (string, string, string, string, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	clientID = strings.TrimSpace(clientID)
	key = strings.TrimSpace(key)
	fingerprint = strings.TrimSpace(fingerprint)
	if operatorContextID == "" || clientID == "" || len(key) < 16 || len(key) > 200 || len(fingerprint) != 64 {
		return "", "", "", "", ErrInvalid
	}
	return operatorContextID, clientID, key, fingerprint, nil
}

func LockCreateIdempotencyTx(
	ctx context.Context,
	tx *sql.Tx,
	operatorContextID string,
	clientID string,
	key string,
) error {
	operatorContextID = strings.TrimSpace(operatorContextID)
	clientID = strings.TrimSpace(clientID)
	key = strings.TrimSpace(key)
	if operatorContextID == "" || clientID == "" || len(key) < 16 || len(key) > 200 {
		return ErrInvalid
	}
	lockScope := operatorContextID + "\x1f" + clientID + "\x1f" + key
	_, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, lockScope)
	return err
}

func FindCreateIdempotencyTx(
	ctx context.Context,
	tx *sql.Tx,
	operatorContextID string,
	clientID string,
	key string,
	fingerprint string,
) (*CreateIdempotencyRecord, error) {
	operatorContextID, clientID, key, fingerprint, err := normalizeCreateIdempotency(
		operatorContextID, clientID, key, fingerprint,
	)
	if err != nil {
		return nil, err
	}

	var record CreateIdempotencyRecord
	err = tx.QueryRowContext(ctx, `
		SELECT checkout_intent_id::text, request_fingerprint
		FROM dsh_checkout_create_idempotency
		WHERE operator_context_id = $1 AND client_id = $2 AND idempotency_key = $3`,
		operatorContextID, clientID, key,
	).Scan(&record.IntentID, &record.RequestFingerprint)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if record.RequestFingerprint != fingerprint {
		return nil, ErrIdempotencyConflict
	}
	return &record, nil
}

func BindCreateIdempotencyTx(
	ctx context.Context,
	tx *sql.Tx,
	operatorContextID string,
	clientID string,
	key string,
	fingerprint string,
	intentID string,
) error {
	operatorContextID, clientID, key, fingerprint, err := normalizeCreateIdempotency(
		operatorContextID, clientID, key, fingerprint,
	)
	intentID = strings.TrimSpace(intentID)
	if err != nil || intentID == "" {
		return ErrInvalid
	}
	_, err = tx.ExecContext(ctx, `
		INSERT INTO dsh_checkout_create_idempotency
			(operator_context_id, client_id, idempotency_key, request_fingerprint, checkout_intent_id)
		VALUES ($1, $2, $3, $4, $5::uuid)`,
		operatorContextID, clientID, key, fingerprint, intentID,
	)
	return err
}
