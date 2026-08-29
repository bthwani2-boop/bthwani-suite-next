package dispatch

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"strconv"
	"strings"
)

type captainDeliveryStatusCommand struct {
	OperatorContextID string
	ActorID           string
	AssignmentID      string
	Status            DeliveryStatus
	ExpectedVersion   int
	IdempotencyKey    string
	CorrelationID     string
	Fingerprint       string
}

func newCaptainDeliveryStatusCommand(
	operatorContextID string,
	actorID string,
	assignmentID string,
	status DeliveryStatus,
	expectedVersion int,
	idempotencyKey string,
	correlationID string,
) (captainDeliveryStatusCommand, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	actorID = strings.TrimSpace(actorID)
	assignmentID = strings.TrimSpace(assignmentID)
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	correlationID = strings.TrimSpace(correlationID)
	if operatorContextID == "" || actorID == "" || assignmentID == "" {
		return captainDeliveryStatusCommand{}, fmt.Errorf("%w: operator context, captain, and assignment are required", ErrInvalid)
	}
	if expectedVersion < 1 {
		return captainDeliveryStatusCommand{}, fmt.Errorf("%w: assignment version is required", ErrInvalid)
	}
	switch status {
	case DeliveryArrivedStore, DeliveryPickedUp, DeliveryArrivedCustomer:
	default:
		return captainDeliveryStatusCommand{}, fmt.Errorf("%w: unsupported delivery status", ErrInvalid)
	}
	if len(idempotencyKey) < 8 || len(idempotencyKey) > 200 {
		return captainDeliveryStatusCommand{}, fmt.Errorf("%w: idempotency key must contain between 8 and 200 characters", ErrInvalid)
	}
	if len(correlationID) < 8 || len(correlationID) > 200 {
		return captainDeliveryStatusCommand{}, fmt.Errorf("%w: correlation id must contain between 8 and 200 characters", ErrInvalid)
	}
	fingerprintInput := strings.Join([]string{
		operatorContextID,
		actorID,
		assignmentID,
		string(status),
		strconv.Itoa(expectedVersion),
	}, "\x00")
	digest := sha256.Sum256([]byte(fingerprintInput))
	return captainDeliveryStatusCommand{
		OperatorContextID: operatorContextID,
		ActorID:           actorID,
		AssignmentID:      assignmentID,
		Status:            status,
		ExpectedVersion:   expectedVersion,
		IdempotencyKey:    idempotencyKey,
		CorrelationID:     correlationID,
		Fingerprint:       hex.EncodeToString(digest[:]),
	}, nil
}

func beginCaptainDeliveryStatusCommand(tx *sql.Tx, command captainDeliveryStatusCommand) (bool, error) {
	if _, err := tx.Exec(
		`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
		command.OperatorContextID+"|captain-delivery-status|"+command.IdempotencyKey,
	); err != nil {
		return false, err
	}

	var assignmentID, actorID, status, fingerprint string
	err := tx.QueryRow(`
		SELECT assignment_id::text, actor_id, status, request_fingerprint
		FROM dsh_captain_delivery_status_command_receipts
		WHERE operator_context_id = $1 AND idempotency_key = $2
		FOR UPDATE`, command.OperatorContextID, command.IdempotencyKey).
		Scan(&assignmentID, &actorID, &status, &fingerprint)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	if assignmentID != command.AssignmentID || actorID != command.ActorID || status != string(command.Status) || fingerprint != command.Fingerprint {
		return false, ErrIdempotencyConflict
	}
	return true, nil
}

func recordCaptainDeliveryStatusCommand(tx *sql.Tx, command captainDeliveryStatusCommand) error {
	result, err := tx.Exec(`
		INSERT INTO dsh_captain_delivery_status_command_receipts (
			operator_context_id, actor_id, assignment_id, status, expected_version,
			idempotency_key, request_fingerprint, correlation_id
		) VALUES ($1, $2, $3::uuid, $4, $5, $6, $7, $8)
		ON CONFLICT (operator_context_id, idempotency_key) DO NOTHING`,
		command.OperatorContextID,
		command.ActorID,
		command.AssignmentID,
		string(command.Status),
		command.ExpectedVersion,
		command.IdempotencyKey,
		command.Fingerprint,
		command.CorrelationID,
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
	found, err := beginCaptainDeliveryStatusCommand(tx, command)
	if err != nil {
		return err
	}
	if !found {
		return fmt.Errorf("%w: command receipt disappeared during mutation", ErrConflict)
	}
	return nil
}
