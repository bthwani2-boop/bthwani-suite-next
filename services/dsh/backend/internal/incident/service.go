package incident

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"reflect"
	"strings"

	"dsh-api/internal/orders"
	"dsh-api/internal/partnerdelivery"
)

// ReportInput carries both the incident's own fields and whatever the
// dispatched consequence needs to execute. Only the fields relevant to
// IncidentType/TargetEntityType are read by dispatch.
type ReportInput struct {
	OrderID           string
	OperatorContextID string
	TargetEntityType  TargetEntityType
	TargetEntityID    string
	IncidentType      IncidentType
	Reason            string
	TicketReference   string
	ActorID           string
	ActorRole         string
	CorrelationID     string

	// raise_exception consequence.
	ExpectedVersion    int
	EvidenceReferences []string
	CommandID          string

	// cancel consequence.
	ReasonCode string
	ReasonNote string
}

type Service struct {
	db *sql.DB
}

func NewService(db *sql.DB) *Service { return &Service{db: db} }

// Report persists an operational_incident row documenting a sovereign
// intervention, then immediately applies its consequence to the target
// entity. Recording and applying are kept as two explicit steps -- even
// though apply runs synchronously today -- so the incident row is always
// the system of record for *why* a mutation happened, not just *that* it
// happened. A failed apply still leaves the incident row behind with
// status "failed", rather than disappearing.
type incidentCommandEnvelope struct {
	OrderID            string           `json:"orderId"`
	OperatorContextID  string           `json:"operatorContextId"`
	TargetEntityType   TargetEntityType `json:"targetEntityType"`
	TargetEntityID     string           `json:"targetEntityId"`
	IncidentType       IncidentType     `json:"incidentType"`
	Reason             string           `json:"reason"`
	TicketReference    string           `json:"ticketReference"`
	ActorID            string           `json:"actorId"`
	ActorRole          string           `json:"actorRole"`
	CorrelationID      string           `json:"correlationId"`
	ExpectedVersion    int              `json:"expectedVersion"`
	EvidenceReferences []string         `json:"evidenceReferences"`
	CommandID          string           `json:"commandId"`
	ReasonCode         string           `json:"reasonCode"`
	ReasonNote         string           `json:"reasonNote"`
}

func normalizeReportInput(input ReportInput) ReportInput {
	input.OrderID = strings.TrimSpace(input.OrderID)
	input.OperatorContextID = strings.TrimSpace(input.OperatorContextID)
	input.TargetEntityID = strings.TrimSpace(input.TargetEntityID)
	input.Reason = strings.TrimSpace(input.Reason)
	input.TicketReference = strings.TrimSpace(input.TicketReference)
	input.ActorID = strings.TrimSpace(input.ActorID)
	input.ActorRole = strings.TrimSpace(input.ActorRole)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
	input.CommandID = strings.TrimSpace(input.CommandID)
	input.ReasonCode = strings.TrimSpace(input.ReasonCode)
	input.ReasonNote = strings.TrimSpace(input.ReasonNote)
	input.EvidenceReferences = append([]string(nil), input.EvidenceReferences...)
	return input
}

func commandEnvelope(input ReportInput) incidentCommandEnvelope {
	return incidentCommandEnvelope(input)
}

func (i *Incident) commandInput() (ReportInput, bool) {
	if len(i.CommandPayload) == 0 {
		return ReportInput{}, false
	}
	var e incidentCommandEnvelope
	if err := json.Unmarshal(i.CommandPayload, &e); err != nil {
		return ReportInput{}, false
	}
	return ReportInput{OrderID: e.OrderID, OperatorContextID: e.OperatorContextID, TargetEntityType: e.TargetEntityType, TargetEntityID: e.TargetEntityID, IncidentType: e.IncidentType, Reason: e.Reason, TicketReference: e.TicketReference, ActorID: e.ActorID, ActorRole: e.ActorRole, CorrelationID: e.CorrelationID, ExpectedVersion: e.ExpectedVersion, EvidenceReferences: append([]string(nil), e.EvidenceReferences...), CommandID: e.CommandID, ReasonCode: e.ReasonCode, ReasonNote: e.ReasonNote}, true
}

func (s *Service) Report(ctx context.Context, input ReportInput) (*Incident, error) {
	input = normalizeReportInput(input)
	if input.OperatorContextID == "" {
		return nil, fmt.Errorf("%w: operatorContextId is required", ErrInvalid)
	}
	if input.Reason == "" {
		return nil, fmt.Errorf("%w: reason is required", ErrInvalid)
	}
	if input.TicketReference == "" {
		return nil, fmt.Errorf("%w: ticketReference is required", ErrInvalid)
	}
	if input.OrderID == "" || input.TargetEntityID == "" {
		return nil, fmt.Errorf("%w: orderId and targetEntityId are required", ErrInvalid)
	}
	if input.ActorID == "" || input.ActorRole == "" {
		return nil, fmt.Errorf("%w: actorId and actorRole are required", ErrInvalid)
	}
	if input.IncidentType == TypeRaiseException {
		input.CommandID = strings.TrimSpace(input.CommandID)
		if input.CommandID == "" {
			return nil, fmt.Errorf("%w: commandId is required", ErrInvalid)
		}
	}
	if input.CorrelationID != "" {
		existing, err := s.findCommand(ctx, input)
		if err == nil {
			return s.replayCommand(ctx, existing, input)
		}
		if !errors.Is(err, sql.ErrNoRows) {
			return nil, err
		}
	}

	before, err := s.snapshotState(input.OperatorContextID, input.OrderID, input.TargetEntityType, input.TargetEntityID)
	if err != nil {
		return nil, err
	}

	var id string
	err = s.db.QueryRowContext(ctx, `
		INSERT INTO dsh_operational_incidents
			(order_id, operator_context_id, target_entity_type, target_entity_id, incident_type, status,
			 reason, ticket_reference, actor_id, actor_role, before_state, correlation_id, command_payload)
		VALUES ($1::uuid, $2, $3, $4, $5, 'open', $6, $7, $8, $9, $10::jsonb, $11, $12::jsonb)
		ON CONFLICT (operator_context_id, order_id, actor_id, correlation_id)
		    WHERE correlation_id IS NOT NULL AND btrim(correlation_id) <> ''
		DO NOTHING
		RETURNING id`,
		input.OrderID, input.OperatorContextID, string(input.TargetEntityType), input.TargetEntityID, string(input.IncidentType),
		input.Reason, input.TicketReference, input.ActorID, input.ActorRole, nullableJSON(before), nullableString(input.CorrelationID), nullableJSON(mustMarshal(commandEnvelope(input))),
	).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) && input.CorrelationID != "" {
		existing, findErr := s.findCommand(ctx, input)
		if findErr != nil {
			return nil, findErr
		}
		return s.replayCommand(ctx, existing, input)
	}
	if err != nil {
		return nil, err
	}

	return s.apply(ctx, id, input)
}

func (s *Service) findCommand(ctx context.Context, input ReportInput) (*Incident, error) {
	return scanIncident(s.db.QueryRowContext(ctx, incidentByCommandSQL,
		input.OperatorContextID, input.OrderID, input.ActorID, input.CorrelationID).Scan)
}

func sameIncidentCommand(existing *Incident, input ReportInput) bool {
	if existing == nil || existing.CorrelationID == nil || *existing.CorrelationID != input.CorrelationID {
		return false
	}
	stored, ok := existing.commandInput()
	if !ok {
		// A legacy row without the canonical envelope cannot prove that all
		// material command fields are identical. Never infer equality from
		// the projected columns; fail closed and return a collision.
		return false
	}
	return reflect.DeepEqual(commandEnvelope(normalizeReportInput(stored)), commandEnvelope(normalizeReportInput(input)))
}

func (s *Service) replayCommand(ctx context.Context, existing *Incident, input ReportInput) (*Incident, error) {
	if !sameIncidentCommand(existing, input) {
		return nil, ErrConflict
	}
	if existing.Status == StatusApplied {
		return existing, nil
	}
	stored, ok := existing.commandInput()
	if !ok {
		return nil, ErrConflict
	}
	return s.apply(ctx, existing.ID, stored)
}

func (s *Service) snapshotState(operatorContextID, orderID string, entityType TargetEntityType, entityID string) ([]byte, error) {
	switch entityType {
	case TargetPartnerDeliveryTask:
		task, err := partnerdelivery.GetForOperatorContext(s.db, operatorContextID, entityID)
		if err != nil {
			return nil, err
		}
		if task.OrderID != orderID {
			return nil, fmt.Errorf("%w: partner delivery task %s does not belong to order %s", ErrInvalid, entityID, orderID)
		}
		return json.Marshal(task)
	case TargetOrder:
		if entityID != orderID {
			return nil, fmt.Errorf("%w: target order id %s does not match order %s", ErrInvalid, entityID, orderID)
		}
		order, err := orders.GetOrderForContext(s.db, operatorContextID, entityID)
		if err != nil {
			return nil, err
		}
		return json.Marshal(order)
	default:
		return nil, fmt.Errorf("%w: unsupported target entity type %s", ErrInvalid, entityType)
	}
}

// apply dispatches the incident's consequence, then records the outcome
// (after_state + applied_at + status) back onto the incident row.
func (s *Service) apply(ctx context.Context, incidentID string, input ReportInput) (*Incident, error) {
	after, applyErr := s.dispatch(ctx, input)
	if applyErr != nil {
		if _, err := s.db.ExecContext(ctx, `
			UPDATE dsh_operational_incidents
			SET status = 'failed', failure_reason = $2, updated_at = NOW()
			WHERE id = $1 AND operator_context_id = $3`, incidentID, applyErr.Error(), input.OperatorContextID); err != nil {
			return nil, err
		}
		return nil, applyErr
	}
	if _, err := s.db.ExecContext(ctx, `
		UPDATE dsh_operational_incidents
		SET status = 'applied', after_state = $2::jsonb, applied_at = NOW(), updated_at = NOW()
		WHERE id = $1 AND operator_context_id = $3`, incidentID, nullableJSON(after), input.OperatorContextID); err != nil {
		return nil, err
	}
	return Get(s.db, incidentID, input.OperatorContextID)
}

func (s *Service) dispatch(ctx context.Context, input ReportInput) ([]byte, error) {
	switch input.IncidentType {
	case TypeRaiseException:
		if input.TargetEntityType != TargetPartnerDeliveryTask {
			return nil, fmt.Errorf("%w: raise_exception targets a partner_delivery_task", ErrInvalid)
		}
		task, err := partnerdelivery.NewService(s.db, nil).RaiseExceptionCommand(
			ctx, input.OperatorContextID, input.TargetEntityID, input.ExpectedVersion, input.Reason, input.EvidenceReferences,
			input.ActorID, input.ActorRole, input.CorrelationID, input.CommandID,
		)
		if err != nil {
			return nil, err
		}
		return json.Marshal(task)
	case TypeCancel:
		order, err := orders.CancelOrderSync(s.db, orders.CreateCancellationCaseInput{
			OrderID:           input.OrderID,
			OperatorContextID: input.OperatorContextID,
			ActorID:           input.ActorID,
			ActorRole:         input.ActorRole,
			ReasonCode:        input.ReasonCode,
			ReasonNote:        input.ReasonNote,
			CorrelationID:     input.CorrelationID,
		})
		if err != nil {
			return nil, err
		}
		return json.Marshal(order)
	default:
		return nil, fmt.Errorf("%w: unsupported incident type %s", ErrInvalid, input.IncidentType)
	}
}

func mustMarshal(value any) []byte {
	payload, err := json.Marshal(value)
	if err != nil {
		panic(err)
	}
	return payload
}

func nullableJSON(payload []byte) any {
	if len(payload) == 0 {
		return nil
	}
	return string(payload)
}

func nullableString(value string) any {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return value
}
