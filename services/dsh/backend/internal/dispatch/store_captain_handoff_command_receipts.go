package dispatch

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
)

type storeCaptainHandoffConfirmationCommand struct {
	OperatorContextID string
	ActorID           string
	OrderID           string
	StoreID           string
	IdempotencyKey    string
	CorrelationID     string
	Fingerprint       string
}

func newStoreCaptainHandoffConfirmationCommand(operatorContextID, actorID, orderID, storeID, idempotencyKey, correlationID string) (storeCaptainHandoffConfirmationCommand, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	actorID = strings.TrimSpace(actorID)
	orderID = strings.TrimSpace(orderID)
	storeID = strings.TrimSpace(storeID)
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	correlationID = strings.TrimSpace(correlationID)
	if operatorContextID == "" || actorID == "" || orderID == "" || storeID == "" {
		return storeCaptainHandoffConfirmationCommand{}, fmt.Errorf("%w: operator context, actor, order, and store are required", ErrInvalid)
	}
	if len(idempotencyKey) < 8 || len(idempotencyKey) > 200 {
		return storeCaptainHandoffConfirmationCommand{}, fmt.Errorf("%w: idempotency key must contain between 8 and 200 characters", ErrInvalid)
	}
	if len(correlationID) < 8 || len(correlationID) > 200 {
		return storeCaptainHandoffConfirmationCommand{}, fmt.Errorf("%w: correlation id must contain between 8 and 200 characters", ErrInvalid)
	}
	digest := sha256.Sum256([]byte(strings.Join([]string{operatorContextID, actorID, orderID, storeID}, "\x00")))
	return storeCaptainHandoffConfirmationCommand{
		OperatorContextID: operatorContextID,
		ActorID:           actorID,
		OrderID:           orderID,
		StoreID:           storeID,
		IdempotencyKey:    idempotencyKey,
		CorrelationID:     correlationID,
		Fingerprint:       hex.EncodeToString(digest[:]),
	}, nil
}

func beginStoreCaptainHandoffConfirmationCommand(tx *sql.Tx, command storeCaptainHandoffConfirmationCommand) (string, bool, error) {
	if _, err := tx.Exec(
		`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
		command.OperatorContextID+"|store-captain-handoff-confirm|"+command.IdempotencyKey,
	); err != nil {
		return "", false, err
	}
	var actorID, orderID, storeID, fingerprint, handoffID string
	err := tx.QueryRow(`
		SELECT actor_id, order_id::text, store_id, request_fingerprint, handoff_id::text
		FROM dsh_store_captain_handoff_command_receipts
		WHERE operator_context_id=$1 AND idempotency_key=$2
		FOR UPDATE`, command.OperatorContextID, command.IdempotencyKey).
		Scan(&actorID, &orderID, &storeID, &fingerprint, &handoffID)
	if errors.Is(err, sql.ErrNoRows) {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}
	if actorID != command.ActorID || orderID != command.OrderID || storeID != command.StoreID || fingerprint != command.Fingerprint {
		return "", false, ErrIdempotencyConflict
	}
	return handoffID, true, nil
}

func recordStoreCaptainHandoffConfirmationCommand(tx *sql.Tx, command storeCaptainHandoffConfirmationCommand, handoffID string) error {
	result, err := tx.Exec(`
		INSERT INTO dsh_store_captain_handoff_command_receipts (
			operator_context_id, actor_id, order_id, store_id, idempotency_key,
			request_fingerprint, correlation_id, handoff_id
		) VALUES ($1,$2,$3::uuid,$4,$5,$6,$7,$8::uuid)
		ON CONFLICT (operator_context_id, idempotency_key) DO NOTHING`,
		command.OperatorContextID,
		command.ActorID,
		command.OrderID,
		command.StoreID,
		command.IdempotencyKey,
		command.Fingerprint,
		command.CorrelationID,
		handoffID,
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
	_, found, err := beginStoreCaptainHandoffConfirmationCommand(tx, command)
	if err != nil {
		return err
	}
	if !found {
		return fmt.Errorf("%w: handoff confirmation receipt disappeared during mutation", ErrConflict)
	}
	return nil
}
