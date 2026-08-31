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

type deliveryExceptionOperationCommand struct {
	OperatorContextID string
	ActorID           string
	ExceptionID       string
	Operation         string
	ExpectedVersion   int
	Action            string
	Note              string
	NewCaptainID      string
	IdempotencyKey    string
	CorrelationID     string
	Fingerprint       string
}

func newDeliveryExceptionOperationCommand(
	operatorContextID, actorID, exceptionID, operation string,
	expectedVersion int, action, note, newCaptainID, idempotencyKey, correlationID string,
) (deliveryExceptionOperationCommand, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	actorID = strings.TrimSpace(actorID)
	exceptionID = strings.TrimSpace(exceptionID)
	operation = strings.TrimSpace(operation)
	action = strings.TrimSpace(action)
	note = strings.TrimSpace(note)
	newCaptainID = strings.TrimSpace(newCaptainID)
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	correlationID = strings.TrimSpace(correlationID)
	if operatorContextID == "" || actorID == "" || exceptionID == "" || operation == "" {
		return deliveryExceptionOperationCommand{}, fmt.Errorf("%w: delivery exception operation identity is incomplete", ErrInvalid)
	}
	if expectedVersion < 1 {
		return deliveryExceptionOperationCommand{}, fmt.Errorf("%w: delivery exception version is required", ErrInvalid)
	}
	if operation == "resolve" {
		if action == "" || len(note) < 5 || len(note) > 1000 {
			return deliveryExceptionOperationCommand{}, fmt.Errorf("%w: resolution action and note are required", ErrInvalid)
		}
	}
	if len(idempotencyKey) < 8 || len(idempotencyKey) > 200 {
		return deliveryExceptionOperationCommand{}, fmt.Errorf("%w: Idempotency-Key must contain between 8 and 200 characters", ErrInvalid)
	}
	if len(correlationID) < 8 || len(correlationID) > 200 {
		return deliveryExceptionOperationCommand{}, fmt.Errorf("%w: X-Correlation-ID must contain between 8 and 200 characters", ErrInvalid)
	}
	fingerprintInput := strings.Join([]string{
		operatorContextID, actorID, exceptionID, operation,
		strconv.Itoa(expectedVersion), action, note, newCaptainID,
	}, "\x00")
	digest := sha256.Sum256([]byte(fingerprintInput))
	return deliveryExceptionOperationCommand{
		OperatorContextID: operatorContextID,
		ActorID:           actorID,
		ExceptionID:       exceptionID,
		Operation:         operation,
		ExpectedVersion:   expectedVersion,
		Action:            action,
		Note:              note,
		NewCaptainID:      newCaptainID,
		IdempotencyKey:    idempotencyKey,
		CorrelationID:     correlationID,
		Fingerprint:       hex.EncodeToString(digest[:]),
	}, nil
}

func beginDeliveryExceptionOperationCommand(
	tx *sql.Tx,
	command deliveryExceptionOperationCommand,
) (string, bool, error) {
	exceptionID, found, _, err := beginDeliveryExceptionOperationCommandWithStatus(tx, command)
	return exceptionID, found, err
}

func beginDeliveryExceptionOperationCommandWithStatus(
	tx *sql.Tx,
	command deliveryExceptionOperationCommand,
) (string, bool, string, error) {
	if _, err := tx.Exec(
		`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
		command.OperatorContextID+"|delivery-exception-operation|"+command.IdempotencyKey,
	); err != nil {
		return "", false, "", err
	}

	var exceptionID, actorID, operation, fingerprint, status string
	err := tx.QueryRow(`
		SELECT exception_id::text, actor_id, operation, request_fingerprint, status
		FROM dsh_delivery_exception_operation_command_receipts
		WHERE operator_context_id = $1 AND idempotency_key = $2
		FOR UPDATE`, command.OperatorContextID, command.IdempotencyKey).
		Scan(&exceptionID, &actorID, &operation, &fingerprint, &status)
	if errors.Is(err, sql.ErrNoRows) {
		return "", false, "", nil
	}
	if err != nil {
		return "", false, "", err
	}
	if exceptionID != command.ExceptionID || actorID != command.ActorID || operation != command.Operation || fingerprint != command.Fingerprint {
		return "", false, "", ErrIdempotencyConflict
	}
	return exceptionID, true, status, nil
}

func recordDeliveryExceptionOperationCommand(
	tx *sql.Tx,
	command deliveryExceptionOperationCommand,
	item *DeliveryException,
) error {
	result, err := tx.Exec(`
		INSERT INTO dsh_delivery_exception_operation_command_receipts (
			operator_context_id, actor_id, exception_id, operation, expected_version,
			action, note, replacement_captain_id, idempotency_key, request_fingerprint, correlation_id,
			resulting_version
		) VALUES ($1, $2, $3::uuid, $4, $5, NULLIF($6, ''), NULLIF($7, ''), NULLIF($8, ''), $9, $10, $11, $12)
		ON CONFLICT (operator_context_id, idempotency_key) DO NOTHING`,
		command.OperatorContextID, command.ActorID, item.ID, command.Operation, command.ExpectedVersion,
		command.Action, command.Note, command.NewCaptainID, command.IdempotencyKey, command.Fingerprint,
		command.CorrelationID, item.Version,
	)
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
	_, found, err := beginDeliveryExceptionOperationCommand(tx, command)
	if err != nil {
		return err
	}
	if !found {
		return fmt.Errorf("%w: delivery exception operation receipt disappeared during mutation", ErrConflict)
	}
	return nil
}

func reserveDeliveryExceptionOperationCommand(
	db *sql.DB,
	command deliveryExceptionOperationCommand,
) (string, bool, error) {
	tx, err := db.Begin()
	if err != nil {
		return "", false, err
	}
	defer func() { _ = tx.Rollback() }()
	exceptionID, found, status, err := beginDeliveryExceptionOperationCommandWithStatus(tx, command)
	if err != nil {
		return "", false, err
	}
	if found {
		if err := tx.Commit(); err != nil {
			return "", false, err
		}
		return exceptionID, status == "completed", nil
	}
	if _, err := tx.Exec(`
		INSERT INTO dsh_delivery_exception_operation_command_receipts (
			operator_context_id, actor_id, exception_id, operation, expected_version,
			action, note, replacement_captain_id, idempotency_key, request_fingerprint, correlation_id,
			status
		) VALUES ($1, $2, $3::uuid, $4, $5, NULLIF($6, ''), NULLIF($7, ''), NULLIF($8, ''), $9, $10, $11, 'started')`,
		command.OperatorContextID, command.ActorID, command.ExceptionID, command.Operation, command.ExpectedVersion,
		command.Action, command.Note, command.NewCaptainID, command.IdempotencyKey, command.Fingerprint,
		command.CorrelationID,
	); err != nil {
		return "", false, err
	}
	if err := tx.Commit(); err != nil {
		return "", false, err
	}
	return command.ExceptionID, false, nil
}

func completeDeliveryExceptionOperationCommand(
	db *sql.DB,
	command deliveryExceptionOperationCommand,
	item *DeliveryException,
) (*DeliveryException, error) {
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	exceptionID, found, status, err := beginDeliveryExceptionOperationCommandWithStatus(tx, command)
	if err != nil {
		return nil, err
	}
	if !found {
		return nil, fmt.Errorf("%w: delivery exception operation receipt was not reserved", ErrConflict)
	}
	if status != "completed" {
		if _, err := tx.Exec(`
			UPDATE dsh_delivery_exception_operation_command_receipts
			SET status='completed', resulting_version=$3, completed_at=NOW()
			WHERE operator_context_id=$1 AND idempotency_key=$2`,
			command.OperatorContextID, command.IdempotencyKey, item.Version); err != nil {
			return nil, err
		}
	}
	current, err := getDeliveryExceptionForUpdateForContext(tx, command.OperatorContextID, exceptionID)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return current, nil
}

func executeDeliveryExceptionOperationCommand(
	db *sql.DB,
	command deliveryExceptionOperationCommand,
	mutate func(*sql.Tx) (*DeliveryException, error),
) (*DeliveryException, error) {
	tx, err := db.Begin()
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	exceptionID, found, err := beginDeliveryExceptionOperationCommand(tx, command)
	if err != nil {
		return nil, err
	}
	if found {
		item, err := getDeliveryExceptionForUpdateForContext(tx, command.OperatorContextID, exceptionID)
		if err != nil {
			return nil, err
		}
		if err := tx.Commit(); err != nil {
			return nil, err
		}
		return item, nil
	}

	item, err := mutate(tx)
	if err != nil {
		return nil, err
	}
	if err := recordDeliveryExceptionOperationCommand(tx, command, item); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return item, nil
}

func AcknowledgeDeliveryExceptionIdempotentForOperatorContext(
	db *sql.DB,
	operatorContextID, id string,
	expectedVersion int,
	actorID, idempotencyKey, correlationID string,
) (*DeliveryException, error) {
	command, err := newDeliveryExceptionOperationCommand(
		operatorContextID, actorID, id, "acknowledge", expectedVersion,
		"", "", "", idempotencyKey, correlationID,
	)
	if err != nil {
		return nil, err
	}
	return executeDeliveryExceptionOperationCommand(db, command, func(tx *sql.Tx) (*DeliveryException, error) {
		return acknowledgeDeliveryExceptionTx(tx, command.OperatorContextID, command.ExceptionID, command.ExpectedVersion, command.ActorID)
	})
}

func ResolveDeliveryExceptionRetrySameCaptainIdempotentForOperatorContext(
	db *sql.DB,
	operatorContextID, id string,
	expectedVersion int,
	note, actorID, idempotencyKey, correlationID string,
) (*DeliveryException, error) {
	command, err := newDeliveryExceptionOperationCommand(
		operatorContextID, actorID, id, "resolve", expectedVersion,
		"retry_same_captain", note, "", idempotencyKey, correlationID,
	)
	if err != nil {
		return nil, err
	}
	return executeDeliveryExceptionOperationCommand(db, command, func(tx *sql.Tx) (*DeliveryException, error) {
		return resolveDeliveryExceptionRetrySameCaptainTx(tx, command.OperatorContextID, command.ExceptionID, command.ExpectedVersion, command.Note, command.ActorID, true)
	})
}

func ResolveDeliveryExceptionReassignCaptainIdempotentForOperatorContext(
	db *sql.DB,
	operatorContextID, id string,
	expectedVersion int,
	newCaptainID, note, actorID, idempotencyKey, correlationID string,
) (*DeliveryException, error) {
	command, err := newDeliveryExceptionOperationCommand(
		operatorContextID, actorID, id, "resolve", expectedVersion,
		"reassign_captain", note, newCaptainID, idempotencyKey, correlationID,
	)
	if err != nil {
		return nil, err
	}
	return executeDeliveryExceptionOperationCommand(db, command, func(tx *sql.Tx) (*DeliveryException, error) {
		return resolveDeliveryExceptionReassignCaptainTx(tx, command.OperatorContextID, command.ExceptionID, command.ExpectedVersion, command.NewCaptainID, command.Note, command.ActorID, true)
	})
}

func ResolveDeliveryExceptionReturnToStoreIdempotentForOperatorContext(
	db *sql.DB,
	operatorContextID, id string,
	expectedVersion int,
	note, actorID, idempotencyKey, correlationID string,
) (*DeliveryException, error) {
	command, err := newDeliveryExceptionOperationCommand(
		operatorContextID, actorID, id, "resolve", expectedVersion,
		"return_to_store", note, "", idempotencyKey, correlationID,
	)
	if err != nil {
		return nil, err
	}
	return executeDeliveryExceptionOperationCommand(db, command, func(tx *sql.Tx) (*DeliveryException, error) {
		return resolveDeliveryExceptionReturnToStoreTx(tx, command.OperatorContextID, command.ExceptionID, command.ExpectedVersion, command.Note, command.ActorID, true)
	})
}

func ResolveDeliveryExceptionCancelOrderIdempotentForOperatorContext(
	db *sql.DB,
	operatorContextID, id string,
	expectedVersion int,
	note, actorID, idempotencyKey, correlationID string,
) (*DeliveryException, error) {
	command, err := newDeliveryExceptionOperationCommand(
		operatorContextID, actorID, id, "resolve", expectedVersion,
		"cancel_order", note, "", idempotencyKey, correlationID,
	)
	if err != nil {
		return nil, err
	}
	current, err := GetDeliveryExceptionForContext(db, command.OperatorContextID, command.ExceptionID)
	if err != nil {
		return nil, err
	}
	if current.Status == DeliveryExceptionOpen {
		return nil, fmt.Errorf("%w: acknowledge the exception before resolution", ErrConflict)
	}
	if current.Status == DeliveryExceptionResolved {
		if current.ResolutionAction == nil || *current.ResolutionAction != command.Action || current.ResolutionNote == nil || *current.ResolutionNote != command.Note {
			return nil, fmt.Errorf("%w: delivery exception was already resolved differently", ErrConflict)
		}
	}
	if current.Status != DeliveryExceptionResolved && current.Version != command.ExpectedVersion {
		return nil, fmt.Errorf("%w: delivery exception version changed", ErrConflict)
	}
	exceptionID, completed, err := reserveDeliveryExceptionOperationCommand(db, command)
	if err != nil {
		return nil, err
	}
	if completed {
		return GetDeliveryExceptionForContext(db, command.OperatorContextID, exceptionID)
	}
	if current.Status != DeliveryExceptionResolved {
		item, err := resolveDeliveryExceptionCancelOrderWithCorrelation(db, command.OperatorContextID, command.ExceptionID, command.ExpectedVersion, command.Note, command.ActorID, command.CorrelationID)
		if err != nil {
			return nil, err
		}
		current = item
	}
	return completeDeliveryExceptionOperationCommand(db, command, current)
}
