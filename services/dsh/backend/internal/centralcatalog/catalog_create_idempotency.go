package centralcatalog

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
)

var (
	ErrIdempotencyRequired = errors.New("catalog create idempotency context is required")
	ErrIdempotencyConflict = errors.New("catalog create idempotency key was reused with different inputs")
)

type catalogCreateMutation struct {
	ActorID        string
	Operation      string
	IdempotencyKey string
	RequestHash    string
}

type catalogCreateReceipt struct {
	ResourceType string
	ResourceID   string
}

func newCatalogCreateMutation(actorID, operation, idempotencyKey string, request any) (catalogCreateMutation, error) {
	actorID = strings.TrimSpace(actorID)
	operation = strings.TrimSpace(operation)
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	if actorID == "" || operation == "" || len(idempotencyKey) < 8 || len(idempotencyKey) > 200 {
		return catalogCreateMutation{}, ErrIdempotencyRequired
	}
	encoded, err := json.Marshal(request)
	if err != nil {
		return catalogCreateMutation{}, fmt.Errorf("encode catalog create request: %w", err)
	}
	digest := sha256.Sum256(encoded)
	return catalogCreateMutation{
		ActorID:        actorID,
		Operation:      operation,
		IdempotencyKey: idempotencyKey,
		RequestHash:    hex.EncodeToString(digest[:]),
	}, nil
}

func beginCatalogCreateMutation(
	ctx context.Context,
	db *sql.DB,
	actorID, operation, idempotencyKey string,
	request any,
) (*sql.Tx, catalogCreateMutation, *catalogCreateReceipt, error) {
	mutation, err := newCatalogCreateMutation(actorID, operation, idempotencyKey, request)
	if err != nil {
		return nil, catalogCreateMutation{}, nil, err
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return nil, catalogCreateMutation{}, nil, err
	}
	lockIdentity := strings.Join([]string{"dsh-catalog-create", mutation.ActorID, mutation.Operation, mutation.IdempotencyKey}, "|")
	if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, lockIdentity); err != nil {
		_ = tx.Rollback()
		return nil, catalogCreateMutation{}, nil, err
	}

	var storedHash, resourceType, resourceID string
	err = tx.QueryRowContext(ctx, `
		SELECT request_hash, resource_type, resource_id
		FROM dsh_catalog_create_idempotency
		WHERE actor_id=$1 AND operation=$2 AND idempotency_key=$3`,
		mutation.ActorID, mutation.Operation, mutation.IdempotencyKey,
	).Scan(&storedHash, &resourceType, &resourceID)
	if errors.Is(err, sql.ErrNoRows) {
		return tx, mutation, nil, nil
	}
	if err != nil {
		_ = tx.Rollback()
		return nil, catalogCreateMutation{}, nil, err
	}
	if storedHash != mutation.RequestHash {
		_ = tx.Rollback()
		return nil, catalogCreateMutation{}, nil, ErrIdempotencyConflict
	}
	return tx, mutation, &catalogCreateReceipt{ResourceType: resourceType, ResourceID: resourceID}, nil
}

func recordCatalogCreateMutation(
	ctx context.Context,
	tx *sql.Tx,
	mutation catalogCreateMutation,
	resourceType, resourceID string,
) error {
	if strings.TrimSpace(resourceType) == "" || strings.TrimSpace(resourceID) == "" {
		return ErrInvalid
	}
	_, err := tx.ExecContext(ctx, `
		INSERT INTO dsh_catalog_create_idempotency
			(actor_id, operation, idempotency_key, request_hash, resource_type, resource_id)
		VALUES ($1,$2,$3,$4,$5,$6)`,
		mutation.ActorID, mutation.Operation, mutation.IdempotencyKey, mutation.RequestHash,
		resourceType, resourceID,
	)
	return err
}
