package incident

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
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
func (s *Service) Report(ctx context.Context, input ReportInput) (*Incident, error) {
	input.Reason = strings.TrimSpace(input.Reason)
	if input.Reason == "" {
		return nil, fmt.Errorf("%w: reason is required", ErrInvalid)
	}
	input.TicketReference = strings.TrimSpace(input.TicketReference)
	if input.TicketReference == "" {
		return nil, fmt.Errorf("%w: ticketReference is required", ErrInvalid)
	}
	input.OrderID = strings.TrimSpace(input.OrderID)
	input.TargetEntityID = strings.TrimSpace(input.TargetEntityID)
	input.ActorID = strings.TrimSpace(input.ActorID)
	input.ActorRole = strings.TrimSpace(input.ActorRole)
	input.CorrelationID = strings.TrimSpace(input.CorrelationID)
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

	before, err := s.snapshotState(input.TargetEntityType, input.TargetEntityID)
	if err != nil {
		return nil, err
	}

	var id string
	err = s.db.QueryRowContext(ctx, `
		INSERT INTO dsh_operational_incidents
			(order_id, target_entity_type, target_entity_id, incident_type, status,
			 reason, ticket_reference, actor_id, actor_role, before_state, correlation_id)
		VALUES ($1::uuid, $2, $3, $4, 'open', $5, $6, $7, $8, $9::jsonb, $10)
		ON CONFLICT DO NOTHING
		RETURNING id`,
		input.OrderID, string(input.TargetEntityType), input.TargetEntityID, string(input.IncidentType),
		input.Reason, input.TicketReference, input.ActorID, input.ActorRole, nullableJSON(before), nullableString(input.CorrelationID),
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
	return scanIncident(s.db.QueryRowContext(ctx, `
		SELECT `+incidentColumns+`
		FROM dsh_operational_incidents
		WHERE order_id=$1::uuid AND actor_id=$2 AND correlation_id=$3`,
		input.OrderID, input.ActorID, input.CorrelationID).Scan)
}

func sameIncidentCommand(existing *Incident, input ReportInput) bool {
	return existing != nil && existing.OrderID == input.OrderID &&
		existing.TargetEntityType == input.TargetEntityType &&
		existing.TargetEntityID == input.TargetEntityID &&
		existing.IncidentType == input.IncidentType &&
		existing.Reason == input.Reason &&
		existing.TicketReference == input.TicketReference &&
		existing.ActorID == input.ActorID &&
		existing.ActorRole == input.ActorRole &&
		existing.CorrelationID != nil && *existing.CorrelationID == input.CorrelationID
}

func (s *Service) replayCommand(ctx context.Context, existing *Incident, input ReportInput) (*Incident, error) {
	if !sameIncidentCommand(existing, input) {
		return nil, ErrConflict
	}
	if existing.Status == StatusApplied {
		return existing, nil
	}
	return s.apply(ctx, existing.ID, input)
}

func (s *Service) snapshotState(entityType TargetEntityType, entityID string) ([]byte, error) {
	switch entityType {
	case TargetPartnerDeliveryTask:
		task, err := partnerdelivery.Get(s.db, entityID)
		if err != nil {
			return nil, err
		}
		return json.Marshal(task)
	case TargetOrder:
		order, err := orders.GetOrder(s.db, entityID)
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
			WHERE id = $1`, incidentID, applyErr.Error()); err != nil {
			return nil, err
		}
		return nil, applyErr
	}
	if _, err := s.db.ExecContext(ctx, `
		UPDATE dsh_operational_incidents
		SET status = 'applied', after_state = $2::jsonb, applied_at = NOW(), updated_at = NOW()
		WHERE id = $1`, incidentID, nullableJSON(after)); err != nil {
		return nil, err
	}
	return Get(s.db, incidentID)
}

func (s *Service) dispatch(ctx context.Context, input ReportInput) ([]byte, error) {
	switch input.IncidentType {
	case TypeRaiseException:
		if input.TargetEntityType != TargetPartnerDeliveryTask {
			return nil, fmt.Errorf("%w: raise_exception targets a partner_delivery_task", ErrInvalid)
		}
		task, err := partnerdelivery.NewService(s.db, nil).RaiseExceptionCommand(
			ctx, input.TargetEntityID, input.ExpectedVersion, input.Reason, input.EvidenceReferences,
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
