package http

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"strings"
	"time"

	"dsh-api/internal/dispatch"
	"dsh-api/internal/incident"
	"dsh-api/internal/partnerdelivery"
	"dsh-api/internal/platformpolicies"
	"dsh-api/internal/store"

	"github.com/google/uuid"
)

const (
	PartnerDeliveryPermissionRead   = "partner_delivery.read"
	PartnerDeliveryPermissionManage = "partner_delivery.manage"
)

type partnerDeliveryMutationBody struct {
	ExpectedVersion    int      `json:"expectedVersion"`
	CommandID          string   `json:"commandId"`
	CorrelationID      string   `json:"correlationId"`
	Reason             string   `json:"reason"`
	EvidenceReferences []string `json:"evidenceReferences"`
	TicketReference    string   `json:"ticketReference"`
}

type assignPartnerDeliveryBody struct {
	partnerDeliveryMutationBody
	StoreCourierID string `json:"storeCourierId"`
}

type submitPartnerDeliveryProofBody struct {
	partnerDeliveryMutationBody
	ProofMethod    string `json:"proofMethod"`
	ProofReference string `json:"proofReference"`
}

func operationalCorrelationID(r *http.Request, bodyValue string) string {
	if strings.TrimSpace(bodyValue) != "" {
		return bodyValue
	}
	if id := strings.TrimSpace(r.Header.Get("X-Correlation-ID")); id != "" {
		return id
	}
	return uuid.NewString()
}

func partnerDeliveryCorrelationID(r *http.Request, bodyValue string) string {
	return operationalCorrelationID(r, bodyValue)
}

func writePartnerDeliveryError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, partnerdelivery.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "partner delivery task not found")
	case errors.Is(err, partnerdelivery.ErrVersionConflict):
		store.SendError(w, http.StatusConflict, "VERSION_CONFLICT", "partner delivery task version changed; reload before retrying")
	case errors.Is(err, partnerdelivery.ErrIdempotencyConflict):
		store.SendError(w, http.StatusConflict, "IDEMPOTENCY_CONFLICT", "commandId was already used with different partner delivery input")
	case errors.Is(err, partnerdelivery.ErrAlreadyAssigned):
		store.SendError(w, http.StatusConflict, "PARTNER_DELIVERY_ALREADY_ASSIGNED", err.Error())
	case errors.Is(err, partnerdelivery.ErrNotReadyForAssignment):
		store.SendError(w, http.StatusUnprocessableEntity, "PARTNER_DELIVERY_NOT_READY", err.Error())
	case errors.Is(err, partnerdelivery.ErrCourierIneligible):
		store.SendError(w, http.StatusUnprocessableEntity, "COURIER_INELIGIBLE", err.Error())
	case errors.Is(err, partnerdelivery.ErrConflict):
		store.SendError(w, http.StatusUnprocessableEntity, "PARTNER_DELIVERY_INVALID_TRANSITION", err.Error())
	case errors.Is(err, partnerdelivery.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
	case errors.Is(err, incident.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
	case errors.Is(err, incident.ErrConflict):
		store.SendError(w, http.StatusConflict, "INCIDENT_IDEMPOTENCY_CONFLICT", "incident command identity was already used with different details")
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "partner delivery action failed")
	}
}

func marshalPartnerDeliveryTask(ctx context.Context, db *sql.DB, t *partnerdelivery.PartnerDeliveryTask) (map[string]any, error) {
	thresholds, err := partnerdelivery.GetSLAThresholds(ctx, db, t.StoreID)
	if err != nil {
		return nil, err
	}
	sla := partnerdelivery.EvaluateDeliverySLA(t, thresholds, time.Now().UTC())
	return map[string]any{
		"id":                          t.ID,
		"orderId":                     t.OrderID,
		"storeId":                     t.StoreID,
		"branchId":                    t.BranchID,
		"storeCourierId":              t.StoreCourierID,
		"status":                      t.Status,
		"assignedAt":                  t.AssignedAt,
		"pickedUpAt":                  t.PickedUpAt,
		"departedAt":                  t.DepartedAt,
		"arrivedAt":                   t.ArrivedAt,
		"proofMethod":                 t.ProofMethod,
		"proofReference":              t.ProofReference,
		"completedAt":                 t.CompletedAt,
		"exceptionReason":             t.ExceptionReason,
		"exceptionEvidenceReferences": t.ExceptionEvidenceReferences,
		"exceptionReportedAt":         t.ExceptionReportedAt,
		"version":                     t.Version,
		"createdAt":                   t.CreatedAt,
		"updatedAt":                   t.UpdatedAt,
		"slaState":                    sla,
	}, nil
}

func writePartnerDeliveryTask(w http.ResponseWriter, status int, fields map[string]any, task *partnerdelivery.PartnerDeliveryTask, ctx context.Context, db *sql.DB) {
	if fields == nil {
		fields = map[string]any{}
	}
	var payload any
	if task != nil {
		var err error
		payload, err = marshalPartnerDeliveryTask(ctx, db, task)
		if err != nil {
			if platformpolicies.IsOperationalSLAUnavailable(err) {
				store.SendError(w, http.StatusServiceUnavailable, "POLICY_TRUTH_UNAVAILABLE", "partner-delivery SLA policy is unavailable")
			} else {
				store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to read partner-delivery SLA policy")
			}
			return
		}
	}
	fields["task"] = payload
	store.SendJSON(w, status, fields)
}

func (s *protectedStoreServer) handleAssignPartnerDelivery(w http.ResponseWriter, r *http.Request) {
	actor, ownedOrder, ok := s.partnerOrder(w, r)
	if !ok {
		return
	}
	var body assignPartnerDeliveryBody
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if strings.TrimSpace(body.CommandID) == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "commandId is required")
		return
	}
	if strings.TrimSpace(body.StoreCourierID) == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "storeCourierId is required")
		return
	}
	correlationID := partnerDeliveryCorrelationID(r, body.CorrelationID)
	task, err := partnerdelivery.NewService(s.db, s.workforce).AssignCourierCommand(
		r.Context(), actor.OperatorContextID, ownedOrder.ID, body.StoreCourierID, actor.ID, actor.Role, correlationID, body.CommandID,
	)
	if err != nil {
		writePartnerDeliveryError(w, err)
		return
	}
	writePartnerDeliveryTask(w, http.StatusOK, nil, task, r.Context(), s.db)
}

func (s *protectedStoreServer) handlePartnerDeliveryPickup(w http.ResponseWriter, r *http.Request) {
	s.handlePartnerDeliveryTaskTransition(w, r, func(svc *partnerdelivery.Service, operatorContextID, taskID string, version int, actorID, actorRole, correlationID, commandID string) (*partnerdelivery.PartnerDeliveryTask, error) {
		return svc.MarkPickedUpCommand(r.Context(), operatorContextID, taskID, version, actorID, actorRole, correlationID, commandID)
	})
}

func (s *protectedStoreServer) handlePartnerDeliveryDepart(w http.ResponseWriter, r *http.Request) {
	s.handlePartnerDeliveryTaskTransition(w, r, func(svc *partnerdelivery.Service, operatorContextID, taskID string, version int, actorID, actorRole, correlationID, commandID string) (*partnerdelivery.PartnerDeliveryTask, error) {
		return svc.MarkDepartedCommand(r.Context(), operatorContextID, taskID, version, actorID, actorRole, correlationID, commandID)
	})
}

func (s *protectedStoreServer) handlePartnerDeliveryArrive(w http.ResponseWriter, r *http.Request) {
	s.handlePartnerDeliveryTaskTransition(w, r, func(svc *partnerdelivery.Service, operatorContextID, taskID string, version int, actorID, actorRole, correlationID, commandID string) (*partnerdelivery.PartnerDeliveryTask, error) {
		return svc.MarkArrivedCommand(r.Context(), operatorContextID, taskID, version, actorID, actorRole, correlationID, commandID)
	})
}

func (s *protectedStoreServer) handlePartnerDeliveryTaskTransition(
	w http.ResponseWriter,
	r *http.Request,
	call func(svc *partnerdelivery.Service, operatorContextID, taskID string, version int, actorID, actorRole, correlationID, commandID string) (*partnerdelivery.PartnerDeliveryTask, error),
) {
	actor, ownedOrder, ok := s.partnerOrder(w, r)
	if !ok {
		return
	}
	var body partnerDeliveryMutationBody
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if strings.TrimSpace(body.CommandID) == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "commandId is required")
		return
	}
	task, err := partnerdelivery.GetByOrderIDForOperatorContext(s.db, actor.OperatorContextID, ownedOrder.ID)
	if err != nil {
		writePartnerDeliveryError(w, err)
		return
	}
	updated, err := call(
		partnerdelivery.NewService(s.db, s.workforce), actor.OperatorContextID, task.ID, body.ExpectedVersion, actor.ID, actor.Role,
		partnerDeliveryCorrelationID(r, body.CorrelationID), body.CommandID,
	)
	if err != nil {
		writePartnerDeliveryError(w, err)
		return
	}
	writePartnerDeliveryTask(w, http.StatusOK, nil, updated, r.Context(), s.db)
}

func (s *protectedStoreServer) handlePartnerDeliveryProof(w http.ResponseWriter, r *http.Request) {
	actor, ownedOrder, ok := s.partnerOrder(w, r)
	if !ok {
		return
	}
	var body submitPartnerDeliveryProofBody
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if strings.TrimSpace(body.CommandID) == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "commandId is required")
		return
	}
	task, err := partnerdelivery.GetByOrderIDForOperatorContext(s.db, actor.OperatorContextID, ownedOrder.ID)
	if err != nil {
		writePartnerDeliveryError(w, err)
		return
	}
	correlationID := partnerDeliveryCorrelationID(r, body.CorrelationID)
	updated, err := partnerdelivery.NewService(s.db, s.workforce).SubmitProofCommand(
		r.Context(), actor.OperatorContextID, task.ID, body.ExpectedVersion, body.ProofMethod, body.ProofReference,
		actor.ID, actor.Role, correlationID, body.CommandID,
	)
	if err != nil {
		writePartnerDeliveryError(w, err)
		return
	}
	writePartnerDeliveryTask(w, http.StatusOK, nil, updated, r.Context(), s.db)
}

// handlePartnerDeliveryException is a sovereign-intervention entry point:
// raising an exception on a partner_delivery task overrides the partner's
// own execution, so it requires IncidentPermissionOverride and is recorded
// as an operational_incident before the task is actually mutated.
func (s *protectedStoreServer) handlePartnerDeliveryException(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	orderID := strings.TrimSpace(r.PathValue("orderId"))
	var body partnerDeliveryMutationBody
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if strings.TrimSpace(body.CommandID) == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "commandId is required")
		return
	}
	if strings.TrimSpace(body.Reason) == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "reason is required")
		return
	}
	if strings.TrimSpace(body.TicketReference) == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "ticketReference is required")
		return
	}
	task, err := partnerdelivery.GetByOrderIDForOperatorContext(s.db, actor.OperatorContextID, orderID)
	if err != nil {
		writePartnerDeliveryError(w, err)
		return
	}
	correlationID := partnerDeliveryCorrelationID(r, body.CorrelationID)
	reported, err := incident.NewService(s.db).Report(r.Context(), incident.ReportInput{
		OrderID:            orderID,
		OperatorContextID:  actor.OperatorContextID,
		TargetEntityType:   incident.TargetPartnerDeliveryTask,
		TargetEntityID:     task.ID,
		IncidentType:       incident.TypeRaiseException,
		Reason:             body.Reason,
		TicketReference:    body.TicketReference,
		ActorID:            actor.ID,
		ActorRole:          actor.Role,
		CorrelationID:      correlationID,
		ExpectedVersion:    body.ExpectedVersion,
		EvidenceReferences: body.EvidenceReferences,
		CommandID:          body.CommandID,
	})
	if err != nil {
		writePartnerDeliveryError(w, err)
		return
	}
	updated, err := partnerdelivery.GetForOperatorContext(s.db, actor.OperatorContextID, task.ID)
	if err != nil {
		writePartnerDeliveryError(w, err)
		return
	}
	writePartnerDeliveryTask(w, http.StatusOK, map[string]any{"incidentId": reported.ID}, updated, r.Context(), s.db)
}

func (s *protectedStoreServer) handleListOperatorPartnerDeliveries(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	limit, offset := parseLimitOffset(r)
	tasks, err := partnerdelivery.ListForOperatorContext(s.db, actor.OperatorContextID, partnerdelivery.ListFilter{
		StoreID: r.URL.Query().Get("storeId"),
		Status:  r.URL.Query().Get("status"),
		Limit:   limit,
		Offset:  offset,
	})
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list partner delivery tasks")
		return
	}
	results := make([]map[string]any, 0, len(tasks))
	for i := range tasks {
		payload, payloadErr := marshalPartnerDeliveryTask(r.Context(), s.db, &tasks[i])
		if payloadErr != nil {
			if platformpolicies.IsOperationalSLAUnavailable(payloadErr) {
				store.SendError(w, http.StatusServiceUnavailable, "POLICY_TRUTH_UNAVAILABLE", "partner-delivery SLA policy is unavailable")
			} else {
				store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to read partner-delivery SLA policy")
			}
			return
		}
		results = append(results, payload)
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"tasks": results})
}

func (s *protectedStoreServer) handleGetOperatorPartnerDelivery(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	task, err := partnerdelivery.GetForOperatorContext(s.db, actor.OperatorContextID, r.PathValue("taskId"))
	if err != nil {
		writePartnerDeliveryError(w, err)
		return
	}
	writePartnerDeliveryTask(w, http.StatusOK, nil, task, r.Context(), s.db)
}

func (s *protectedStoreServer) handleGetOperatorPartnerDeliveryByOrder(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.ActorFromContext(r.Context())
	if !ok {
		return
	}
	task, err := partnerdelivery.GetByOrderIDForOperatorContext(s.db, actor.OperatorContextID, r.PathValue("orderId"))
	if err != nil {
		writePartnerDeliveryError(w, err)
		return
	}
	writePartnerDeliveryTask(w, http.StatusOK, nil, task, r.Context(), s.db)
}

func (s *protectedStoreServer) handleGetPartnerReturnToStore(w http.ResponseWriter, r *http.Request) {
	actor, order, ok := s.partnerOrder(w, r)
	if !ok {
		return
	}
	item, err := dispatch.GetPartnerReturnToStore(s.db, actor.OperatorContextID, order.ID)
	if err != nil {
		writeDeliveryExceptionError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"exception": marshalDeliveryException(item)})
}

func (s *protectedStoreServer) handleAcceptPartnerReturnToStore(w http.ResponseWriter, r *http.Request) {
	actor, order, ok := s.partnerOrder(w, r)
	if !ok {
		return
	}
	idempotencyKey, correlationID, ok := requireCaptainCommandIdentity(w, r)
	if !ok {
		return
	}
	w.Header().Set("X-Correlation-ID", correlationID)
	item, err := dispatch.AcceptReturnToStoreByPartner(s.db, actor.OperatorContextID, order.ID, actor.ID, idempotencyKey, correlationID)
	if err != nil {
		writeDeliveryExceptionError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"exception": marshalDeliveryException(item)})
}
