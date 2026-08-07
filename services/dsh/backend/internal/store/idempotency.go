package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
)

type storeMutationFingerprint struct {
	OperatorContextID string `json:"operatorContextId"`
	ActorID           string `json:"actorId"`
	StoreID           string `json:"storeId"`
	Operation         string `json:"operation"`
	Payload           any    `json:"payload"`
}

func storeMutationRequestHash(operatorContextID, actorID, storeID, operation string, payload any) (string, error) {
	fingerprint := storeMutationFingerprint{
		OperatorContextID: strings.TrimSpace(operatorContextID),
		ActorID:           strings.TrimSpace(actorID),
		StoreID:           strings.TrimSpace(storeID),
		Operation:         strings.TrimSpace(operation),
		Payload:           payload,
	}
	encoded, err := json.Marshal(fingerprint)
	if err != nil {
		return "", err
	}
	return hashBytes(encoded), nil
}

func storeMutationIdempotencyLockKey(actorID, operation, key string) string {
	return fmt.Sprintf(
		"dsh:store:idempotency:%s\x1f%s\x1f%s",
		strings.TrimSpace(actorID),
		strings.TrimSpace(operation),
		strings.TrimSpace(key),
	)
}

func lockStoreMutationIdempotency(ctx context.Context, tx *sql.Tx, actorID, operation, key string) error {
	if tx == nil {
		return fmt.Errorf("store idempotency transaction is required")
	}
	_, err := tx.ExecContext(
		ctx,
		`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
		storeMutationIdempotencyLockKey(actorID, operation, key),
	)
	return err
}
