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

type operatorDispatchCommand struct {
	OperatorContextID string
	ActorID           string
	Operation         string
	AssignmentID      string
	ReasonCode        string
	Reason            string
	Limit             int
	IdempotencyKey    string
	CorrelationID     string
	Fingerprint       string
}

func newOperatorDispatchCommand(
	operatorContextID, actorID, operation, assignmentID, reasonCode, reason string,
	limit int, idempotencyKey, correlationID string,
) (operatorDispatchCommand, error) {
	operatorContextID = strings.TrimSpace(operatorContextID)
	actorID = strings.TrimSpace(actorID)
	operation = strings.TrimSpace(operation)
	assignmentID = strings.TrimSpace(assignmentID)
	reasonCode = strings.TrimSpace(reasonCode)
	reason = strings.TrimSpace(reason)
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	correlationID = strings.TrimSpace(correlationID)
	if operatorContextID == "" || actorID == "" || operation == "" {
		return operatorDispatchCommand{}, fmt.Errorf("%w: operator dispatch command identity is incomplete", ErrInvalid)
	}
	if operation == "cancel_assignment" && (assignmentID == "" || reasonCode == "" || reason == "") {
		return operatorDispatchCommand{}, fmt.Errorf("%w: assignment cancellation command is incomplete", ErrInvalid)
	}
	if operation == "expire_assignments" {
		if limit <= 0 || limit > 500 {
			return operatorDispatchCommand{}, fmt.Errorf("%w: expiration limit must be between 1 and 500", ErrInvalid)
		}
		assignmentID = ""
		reasonCode = ""
		reason = ""
	}
	if len(idempotencyKey) < 8 || len(idempotencyKey) > 200 {
		return operatorDispatchCommand{}, fmt.Errorf("%w: Idempotency-Key must contain between 8 and 200 characters", ErrInvalid)
	}
	if len(correlationID) < 8 || len(correlationID) > 200 {
		return operatorDispatchCommand{}, fmt.Errorf("%w: X-Correlation-ID must contain between 8 and 200 characters", ErrInvalid)
	}
	fingerprintInput := strings.Join([]string{
		operatorContextID, actorID, operation, assignmentID, reasonCode, reason,
		strconv.Itoa(limit),
	}, "\x00")
	digest := sha256.Sum256([]byte(fingerprintInput))
	return operatorDispatchCommand{
		OperatorContextID: operatorContextID,
		ActorID:           actorID,
		Operation:         operation,
		AssignmentID:      assignmentID,
		ReasonCode:        reasonCode,
		Reason:            reason,
		Limit:             limit,
		IdempotencyKey:    idempotencyKey,
		CorrelationID:     correlationID,
		Fingerprint:       hex.EncodeToString(digest[:]),
	}, nil
}

func beginOperatorDispatchCommand(tx *sql.Tx, command operatorDispatchCommand) (int, bool, error) {
	if _, err := tx.Exec(
		`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
		command.OperatorContextID+"|operator-dispatch|"+command.IdempotencyKey,
	); err != nil {
		return 0, false, err
	}

	var assignmentID, operation, storedFingerprint string
	var resultCount int
	err := tx.QueryRow(`
		SELECT COALESCE(assignment_id::text, ''), operation, request_fingerprint, result_count
		FROM dsh_operator_dispatch_command_receipts
		WHERE operator_context_id = $1 AND idempotency_key = $2
		FOR UPDATE`, command.OperatorContextID, command.IdempotencyKey).
		Scan(&assignmentID, &operation, &storedFingerprint, &resultCount)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, false, nil
	}
	if err != nil {
		return 0, false, err
	}
	if assignmentID != command.AssignmentID || operation != command.Operation || storedFingerprint != command.Fingerprint {
		return 0, false, ErrIdempotencyConflict
	}
	return resultCount, true, nil
}

func recordOperatorDispatchCommand(tx *sql.Tx, command operatorDispatchCommand, resultCount int) error {
	result, err := tx.Exec(`
		INSERT INTO dsh_operator_dispatch_command_receipts (
			operator_context_id, actor_id, operation, assignment_id, reason_code, reason,
			limit_value, idempotency_key, request_fingerprint, correlation_id, result_count
		) VALUES ($1, $2, $3, NULLIF($4, '')::uuid, NULLIF($5, ''), NULLIF($6, ''), $7, $8, $9, $10, $11)
		ON CONFLICT (operator_context_id, idempotency_key) DO NOTHING`,
		command.OperatorContextID, command.ActorID, command.Operation, command.AssignmentID,
		command.ReasonCode, command.Reason, command.Limit, command.IdempotencyKey,
		command.Fingerprint, command.CorrelationID, resultCount,
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
	if _, found, err := beginOperatorDispatchCommand(tx, command); err != nil {
		return err
	} else if !found {
		return fmt.Errorf("%w: operator dispatch command receipt disappeared during mutation", ErrConflict)
	}
	return nil
}
