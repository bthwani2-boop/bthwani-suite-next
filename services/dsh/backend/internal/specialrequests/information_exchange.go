package specialrequests

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"dsh-api/internal/operationaloutbox"

	"github.com/google/uuid"
)

const (
	InformationExchangePending   = "pending"
	InformationExchangeResponded = "responded"
	maxInformationLength         = 2000
)

var ErrInformationResponseIdempotencyConflict = errors.New("special request information response idempotency conflict")

type InformationResponseMutationContext struct {
	IdempotencyKey string
	CorrelationID  string
}

// InformationExchange is the governed conversation required when an operator
// cannot continue a special request without additional client input. It is a
// separate resource so operator questions never overwrite client notes or
// misuse rejection_reason.
type InformationExchange struct {
	ID                       string
	OperatorContextID        string
	SpecialRequestID         string
	ClientID                 string
	RequestedByOperatorID    string
	Question                 string
	Response                 *string
	Status                   string
	RequestVersionAtRequest  int
	RequestVersionAtResponse *int
	RequestedAt              time.Time
	RespondedAt              *time.Time
	UpdatedAt                time.Time
}

func scanInformationExchange(scan func(...any) error) (*InformationExchange, error) {
	var exchange InformationExchange
	if err := scan(
		&exchange.ID,
		&exchange.OperatorContextID,
		&exchange.SpecialRequestID,
		&exchange.ClientID,
		&exchange.RequestedByOperatorID,
		&exchange.Question,
		&exchange.Response,
		&exchange.Status,
		&exchange.RequestVersionAtRequest,
		&exchange.RequestVersionAtResponse,
		&exchange.RequestedAt,
		&exchange.RespondedAt,
		&exchange.UpdatedAt,
	); err != nil {
		return nil, err
	}
	return &exchange, nil
}

const informationExchangeColumns = `
	id, operator_context_id, special_request_id, client_id, requested_by_operator_id,
	question, response, status, request_version_at_request,
	request_version_at_response, requested_at, responded_at, updated_at
`

const informationExchangeByIDSQL = `SELECT
	id, operator_context_id, special_request_id, client_id, requested_by_operator_id,
	question, response, status, request_version_at_request,
	request_version_at_response, requested_at, responded_at, updated_at
FROM dsh_special_request_information_exchanges
WHERE id = $1 AND operator_context_id = $2 AND special_request_id = $3 AND client_id = $4`

func (s *Service) LatestInformationExchangeInOperatorContext(ctx context.Context, operatorContextID, requestID string) (*InformationExchange, error) {
	row := s.repo.DB().QueryRowContext(ctx, `SELECT `+informationExchangeColumns+`
		FROM dsh_special_request_information_exchanges
		WHERE operator_context_id = $1 AND special_request_id = $2
		ORDER BY requested_at DESC
		LIMIT 1`, operatorContextID, requestID)
	exchange, err := scanInformationExchange(row.Scan)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	return exchange, err
}

func validateInformationText(field, value string, minimum int) (string, error) {
	trimmed := strings.TrimSpace(value)
	if len(trimmed) < minimum || len(trimmed) > maxInformationLength {
		return "", fmt.Errorf("%w: %s must be between %d and %d characters", ErrInvalid, field, minimum, maxInformationLength)
	}
	return trimmed, nil
}

// RequestClientInformationInOperatorContext creates one pending exchange and atomically
// moves the request to customer_information. submitted and under_review are the
// only eligible sources; terminal, quoted, paid, or dispatched work cannot be
// rewound through this action.
func (s *Service) RequestClientInformationInOperatorContext(
	ctx context.Context,
	operatorContextID, requestID, operatorID string,
	expectedVersion int,
	question string,
) (*SpecialRequest, *InformationExchange, error) {
	question, err := validateInformationText("question", question, 5)
	if err != nil {
		return nil, nil, err
	}
	operatorID = strings.TrimSpace(operatorID)
	if operatorID == "" {
		return nil, nil, fmt.Errorf("%w: operator is required", ErrInvalid)
	}

	current, err := s.repo.GetInOperatorContext(ctx, operatorContextID, requestID)
	if err != nil {
		return nil, nil, err
	}
	if current.Status != StatusSubmitted && current.Status != StatusUnderReview {
		return nil, nil, fmt.Errorf("%w: information can only be requested during intake or review", ErrConflict)
	}

	tx, err := s.repo.DB().BeginTx(ctx, nil)
	if err != nil {
		return nil, nil, err
	}
	defer tx.Rollback()

	var pendingCount int
	if err := tx.QueryRowContext(ctx, `SELECT count(*)
		FROM dsh_special_request_information_exchanges
		WHERE operator_context_id = $1 AND special_request_id = $2 AND status = 'pending'`, operatorContextID, requestID).Scan(&pendingCount); err != nil {
		return nil, nil, err
	}
	if pendingCount > 0 {
		return nil, nil, fmt.Errorf("%w: a client information request is already pending", ErrConflict)
	}

	status := StatusNeedsCustomerInput
	stage := "customer_information"
	updated, err := s.repo.UpdateInOperatorContextTx(ctx, tx, operatorContextID, requestID, expectedVersion, UpdateInput{
		Status:             &status,
		WorkflowStage:      &stage,
		AssignedOperatorID: &operatorID,
	})
	if err != nil {
		return nil, nil, err
	}

	exchangeID := uuid.NewString()
	exchange, err := scanInformationExchange(tx.QueryRowContext(ctx, `
		INSERT INTO dsh_special_request_information_exchanges (
			id, operator_context_id, special_request_id, client_id, requested_by_operator_id,
			question, status, request_version_at_request
		) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
		RETURNING `+informationExchangeColumns,
		exchangeID, operatorContextID, requestID, current.ClientID, operatorID, question, updated.Version).Scan)
	if err != nil {
		return nil, nil, err
	}

	correlationID := ""
	if current.CorrelationID != nil {
		correlationID = *current.CorrelationID
	}
	if err := WriteAuditEvent(tx, requestID, operatorID, "operator", "request_information", question, correlationID, requestJSON(current), requestJSON(updated)); err != nil {
		return nil, nil, fmt.Errorf("write audit event: %w", err)
	}
	if err := operationaloutbox.Enqueue(tx, operationaloutbox.EnqueueInput{
		EventType:     "special_request_information_requested",
		EntityType:    "special_request",
		EntityID:      requestID,
		Payload:       requestJSON(updated),
		CorrelationID: correlationID,
	}); err != nil {
		return nil, nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, nil, err
	}
	return updated, exchange, nil
}

// RespondClientInformationInOperatorContext records the client's answer and atomically
// returns the request to governed review. The exchange id and request version
// prevent answering a stale or already-completed question.
func (s *Service) RespondClientInformationInOperatorContext(
	ctx context.Context,
	operatorContextID, requestID, clientID, exchangeID string,
	expectedVersion int,
	response string,
	mutation InformationResponseMutationContext,
) (*SpecialRequest, *InformationExchange, error) {
	response, err := validateInformationText("response", response, 1)
	if err != nil {
		return nil, nil, err
	}
	mutation.IdempotencyKey = strings.TrimSpace(mutation.IdempotencyKey)
	mutation.CorrelationID = strings.TrimSpace(mutation.CorrelationID)
	if len(mutation.IdempotencyKey) < 8 || len(mutation.IdempotencyKey) > 200 ||
		len(mutation.CorrelationID) < 8 || len(mutation.CorrelationID) > 200 {
		return nil, nil, fmt.Errorf("%w: idempotency and correlation context is required", ErrInvalid)
	}
	fingerprint := informationResponseFingerprint(operatorContextID, requestID, clientID, exchangeID, expectedVersion, response)
	current, err := s.repo.GetInOperatorContext(ctx, operatorContextID, requestID)
	if err != nil {
		return nil, nil, err
	}
	if current.ClientID != clientID {
		return nil, nil, ErrNotFound
	}
	tx, err := s.repo.DB().BeginTx(ctx, nil)
	if err != nil {
		return nil, nil, err
	}
	defer tx.Rollback()
	if _, err := tx.ExecContext(ctx, `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
		operatorContextID+"|special-request-information-response|"+clientID+"|"+mutation.IdempotencyKey); err != nil {
		return nil, nil, err
	}

	var storedRequestID, storedFingerprint, storedExchangeID string
	receiptErr := tx.QueryRowContext(ctx, `
		SELECT special_request_id::text, request_fingerprint, exchange_id::text
		FROM dsh_special_request_information_response_receipts
		WHERE operator_context_id = $1 AND client_id = $2 AND idempotency_key = $3
		FOR UPDATE`, operatorContextID, clientID, mutation.IdempotencyKey).Scan(
		&storedRequestID, &storedFingerprint, &storedExchangeID)
	if receiptErr == nil {
		exchange, err := replayInformationResponse(informationResponseReplayInput{
			ctx: ctx, tx: tx, requestID: requestID, clientID: clientID, operatorContextID: operatorContextID,
			storedRequestID: storedRequestID, storedFingerprint: storedFingerprint, storedExchangeID: storedExchangeID,
			fingerprint: fingerprint,
		})
		if err != nil {
			return nil, nil, err
		}
		return current, exchange, nil
	}
	if !errors.Is(receiptErr, sql.ErrNoRows) {
		return nil, nil, receiptErr
	}

	if current.Status != StatusNeedsCustomerInput || current.WorkflowStage == nil || *current.WorkflowStage != "customer_information" {
		return nil, nil, fmt.Errorf("%w: no client information response is currently expected", ErrConflict)
	}

	pending, err := scanInformationExchange(tx.QueryRowContext(ctx, `SELECT `+informationExchangeColumns+`
		FROM dsh_special_request_information_exchanges
		WHERE id = $1 AND operator_context_id = $2 AND special_request_id = $3 AND client_id = $4 AND status = 'pending'
		FOR UPDATE`, exchangeID, operatorContextID, requestID, clientID).Scan)
	if err == sql.ErrNoRows {
		return nil, nil, fmt.Errorf("%w: pending information exchange not found", ErrConflict)
	}
	if err != nil {
		return nil, nil, err
	}

	return persistInformationResponse(informationResponsePersistenceInput{
		ctx: ctx, tx: tx, service: s, current: current, operatorContextID: operatorContextID,
		requestID: requestID, clientID: clientID, expectedVersion: expectedVersion, response: response,
		mutation: mutation, fingerprint: fingerprint, exchangeID: pending.ID,
	})
}

type informationResponseReplayInput struct {
	ctx               context.Context
	tx                *sql.Tx
	requestID         string
	clientID          string
	operatorContextID string
	storedRequestID   string
	storedFingerprint string
	storedExchangeID  string
	fingerprint       string
}

func replayInformationResponse(input informationResponseReplayInput) (*InformationExchange, error) {
	if input.storedRequestID != input.requestID || input.storedFingerprint != input.fingerprint {
		return nil, ErrInformationResponseIdempotencyConflict
	}
	exchange, err := scanInformationExchange(input.tx.QueryRowContext(input.ctx, informationExchangeByIDSQL,
		input.storedExchangeID, input.operatorContextID, input.requestID, input.clientID).Scan)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, fmt.Errorf("%w: committed information exchange is missing", ErrConflict)
	}
	if err != nil {
		return nil, err
	}
	if err := input.tx.Commit(); err != nil {
		return nil, err
	}
	return exchange, nil
}

type informationResponsePersistenceInput struct {
	ctx               context.Context
	tx                *sql.Tx
	service           *Service
	current           *SpecialRequest
	operatorContextID string
	requestID         string
	clientID          string
	expectedVersion   int
	response          string
	mutation          InformationResponseMutationContext
	fingerprint       string
	exchangeID        string
}

func persistInformationResponse(input informationResponsePersistenceInput) (*SpecialRequest, *InformationExchange, error) {
	status := StatusUnderReview
	stage := "quote_pending"
	if input.current.RequestType == TypeAwnakErrand {
		stage = "quote_review"
	}
	updated, err := input.service.repo.UpdateInOperatorContextTx(input.ctx, input.tx, input.operatorContextID, input.requestID, input.expectedVersion, UpdateInput{
		Status:        &status,
		WorkflowStage: &stage,
	})
	if err != nil {
		return nil, nil, err
	}

	exchange, err := scanInformationExchange(input.tx.QueryRowContext(input.ctx, `
		UPDATE dsh_special_request_information_exchanges
		SET response = $1,
			status = 'responded',
			request_version_at_response = $2,
			responded_at = now(),
			updated_at = now()
		WHERE id = $3 AND status = 'pending'
		RETURNING `+informationExchangeColumns,
		input.response, updated.Version, input.exchangeID).Scan)
	if err != nil {
		return nil, nil, err
	}
	if err := WriteAuditEvent(input.tx, input.requestID, input.clientID, "client", "respond_information", input.response, input.mutation.CorrelationID, requestJSON(input.current), requestJSON(updated)); err != nil {
		return nil, nil, fmt.Errorf("write audit event: %w", err)
	}
	if err := operationaloutbox.Enqueue(input.tx, operationaloutbox.EnqueueInput{
		EventType:     "special_request_information_responded",
		EntityType:    "special_request",
		EntityID:      input.requestID,
		Payload:       requestJSON(updated),
		CorrelationID: input.mutation.CorrelationID,
	}); err != nil {
		return nil, nil, err
	}
	if _, err := input.tx.ExecContext(input.ctx, `INSERT INTO dsh_special_request_information_response_receipts
		(operator_context_id, client_id, special_request_id, idempotency_key, request_fingerprint,
		 correlation_id, exchange_id, result_version)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		input.operatorContextID, input.clientID, input.requestID, input.mutation.IdempotencyKey, input.fingerprint,
		input.mutation.CorrelationID, exchange.ID, updated.Version); err != nil {
		return nil, nil, err
	}
	if err := input.tx.Commit(); err != nil {
		return nil, nil, err
	}
	return updated, exchange, nil
}

func informationResponseFingerprint(
	operatorContextID, requestID, clientID, exchangeID string,
	expectedVersion int,
	response string,
) string {
	payload, _ := json.Marshal(struct {
		OperatorContextID string `json:"operatorContextId"`
		RequestID         string `json:"requestId"`
		ClientID          string `json:"clientId"`
		ExchangeID        string `json:"exchangeId"`
		ExpectedVersion   int    `json:"expectedVersion"`
		Response          string `json:"response"`
	}{operatorContextID, requestID, clientID, exchangeID, expectedVersion, response})
	digest := sha256.Sum256(payload)
	return hex.EncodeToString(digest[:])
}
