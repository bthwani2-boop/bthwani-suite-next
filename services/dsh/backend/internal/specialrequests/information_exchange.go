package specialrequests

import (
	"context"
	"database/sql"
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

// InformationExchange is the governed conversation required when an operator
// cannot continue a special request without additional client input. It is a
// separate resource so operator questions never overwrite client notes or
// misuse rejection_reason.
type InformationExchange struct {
	ID                       string
	TenantID                 string
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
		&exchange.TenantID,
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
	id, tenant_id, special_request_id, client_id, requested_by_operator_id,
	question, response, status, request_version_at_request,
	request_version_at_response, requested_at, responded_at, updated_at
`

func (s *Service) LatestInformationExchangeInTenant(ctx context.Context, tenantID, requestID string) (*InformationExchange, error) {
	row := s.repo.DB().QueryRowContext(ctx, `SELECT `+informationExchangeColumns+`
		FROM dsh_special_request_information_exchanges
		WHERE tenant_id = $1 AND special_request_id = $2
		ORDER BY requested_at DESC
		LIMIT 1`, tenantID, requestID)
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

// RequestClientInformationInTenant creates one pending exchange and atomically
// moves the request to customer_information. submitted and under_review are the
// only eligible sources; terminal, quoted, paid, or dispatched work cannot be
// rewound through this action.
func (s *Service) RequestClientInformationInTenant(
	ctx context.Context,
	tenantID, requestID, operatorID string,
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

	current, err := s.repo.GetInTenant(ctx, tenantID, requestID)
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
		WHERE tenant_id = $1 AND special_request_id = $2 AND status = 'pending'`, tenantID, requestID).Scan(&pendingCount); err != nil {
		return nil, nil, err
	}
	if pendingCount > 0 {
		return nil, nil, fmt.Errorf("%w: a client information request is already pending", ErrConflict)
	}

	status := StatusNeedsCustomerInput
	stage := "customer_information"
	updated, err := s.repo.UpdateInTenantTx(ctx, tx, tenantID, requestID, expectedVersion, UpdateInput{
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
			id, tenant_id, special_request_id, client_id, requested_by_operator_id,
			question, status, request_version_at_request
		) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
		RETURNING `+informationExchangeColumns,
		exchangeID, tenantID, requestID, current.ClientID, operatorID, question, updated.Version).Scan)
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

// RespondClientInformationInTenant records the client's answer and atomically
// returns the request to governed review. The exchange id and request version
// prevent answering a stale or already-completed question.
func (s *Service) RespondClientInformationInTenant(
	ctx context.Context,
	tenantID, requestID, clientID, exchangeID string,
	expectedVersion int,
	response string,
) (*SpecialRequest, *InformationExchange, error) {
	response, err := validateInformationText("response", response, 1)
	if err != nil {
		return nil, nil, err
	}
	current, err := s.repo.GetInTenant(ctx, tenantID, requestID)
	if err != nil {
		return nil, nil, err
	}
	if current.ClientID != clientID {
		return nil, nil, ErrNotFound
	}
	if current.Status != StatusNeedsCustomerInput || current.WorkflowStage == nil || *current.WorkflowStage != "customer_information" {
		return nil, nil, fmt.Errorf("%w: no client information response is currently expected", ErrConflict)
	}

	tx, err := s.repo.DB().BeginTx(ctx, nil)
	if err != nil {
		return nil, nil, err
	}
	defer tx.Rollback()

	pending, err := scanInformationExchange(tx.QueryRowContext(ctx, `SELECT `+informationExchangeColumns+`
		FROM dsh_special_request_information_exchanges
		WHERE id = $1 AND tenant_id = $2 AND special_request_id = $3 AND client_id = $4 AND status = 'pending'
		FOR UPDATE`, exchangeID, tenantID, requestID, clientID).Scan)
	if err == sql.ErrNoRows {
		return nil, nil, fmt.Errorf("%w: pending information exchange not found", ErrConflict)
	}
	if err != nil {
		return nil, nil, err
	}

	status := StatusUnderReview
	stage := "quote_pending"
	if current.RequestType == TypeAwnakErrand {
		stage = "quote_review"
	}
	updated, err := s.repo.UpdateInTenantTx(ctx, tx, tenantID, requestID, expectedVersion, UpdateInput{
		Status:        &status,
		WorkflowStage: &stage,
	})
	if err != nil {
		return nil, nil, err
	}

	exchange, err := scanInformationExchange(tx.QueryRowContext(ctx, `
		UPDATE dsh_special_request_information_exchanges
		SET response = $1,
			status = 'responded',
			request_version_at_response = $2,
			responded_at = now(),
			updated_at = now()
		WHERE id = $3 AND status = 'pending'
		RETURNING `+informationExchangeColumns,
		response, updated.Version, pending.ID).Scan)
	if err != nil {
		return nil, nil, err
	}

	correlationID := ""
	if current.CorrelationID != nil {
		correlationID = *current.CorrelationID
	}
	if err := WriteAuditEvent(tx, requestID, clientID, "client", "respond_information", response, correlationID, requestJSON(current), requestJSON(updated)); err != nil {
		return nil, nil, fmt.Errorf("write audit event: %w", err)
	}
	if err := operationaloutbox.Enqueue(tx, operationaloutbox.EnqueueInput{
		EventType:     "special_request_information_responded",
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
