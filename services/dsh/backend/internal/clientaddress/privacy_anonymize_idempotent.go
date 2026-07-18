package clientaddress

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strconv"
	"strings"
	"time"
)

func AnonymizeExpiredIdempotent(
	ctx context.Context,
	db *sql.DB,
	limit int,
	mutation PrivacyMutationContext,
) (AnonymizationResult, error) {
	mutation.ActorID = strings.TrimSpace(mutation.ActorID)
	mutation.IdempotencyKey = strings.TrimSpace(mutation.IdempotencyKey)
	mutation.CorrelationID = strings.TrimSpace(mutation.CorrelationID)
	if mutation.ActorID == "" ||
		len(mutation.IdempotencyKey) < 8 ||
		len(mutation.CorrelationID) < 8 ||
		limit < 0 ||
		limit > 10000 {
		return AnonymizationResult{}, ErrPrivacyInvalid
	}

	operation := "anonymize-expired-client-addresses"
	sum := sha256.Sum256([]byte(strconv.Itoa(limit)))
	requestHash := hex.EncodeToString(sum[:])

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return AnonymizationResult{}, err
	}
	defer tx.Rollback()

	lockKey := mutation.ActorID + "|" + operation + "|" + mutation.IdempotencyKey
	if _, err := tx.ExecContext(
		ctx,
		`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
		lockKey,
	); err != nil {
		return AnonymizationResult{}, err
	}

	var storedHash string
	var storedResponse []byte
	err = tx.QueryRowContext(ctx, `
		SELECT request_hash, response_body
		FROM dsh_client_address_privacy_mutation_results
		WHERE actor_id = $1 AND operation = $2 AND idempotency_key = $3`,
		mutation.ActorID,
		operation,
		mutation.IdempotencyKey,
	).Scan(&storedHash, &storedResponse)
	if err == nil {
		if storedHash != requestHash {
			return AnonymizationResult{}, ErrPrivacyIdempotencyConflict
		}
		var replay AnonymizationResult
		if err := json.Unmarshal(storedResponse, &replay); err != nil {
			return AnonymizationResult{}, err
		}
		if err := tx.Commit(); err != nil {
			return AnonymizationResult{}, err
		}
		return replay, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return AnonymizationResult{}, err
	}

	var count int
	if err := tx.QueryRowContext(ctx, `
		SELECT dsh_anonymize_expired_client_addresses($1, $2, $3)`,
		limit,
		mutation.ActorID,
		mutation.CorrelationID,
	).Scan(&count); err != nil {
		return AnonymizationResult{}, err
	}
	result := AnonymizationResult{
		AnonymizedCount: count,
		CompletedAt:     time.Now().UTC(),
	}
	responseBody, err := json.Marshal(result)
	if err != nil {
		return AnonymizationResult{}, err
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_client_address_privacy_mutation_results
			(actor_id, operation, idempotency_key, request_hash, response_body)
		VALUES ($1, $2, $3, $4, $5::jsonb)`,
		mutation.ActorID,
		operation,
		mutation.IdempotencyKey,
		requestHash,
		string(responseBody),
	); err != nil {
		return AnonymizationResult{}, err
	}
	if err := tx.Commit(); err != nil {
		return AnonymizationResult{}, err
	}
	return result, nil
}
