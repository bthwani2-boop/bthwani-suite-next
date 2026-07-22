package http

import (
	"errors"
	"net/http"
	"strings"

	"dsh-api/internal/dispatch"
	"dsh-api/internal/partnerdelivery"
	"dsh-api/internal/store"

	"github.com/google/uuid"
)

const (
	PartnerDeliveryPermissionRead   = "partner_delivery.read"
	PartnerDeliveryPermissionManage = "partner_delivery.manage"
)

type partnerDeliveryMutationBody struct {
	ExpectedVersion   int      `json:"expectedVersion"`
	CommandID         string   `json:"commandId"`
	CorrelationID     string   `json:"correlationId"`
	Reason            string   `json:"reason"`
	EvidenceReferences []string `json:"evidenceReferences"`
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
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "partner delivery action failed")
	}
}

func marshalPartnerDeliveryTask(t *partnerdelivery.PartnerDeliveryTask) map[string]any {
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
	}
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
	task, err := partnerdelivery.NewService(s.db).AssignCourierCommand(
		r.Context(), ownedOrder.ID, body.StoreCourierID, actor.ID, actor.Role, correlationID, body.CommandID,
	)
	if err != nil {
		writePartnerDeliveryError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"task": marshalPartnerDeliveryTask(task)})
}

func (s *protectedStoreServer) handlePartnerDeliveryPickup(w http.ResponseWriter, r *http.Request) {
	s.handlePartnerDeliveryTaskTransition(w, r, func(svc *partnerdelivery.Service, taskID string, version int, actorID, actorRole, correlationID, commandID string) (*partnerdelivery.PartnerDeliveryTask, error) {
		return svc.MarkPickedUpCommand(r.Context(), taskID, version, actorID, actorRole, correlationID, commandID)
	})
}

func (s *protectedStoreServer) handlePartnerDeliveryDepart(w http.ResponseWriter, r *http.Request) {
	s.handlePartnerDeliveryTaskTransition(w, r, func(svc *partnerdelivery.Service, taskID string, version int, actorID, actorRole, correlationID, commandID string) (*partnerdelivery.PartnerDeliveryTask, error) {
		return svc.MarkDepartedCommand(r.Context(), taskID, version, actorID, actorRole, correlationID, commandID)
	})
}

func (s *protectedStoreServer) handlePartnerDeliveryArrive(w http.ResponseWriter, r *http.Request) {
	s.handlePartnerDeliveryTaskTransition(w, r, func(svc *partnerdelivery.Service, taskID string, version int, actorID, actorRole, correlationID, commandID string) (*partnerdelivery.PartnerDeliveryTask, error) {
		return svc.MarkArrivedCommand(r.Context(), taskID, version, actorID, actorRole, correlationID, commandID)
	})
}

func (s *protectedStoreServer) handlePartnerDeliveryTaskTransition(
	w http.ResponseWriter,
	r *http.Request,
	call func(svc *partnerdelivery.Service, taskID string, version int, actorID, actorRole, correlationID, commandID string) (*partnerdelivery.PartnerDeliveryTask, error),
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
	task, err := partnerdelivery.GetByOrderID(s.db, ownedOrder.ID)
	if err != nil {
		writePartnerDeliveryError(w, err)
		return
	}
	updated, err := call(
		partnerdelivery.NewService(s.db), task.ID, body.ExpectedVersion, actor.ID, actor.Role,
		partnerDeliveryCorrelationID(r, body.CorrelationID), body.CommandID,
	)
	if err != nil {
		writePartnerDeliveryError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"task": marshalPartnerDeliveryTask(updated)})
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
	task, err := partnerdelivery.GetByOrderID(s.db, ownedOrder.ID)
	if err != nil {
		writePartnerDeliveryError(w, err)
		return
	}
	correlationID := partnerDeliveryCorrelationID(r, body.CorrelationID)
	updated, err := partnerdelivery.NewService(s.db).SubmitProofCommand(
		r.Context(), task.ID, body.ExpectedVersion, body.ProofMethod, body.ProofReference,
		actor.ID, actor.Role, correlationID, body.CommandID,
	)
	if err != nil {
		writePartnerDeliveryError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"task": marshalPartnerDeliveryTask(updated)})
}

func (s *protectedStoreServer) handlePartnerDeliveryException(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", PartnerDeliveryPermissionManage, "operator")
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
	task, err := partnerdelivery.GetByOrderID(s.db, orderID)
	if err != nil {
		writePartnerDeliveryError(w, err)
		return
	}
	correlationID := partnerDeliveryCorrelationID(r, body.CorrelationID)
	updated, err := partnerdelivery.NewService(s.db).RaiseExceptionCommand(
		r.Context(), task.ID, body.ExpectedVersion, body.Reason, body.EvidenceReferences,
		actor.ID, actor.Role, correlationID, body.CommandID,
	)
	if err != nil {
		writePartnerDeliveryError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"task": marshalPartnerDeliveryTask(updated)})
}

func (s *protectedStoreServer) handleListOperatorPartnerDeliveries(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", PartnerDeliveryPermissionRead, "operator")
	if !ok {
		return
	}
	limit, offset := parseLimitOffset(r)
	tasks, err := partnerdelivery.List(s.db, partnerdelivery.ListFilter{
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
		results = append(results, marshalPartnerDeliveryTask(&tasks[i]))
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"tasks": results})
}

func (s *protectedStoreServer) handleGetOperatorPartnerDelivery(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", PartnerDeliveryPermissionRead, "operator")
	if !ok {
		return
	}
	task, err := partnerdelivery.Get(s.db, r.PathValue("taskId"))
	if err != nil {
		writePartnerDeliveryError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"task": marshalPartnerDeliveryTask(task)})
}

func (s *protectedStoreServer) handleGetOperatorPartnerDeliveryByOrder(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", PartnerDeliveryPermissionRead, "operator")
	if !ok {
		return
	}
	task, err := partnerdelivery.GetByOrderID(s.db, r.PathValue("orderId"))
	if err != nil {
		writePartnerDeliveryError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"task": marshalPartnerDeliveryTask(task)})
}

func (s *protectedStoreServer) handleGetPartnerReturnToStore(w http.ResponseWriter, r *http.Request) {
	_, order, ok := s.partnerOrder(w, r)
	if !ok {
		return
	}
	item, err := dispatch.GetPartnerReturnToStore(s.db, order.ID)
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
	item, err := dispatch.AcceptReturnToStoreByPartner(s.db, order.ID, actor.ID)
	if err != nil {
		writeDeliveryExceptionError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"exception": marshalDeliveryException(item)})
}
