package workforce

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

type ProviderPenaltyCommand struct {
	ID                        string     `json:"id"`
	IncidentID                string     `json:"incidentId"`
	IncidentSourceVersion     int        `json:"incidentSourceVersion"`
	Operation                 string     `json:"operation"`
	CommandIdempotencyKey     string     `json:"commandIdempotencyKey"`
	LifecycleState            string     `json:"lifecycleState"`
	AttemptCount              int        `json:"attemptCount"`
	ReadbackAttemptCount      int        `json:"readbackAttemptCount"`
	NextRetryAt               time.Time  `json:"nextRetryAt"`
	LastErrorCode             string     `json:"lastErrorCode,omitempty"`
	LastError                 string     `json:"lastError,omitempty"`
	RemotePenaltyID           string     `json:"remotePenaltyId,omitempty"`
	RemoteLedgerTransactionID string     `json:"remoteLedgerTransactionId,omitempty"`
	RemoteStatus              string     `json:"remoteStatus,omitempty"`
	ReconciliationState       string     `json:"reconciliationState"`
	TerminalDisposition       string     `json:"terminalDisposition,omitempty"`
	CompletedAt               *time.Time `json:"completedAt,omitempty"`
	CreatedAt                 time.Time  `json:"createdAt"`
	UpdatedAt                 time.Time  `json:"updatedAt"`
}

type financialCommandRequestIdentity struct {
	OperatorContextID string `json:"operatorContextId"`
	IncidentID        string `json:"incidentId"`
	ExpectedVersion   int    `json:"expectedVersion"`
	Operation         string `json:"operation"`
	ToStatus          string `json:"toStatus"`
	Reason            string `json:"reason"`
	RequestedBy       string `json:"requestedBy"`
}

const providerPenaltyCommandColumns = `id::text,incident_id::text,incident_source_version,operation,
	command_idempotency_key,lifecycle_state,attempt_count,readback_attempt_count,next_retry_at,
	last_error_code,last_error,remote_penalty_id,remote_ledger_transaction_id,remote_status,
	reconciliation_state,terminal_disposition,completed_at,created_at,updated_at`

type commandScanner interface{ Scan(dest ...any) error }

func scanProviderPenaltyCommand(row commandScanner) (ProviderPenaltyCommand, error) {
	var command ProviderPenaltyCommand
	err := row.Scan(&command.ID, &command.IncidentID, &command.IncidentSourceVersion, &command.Operation,
		&command.CommandIdempotencyKey, &command.LifecycleState, &command.AttemptCount,
		&command.ReadbackAttemptCount, &command.NextRetryAt, &command.LastErrorCode,
		&command.LastError, &command.RemotePenaltyID, &command.RemoteLedgerTransactionID,
		&command.RemoteStatus, &command.ReconciliationState, &command.TerminalDisposition,
		&command.CompletedAt, &command.CreatedAt, &command.UpdatedAt)
	return command, err
}

func hashFinancialCommand(identity financialCommandRequestIdentity) (string, error) {
	payload, err := json.Marshal(identity)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%x", sha256.Sum256(payload)), nil
}

func (r *Repository) RecordProviderPenaltyCommand(ctx context.Context, incidentID, operatorID, operatorRole, clientIdempotencyKey, correlationID string, input TransitionProviderIncidentInput) (ProviderPenaltyCommand, bool, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return ProviderPenaltyCommand{}, false, err
	}
	incidentID = strings.TrimSpace(incidentID)
	operatorID = strings.TrimSpace(operatorID)
	operatorRole = strings.TrimSpace(operatorRole)
	clientIdempotencyKey = strings.TrimSpace(clientIdempotencyKey)
	correlationID = strings.TrimSpace(correlationID)
	input.ToStatus = strings.TrimSpace(input.ToStatus)
	input.ResolutionNote = strings.TrimSpace(input.ResolutionNote)
	if incidentID == "" || operatorID == "" || operatorRole == "" || clientIdempotencyKey == "" || correlationID == "" || input.ExpectedVersion <= 0 || len(input.ResolutionNote) < 3 {
		return ProviderPenaltyCommand{}, false, ErrInvalidInput
	}
	operation := ""
	switch input.ToStatus {
	case "financial_action_posted":
		operation = "post"
	case "reversed":
		operation = "reverse"
	default:
		return ProviderPenaltyCommand{}, false, ErrInvalidInput
	}
	requestIdentity := financialCommandRequestIdentity{
		OperatorContextID: operatorContextID, IncidentID: incidentID, ExpectedVersion: input.ExpectedVersion,
		Operation: operation, ToStatus: input.ToStatus, Reason: input.ResolutionNote, RequestedBy: operatorID,
	}
	requestHash, err := hashFinancialCommand(requestIdentity)
	if err != nil {
		return ProviderPenaltyCommand{}, false, err
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return ProviderPenaltyCommand{}, false, err
	}
	defer tx.Rollback() //nolint:errcheck
	if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtext($1))`, "provider-penalty-command:"+operatorContextID+":"+incidentID); err != nil {
		return ProviderPenaltyCommand{}, false, err
	}

	var existingHash string
	existing, existingErr := scanProviderPenaltyCommand(tx.QueryRowContext(ctx, `SELECT `+providerPenaltyCommandColumns+`
		FROM workforce_provider_penalty_commands
		WHERE operator_context_id=$1 AND requested_by_actor_id=$2 AND operation=$3 AND client_idempotency_key=$4`,
		operatorContextID, operatorID, operation, clientIdempotencyKey))
	if existingErr == nil {
		if err := tx.QueryRowContext(ctx, `SELECT request_hash FROM workforce_provider_penalty_commands WHERE id=$1::uuid`, existing.ID).Scan(&existingHash); err != nil {
			return ProviderPenaltyCommand{}, false, err
		}
		if existingHash != requestHash {
			return ProviderPenaltyCommand{}, false, ErrIdempotencyConflict
		}
		if err := tx.Commit(); err != nil {
			return ProviderPenaltyCommand{}, false, err
		}
		return existing, true, nil
	}
	if !errors.Is(existingErr, sql.ErrNoRows) {
		return ProviderPenaltyCommand{}, false, existingErr
	}

	var actorID, actorType, status, policyID string
	var version int
	err = tx.QueryRowContext(ctx, `SELECT incident.actor_id,person.workforce_kind,incident.status,incident.policy_id,incident.version
		FROM workforce_provider_incidents incident
		JOIN workforce_people person ON person.operator_context_id=incident.operator_context_id AND person.actor_id=incident.actor_id
		WHERE incident.operator_context_id=$1 AND incident.id=$2::uuid
		FOR UPDATE OF incident`, operatorContextID, incidentID).Scan(&actorID, &actorType, &status, &policyID, &version)
	if errors.Is(err, sql.ErrNoRows) {
		return ProviderPenaltyCommand{}, false, ErrNotFound
	}
	if err != nil {
		return ProviderPenaltyCommand{}, false, err
	}
	if version != input.ExpectedVersion {
		return ProviderPenaltyCommand{}, false, ErrVersionConflict
	}
	if actorType != "captain" && actorType != "field" {
		return ProviderPenaltyCommand{}, false, ErrInvalidInput
	}
	var competingCommandID string
	err = tx.QueryRowContext(ctx, `SELECT id::text FROM workforce_provider_penalty_commands
		WHERE operator_context_id=$1 AND incident_id=$2::uuid AND operation=$3 AND incident_source_version=$4`,
		operatorContextID, incidentID, operation, version).Scan(&competingCommandID)
	if err == nil {
		return ProviderPenaltyCommand{}, false, ErrVersionConflict
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return ProviderPenaltyCommand{}, false, err
	}

	var parentID any
	if operation == "post" {
		if status != "approved" || strings.TrimSpace(policyID) == "" {
			return ProviderPenaltyCommand{}, false, fmt.Errorf("%w: incident must be approved with a penalty policy", ErrInvalidInput)
		}
	} else {
		var parentState string
		var parent string
		err := tx.QueryRowContext(ctx, `SELECT id::text,lifecycle_state FROM workforce_provider_penalty_commands
			WHERE operator_context_id=$1 AND incident_id=$2::uuid AND operation='post'
			ORDER BY created_at DESC LIMIT 1`, operatorContextID, incidentID).Scan(&parent, &parentState)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return ProviderPenaltyCommand{}, false, err
		}
		if status == "approved" {
			if errors.Is(err, sql.ErrNoRows) || oneOf(parentState, "PERMANENTLY_REJECTED", "HISTORIC_UNPROVEN") {
				return ProviderPenaltyCommand{}, false, fmt.Errorf("%w: no active or confirmed penalty exists to reverse", ErrInvalidInput)
			}
		} else if status != "financial_action_posted" {
			return ProviderPenaltyCommand{}, false, fmt.Errorf("%w: incident is not eligible for financial reversal", ErrInvalidInput)
		}
		if parent == "" {
			return ProviderPenaltyCommand{}, false, fmt.Errorf("%w: canonical post command is required", ErrInvalidInput)
		}
		parentID = parent
	}

	commandKey := fmt.Sprintf("workforce-provider-penalty:v1:%s:%s:%d:%s", operatorContextID, incidentID, version, operation)
	command, err := scanProviderPenaltyCommand(tx.QueryRowContext(ctx, `INSERT INTO workforce_provider_penalty_commands(
		operator_context_id,incident_id,incident_source_version,operation,requested_to_status,
		command_idempotency_key,client_idempotency_key,request_hash,provider_actor_id,provider_actor_type,
		policy_id,reason,requested_by_actor_id,requested_by_role,correlation_id,parent_command_id,lifecycle_state)
		VALUES($1,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::uuid,'READY')
		RETURNING `+providerPenaltyCommandColumns,
		operatorContextID, incidentID, version, operation, input.ToStatus, commandKey, clientIdempotencyKey,
		requestHash, actorID, actorType, policyID, input.ResolutionNote, operatorID, operatorRole,
		correlationID, parentID))
	if err != nil {
		return ProviderPenaltyCommand{}, false, err
	}
	if err := tx.Commit(); err != nil {
		return ProviderPenaltyCommand{}, false, err
	}
	return command, false, nil
}

func (r *Repository) ProviderPenaltyCommandByID(ctx context.Context, commandID string) (ProviderPenaltyCommand, error) {
	operatorContextID, err := operatorContextID(ctx)
	if err != nil {
		return ProviderPenaltyCommand{}, err
	}
	command, err := scanProviderPenaltyCommand(r.db.QueryRowContext(ctx, `SELECT `+providerPenaltyCommandColumns+`
		FROM workforce_provider_penalty_commands WHERE operator_context_id=$1 AND id=$2::uuid`, operatorContextID, strings.TrimSpace(commandID)))
	if errors.Is(err, sql.ErrNoRows) {
		return ProviderPenaltyCommand{}, ErrNotFound
	}
	return command, err
}
