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

func normalizeCreateIdempotency(tenantID, clientID, key, fingerprint string) (string, string, string, string, error) {
	tenantID = strings.TrimSpace(tenantID)
	clientID = strings.TrimSpace(clientID)
	key = strings.TrimSpace(key)
	fingerprint = strings.TrimSpace(fingerprint)
	if tenantID == "" || clientID == "" || len(key) < 16 || len(key) > 200 || len(fingerprint) != 64 {
		return "", "", "", "", ErrInvalid
	}
	return tenantID, clientID, key, fingerprint, nil
}

func LockCreateIdempotencyTx(
	ctx context.Context,
	tx *sql.Tx,
	tenantID string,
	clientID string,
	key string,
) error {
	tenantID = strings.TrimSpace(tenantID)
	clientID = strings.TrimSpace(clientID)
	key = strings.TrimSpace(key)
	if tenantID == "" || clientID == "" || len(key) < 16 || len(key) > 200 {
		return ErrInvalid
	}
	lockScope := tenantID + "\x1f" + clientID + "\x1f" + key
	_, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, lockScope)
	return err
}

func FindCreateIdempotencyTx(
	ctx context.Context,
	tx *sql.Tx,
	tenantID string,
	clientID string,
	key string,
	fingerprint string,
) (*CreateIdempotencyRecord, error) {
	tenantID, clientID, key, fingerprint, err := normalizeCreateIdempotency(
		tenantID, clientID, key, fingerprint,
	)
	if err != nil {
		return nil, err
	}

	var record CreateIdempotencyRecord
	err = tx.QueryRowContext(ctx, `
		SELECT checkout_intent_id::text, request_fingerprint
		FROM dsh_checkout_create_idempotency
		WHERE tenant_id = $1 AND client_id = $2 AND idempotency_key = $3`,
		tenantID, clientID, key,
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
	tenantID string,
	clientID string,
	key string,
	fingerprint string,
	intentID string,
) error {
	tenantID, clientID, key, fingerprint, err := normalizeCreateIdempotency(
		tenantID, clientID, key, fingerprint,
	)
	intentID = strings.TrimSpace(intentID)
	if err != nil || intentID == "" {
		return ErrInvalid
	}
	_, err = tx.ExecContext(ctx, `
		INSERT INTO dsh_checkout_create_idempotency
			(tenant_id, client_id, idempotency_key, request_fingerprint, checkout_intent_id)
		VALUES ($1, $2, $3, $4, $5::uuid)`,
		tenantID, clientID, key, fingerprint, intentID,
	)
	return err
}
