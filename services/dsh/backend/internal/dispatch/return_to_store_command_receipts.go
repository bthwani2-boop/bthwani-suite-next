package dispatch

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
)

type returnToStoreCommand struct {
	OperatorContextID string
	ActorID           string
	Command           string
	EntityID          string
	IdempotencyKey    string
	CorrelationID     string
	Fingerprint       string
}

func newReturnToStoreCommand(operatorContextID, actorID, command, entityID, idempotencyKey, correlationID string) (returnToStoreCommand, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	actorID = strings.TrimSpace(actorID)
	command = strings.TrimSpace(command)
	entityID = strings.TrimSpace(entityID)
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	correlationID = strings.TrimSpace(correlationID)
	if operatorContextID == "" || actorID == "" || entityID == "" {
		return returnToStoreCommand{}, fmt.Errorf("%w: operator context, actor, and return entity are required", ErrInvalid)
	}
	if command != "captain_arrive" && command != "partner_accept" {
		return returnToStoreCommand{}, fmt.Errorf("%w: unsupported return-to-store command", ErrInvalid)
	}
	if len(idempotencyKey) < 8 || len(idempotencyKey) > 200 {
		return returnToStoreCommand{}, fmt.Errorf("%w: idempotency key must contain between 8 and 200 characters", ErrInvalid)
	}
	if len(correlationID) < 8 || len(correlationID) > 200 {
		return returnToStoreCommand{}, fmt.Errorf("%w: correlation id must contain between 8 and 200 characters", ErrInvalid)
	}
	digest := sha256.Sum256([]byte(strings.Join([]string{operatorContextID, actorID, command, entityID}, "\x00")))
	return returnToStoreCommand{
		OperatorContextID: operatorContextID,
		ActorID:           actorID,
		Command:           command,
		EntityID:          entityID,
		IdempotencyKey:    idempotencyKey,
		CorrelationID:     correlationID,
		Fingerprint:       hex.EncodeToString(digest[:]),
	}, nil
}

func beginReturnToStoreCommand(tx *sql.Tx, command returnToStoreCommand) (string, bool, error) {
	if _, err := tx.Exec(
		`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
		command.OperatorContextID+"|return-to-store|"+command.IdempotencyKey,
	); err != nil {
		return "", false, err
	}

	var actorID, operation, entityID, fingerprint, exceptionID string
	err := tx.QueryRow(`
		SELECT actor_id, command, entity_id, request_fingerprint, exception_id::text
		FROM dsh_return_to_store_command_receipts
		WHERE operator_context_id=$1 AND idempotency_key=$2
		FOR UPDATE`, command.OperatorContextID, command.IdempotencyKey).
		Scan(&actorID, &operation, &entityID, &fingerprint, &exceptionID)
	if errors.Is(err, sql.ErrNoRows) {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}
	if actorID != command.ActorID || operation != command.Command || entityID != command.EntityID || fingerprint != command.Fingerprint {
		return "", false, ErrIdempotencyConflict
	}
	return exceptionID, true, nil
}

func recordReturnToStoreCommand(tx *sql.Tx, command returnToStoreCommand, exceptionID string) error {
	result, err := tx.Exec(`
		INSERT INTO dsh_return_to_store_command_receipts (
			operator_context_id, actor_id, command, entity_id, idempotency_key,
			request_fingerprint, correlation_id, exception_id
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::uuid)
		ON CONFLICT (operator_context_id, idempotency_key) DO NOTHING`,
		command.OperatorContextID,
		command.ActorID,
		command.Command,
		command.EntityID,
		command.IdempotencyKey,
		command.Fingerprint,
		command.CorrelationID,
		exceptionID,
	)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 1 {
		return nil
	}
	_, found, err := beginReturnToStoreCommand(tx, command)
	if err != nil {
		return err
	}
	if !found {
		return fmt.Errorf("%w: return-to-store command receipt disappeared during mutation", ErrConflict)
	}
	return nil
}
