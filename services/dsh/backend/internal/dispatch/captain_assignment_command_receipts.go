package dispatch

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
)

type captainAssignmentCommand struct {
	OperatorContextID string
	ActorID           string
	AssignmentID      string
	Operation         string
	IdempotencyKey    string
	CorrelationID     string
	Fingerprint       string
}

func newCaptainAssignmentCommand(
	operatorContextID,
	actorID,
	assignmentID,
	operation,
	idempotencyKey,
	correlationID string,
	fields ...string,
) (captainAssignmentCommand, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	actorID = strings.TrimSpace(actorID)
	assignmentID = strings.TrimSpace(assignmentID)
	operation = strings.TrimSpace(operation)
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	correlationID = strings.TrimSpace(correlationID)
	if operatorContextID == "" || actorID == "" || assignmentID == "" || operation == "" {
		return captainAssignmentCommand{}, fmt.Errorf("%w: command identity is incomplete", ErrInvalid)
	}
	if len(idempotencyKey) < 8 || len(idempotencyKey) > 200 {
		return captainAssignmentCommand{}, fmt.Errorf("%w: Idempotency-Key must contain between 8 and 200 characters", ErrInvalid)
	}
	if len(correlationID) < 8 || len(correlationID) > 200 {
		return captainAssignmentCommand{}, fmt.Errorf("%w: X-Correlation-ID must contain between 8 and 200 characters", ErrInvalid)
	}
	fingerprintParts := append([]string{operatorContextID, actorID, assignmentID, operation}, fields...)
	fingerprint := sha256.Sum256([]byte(strings.Join(fingerprintParts, "\x00")))
	return captainAssignmentCommand{
		OperatorContextID: operatorContextID,
		ActorID:           actorID,
		AssignmentID:      assignmentID,
		Operation:         operation,
		IdempotencyKey:    idempotencyKey,
		CorrelationID:     correlationID,
		Fingerprint:       hex.EncodeToString(fingerprint[:]),
	}, nil
}

func beginCaptainAssignmentCommand(tx *sql.Tx, command captainAssignmentCommand) (bool, error) {
	if _, err := tx.Exec(
		`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
		command.OperatorContextID+"|captain-assignment|"+command.ActorID+"|"+command.IdempotencyKey,
	); err != nil {
		return false, err
	}

	var storedAssignmentID, storedOperation, storedFingerprint string
	err := tx.QueryRow(`
		SELECT assignment_id::text, operation, request_fingerprint
		FROM dsh_captain_assignment_command_receipts
		WHERE operator_context_id = $1 AND actor_id = $2 AND idempotency_key = $3
		FOR UPDATE
	`, command.OperatorContextID, command.ActorID, command.IdempotencyKey).Scan(
		&storedAssignmentID, &storedOperation, &storedFingerprint)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if storedAssignmentID != command.AssignmentID || storedOperation != command.Operation || storedFingerprint != command.Fingerprint {
		return false, ErrIdempotencyConflict
	}
	return true, nil
}

func recordCaptainAssignmentCommand(tx *sql.Tx, command captainAssignmentCommand) error {
	result, err := tx.Exec(`
		INSERT INTO dsh_captain_assignment_command_receipts
			(operator_context_id, actor_id, assignment_id, operation, idempotency_key, request_fingerprint, correlation_id)
		VALUES ($1, $2, $3::uuid, $4, $5, $6, $7)
		ON CONFLICT (operator_context_id, actor_id, idempotency_key) DO NOTHING
	`, command.OperatorContextID, command.ActorID, command.AssignmentID, command.Operation, command.IdempotencyKey, command.Fingerprint, command.CorrelationID)
	if err != nil {
		return err
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 1 {
		return nil
	}
	found, err := beginCaptainAssignmentCommand(tx, command)
	if err != nil {
		return err
	}
	if !found {
		return fmt.Errorf("%w: command receipt disappeared during mutation", ErrConflict)
	}
	return nil
}
