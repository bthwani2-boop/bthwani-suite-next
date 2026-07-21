package clientaddress

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

var (
	ErrPrivacyInvalid             = errors.New("invalid client address privacy request")
	ErrPrivacyVersionConflict     = errors.New("client address privacy policy version conflict")
	ErrPrivacyIdempotencyConflict = errors.New("client address privacy idempotency conflict")
)

type PrivacyPolicy struct {
	Enabled       bool      `json:"enabled"`
	RetentionDays int       `json:"retentionDays"`
	BatchLimit    int       `json:"batchLimit"`
	Version       int       `json:"version"`
	UpdatedBy     string    `json:"updatedBy"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

type UpdatePrivacyPolicyInput struct {
	Enabled         bool   `json:"enabled"`
	RetentionDays   int    `json:"retentionDays"`
	BatchLimit      int    `json:"batchLimit"`
	ExpectedVersion int    `json:"expectedVersion"`
	Reason          string `json:"reason"`
}

type PrivacyMutationContext struct {
	ActorID        string
	IdempotencyKey string
	CorrelationID  string
}

type AnonymizationResult struct {
	AnonymizedCount int       `json:"anonymizedCount"`
	CompletedAt     time.Time `json:"completedAt"`
}

func GetPrivacyPolicy(
	ctx context.Context,
	db *sql.DB,
) (PrivacyPolicy, error) {
	var policy PrivacyPolicy
	err := db.QueryRowContext(ctx, `
		SELECT enabled, retention_days, batch_limit, version, updated_by, updated_at
		FROM dsh_client_address_privacy_policy
		WHERE id = 1`).Scan(
		&policy.Enabled,
		&policy.RetentionDays,
		&policy.BatchLimit,
		&policy.Version,
		&policy.UpdatedBy,
		&policy.UpdatedAt,
	)
	return policy, err
}

func UpdatePrivacyPolicy(
	ctx context.Context,
	db *sql.DB,
	input UpdatePrivacyPolicyInput,
	mutation PrivacyMutationContext,
) (PrivacyPolicy, error) {
	input.Reason = strings.TrimSpace(input.Reason)
	mutation.ActorID = strings.TrimSpace(mutation.ActorID)
	mutation.IdempotencyKey = strings.TrimSpace(mutation.IdempotencyKey)
	mutation.CorrelationID = strings.TrimSpace(mutation.CorrelationID)
	if input.RetentionDays < 0 ||
		input.RetentionDays > 3650 ||
		input.BatchLimit < 1 ||
		input.BatchLimit > 10000 ||
		input.ExpectedVersion < 1 ||
		len(input.Reason) < 3 ||
		len(input.Reason) > 500 ||
		mutation.ActorID == "" ||
		len(mutation.IdempotencyKey) < 8 ||
		len(mutation.CorrelationID) < 8 {
		return PrivacyPolicy{}, ErrPrivacyInvalid
	}

	payload, err := json.Marshal(input)
	if err != nil {
		return PrivacyPolicy{}, err
	}
	sum := sha256.Sum256(payload)
	requestHash := hex.EncodeToString(sum[:])
	operation := "update-client-address-privacy-policy"

	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return PrivacyPolicy{}, err
	}
	defer tx.Rollback()

	lockKey := mutation.ActorID + "|" + operation + "|" + mutation.IdempotencyKey
	if _, err := tx.ExecContext(
		ctx,
		`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
		lockKey,
	); err != nil {
		return PrivacyPolicy{}, err
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
			return PrivacyPolicy{}, ErrPrivacyIdempotencyConflict
		}
		var replay PrivacyPolicy
		if err := json.Unmarshal(storedResponse, &replay); err != nil {
			return PrivacyPolicy{}, err
		}
		if err := tx.Commit(); err != nil {
			return PrivacyPolicy{}, err
		}
		return replay, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return PrivacyPolicy{}, err
	}

	var before PrivacyPolicy
	err = tx.QueryRowContext(ctx, `
		SELECT enabled, retention_days, batch_limit, version, updated_by, updated_at
		FROM dsh_client_address_privacy_policy
		WHERE id = 1
		FOR UPDATE`).Scan(
		&before.Enabled,
		&before.RetentionDays,
		&before.BatchLimit,
		&before.Version,
		&before.UpdatedBy,
		&before.UpdatedAt,
	)
	if err != nil {
		return PrivacyPolicy{}, err
	}
	if before.Version != input.ExpectedVersion {
		return PrivacyPolicy{}, ErrPrivacyVersionConflict
	}

	var result PrivacyPolicy
	err = tx.QueryRowContext(ctx, `
		UPDATE dsh_client_address_privacy_policy
		SET enabled = $1,
		    retention_days = $2,
		    batch_limit = $3,
		    version = version + 1,
		    updated_by = $4,
		    updated_at = NOW()
		WHERE id = 1
		RETURNING enabled, retention_days, batch_limit, version, updated_by, updated_at`,
		input.Enabled,
		input.RetentionDays,
		input.BatchLimit,
		mutation.ActorID,
	).Scan(
		&result.Enabled,
		&result.RetentionDays,
		&result.BatchLimit,
		&result.Version,
		&result.UpdatedBy,
		&result.UpdatedAt,
	)
	if err != nil {
		return PrivacyPolicy{}, err
	}

	metadata, err := json.Marshal(map[string]any{
		"reason":        input.Reason,
		"fromVersion":   before.Version,
		"toVersion":     result.Version,
		"enabled":       result.Enabled,
		"retentionDays": result.RetentionDays,
		"batchLimit":    result.BatchLimit,
	})
	if err != nil {
		return PrivacyPolicy{}, err
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_client_address_privacy_events
			(address_id, client_subject_hash, action, actor_id, correlation_id,
			 policy_version, metadata)
		VALUES ('privacy-policy', encode(digest('privacy-policy', 'sha256'), 'hex'),
			'policy_updated', $1, $2, $3, $4::jsonb)`,
		mutation.ActorID,
		mutation.CorrelationID,
		result.Version,
		string(metadata),
	); err != nil {
		return PrivacyPolicy{}, err
	}

	responseBody, err := json.Marshal(result)
	if err != nil {
		return PrivacyPolicy{}, err
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
		return PrivacyPolicy{}, err
	}

	if err := tx.Commit(); err != nil {
		return PrivacyPolicy{}, err
	}
	return result, nil
}

func AnonymizeExpired(
	ctx context.Context,
	db *sql.DB,
	limit int,
	actorID string,
	correlationID string,
) (AnonymizationResult, error) {
	actorID = strings.TrimSpace(actorID)
	correlationID = strings.TrimSpace(correlationID)
	if actorID == "" || len(correlationID) < 8 || limit < 0 || limit > 10000 {
		return AnonymizationResult{}, ErrPrivacyInvalid
	}
	var count int
	if err := db.QueryRowContext(ctx, `
		SELECT dsh_anonymize_expired_client_addresses($1, $2, $3)`,
		limit,
		actorID,
		correlationID,
	).Scan(&count); err != nil {
		return AnonymizationResult{}, err
	}
	return AnonymizationResult{
		AnonymizedCount: count,
		CompletedAt:     time.Now().UTC(),
	}, nil
}
