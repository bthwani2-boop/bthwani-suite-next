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

// Permission constants for the partner_delivery domain. No central registry
// exists in this repo -- constants are declared next to their handler file,
// mirroring OperationsPermissionRead/Manage in orders.go.
const (
	PartnerDeliveryPermissionRead   = "partner_delivery.read"
	PartnerDeliveryPermissionManage = "partner_delivery.manage" // operator monitoring/exception actions
)

type partnerDeliveryMutationBody struct {
	ExpectedVersion int    `json:"expectedVersion"`
	CommandID       string `json:"commandId"`
	CorrelationID   string `json:"correlationId"`
	Reason          string `json:"reason"`
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

// operationalCorrelationID mirrors specialRequestCorrelationID's
// header-or-generated behavior: a request-body correlationId wins, then the
// X-Correlation-ID header, then a freshly generated one.
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
		"id":             t.ID,
		"orderId":        t.OrderID,
		"storeId":        t.StoreID,
		"branchId":       t.BranchID,
		"storeCourierId": t.StoreCourierID,
		"status":         t.Status,
		"assignedAt":     t.AssignedAt,
		"pickedUpAt":     t.PickedUpAt,
		"departedAt":     t.DepartedAt,
		"arrivedAt":      t.ArrivedAt,
		"proofMethod":    t.ProofMethod,
		"proofReference": t.ProofReference,
		"completedAt":    t.CompletedAt,
		"version":        t.Version,
		"createdAt":      t.CreatedAt,
		"updatedAt":      t.UpdatedAt,
	}
}

// POST /dsh/partner/orders/{orderId}/partner-delivery/assign
func (s *protectedStoreServer) handleAssignPartnerDelivery(w http.ResponseWriter, r *http.Request) {
	actor, ownedOrder, ok := s.partnerOrder(w, r)
	if !ok {
		return
	}
	var body assignPartnerDeliveryBody
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if body.CommandID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "commandId is required")
		return
	}
	if body.StoreCourierID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "storeCourierId is required")
		return
	}
	svc := partnerdelivery.NewService(s.db)
	task, err := svc.AssignCourier(r.Context(), ownedOrder.ID, body.StoreCourierID, actor.ID, actor.Role, partnerDeliveryCorrelationID(r, body.CorrelationID))
	if err != nil {
		writePartnerDeliveryError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"task": marshalPartnerDeliveryTask(task)})
}

// POST /dsh/partner/orders/{orderId}/partner-delivery/pickup
func (s *protectedStoreServer) handlePartnerDeliveryPickup(w http.ResponseWriter, r *http.Request) {
	s.handlePartnerDeliveryTaskTransition(w, r, func(svc *partnerdelivery.Service, taskID string, version int, actorID, actorRole, correlationID string) (*partnerdelivery.PartnerDeliveryTask, error) {
		return svc.MarkPickedUp(r.Context(), taskID, version, actorID, actorRole, correlationID)
	})
}

// POST /dsh/partner/orders/{orderId}/partner-delivery/depart
func (s *protectedStoreServer) handlePartnerDeliveryDepart(w http.ResponseWriter, r *http.Request) {
	s.handlePartnerDeliveryTaskTransition(w, r, func(svc *partnerdelivery.Service, taskID string, version int, actorID, actorRole, correlationID string) (*partnerdelivery.PartnerDeliveryTask, error) {
		return svc.MarkDeparted(r.Context(), taskID, version, actorID, actorRole, correlationID)
	})
}

// POST /dsh/partner/orders/{orderId}/partner-delivery/arrive
func (s *protectedStoreServer) handlePartnerDeliveryArrive(w http.ResponseWriter, r *http.Request) {
	s.handlePartnerDeliveryTaskTransition(w, r, func(svc *partnerdelivery.Service, taskID string, version int, actorID, actorRole, correlationID string) (*partnerdelivery.PartnerDeliveryTask, error) {
		return svc.MarkArrived(r.Context(), taskID, version, actorID, actorRole, correlationID)
	})
}

// handlePartnerDeliveryTaskTransition is shared plumbing for the
// pickup/depart/arrive partner-side actions: resolve and authorize the order,
// resolve the task by orderId, decode the common mutation body, and delegate.
func (s *protectedStoreServer) handlePartnerDeliveryTaskTransition(w http.ResponseWriter, r *http.Request, call func(svc *partnerdelivery.Service, taskID string, version int, actorID, actorRole, correlationID string) (*partnerdelivery.PartnerDeliveryTask, error)) {
	actor, ownedOrder, ok := s.partnerOrder(w, r)
	if !ok {
		return
	}
	var body partnerDeliveryMutationBody
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if body.CommandID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "commandId is required")
		return
	}
	svc := partnerdelivery.NewService(s.db)
	task, err := partnerdelivery.GetByOrderID(s.db, ownedOrder.ID)
	if err != nil {
		writePartnerDeliveryError(w, err)
		return
	}
	updated, err := call(svc, task.ID, body.ExpectedVersion, actor.ID, actor.Role, partnerDeliveryCorrelationID(r, body.CorrelationID))
	if err != nil {
		writePartnerDeliveryError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"task": marshalPartnerDeliveryTask(updated)})
}

// POST /dsh/partner/orders/{orderId}/partner-delivery/proof
func (s *protectedStoreServer) handlePartnerDeliveryProof(w http.ResponseWriter, r *http.Request) {
	actor, ownedOrder, ok := s.partnerOrder(w, r)
	if !ok {
		return
	}
	var body submitPartnerDeliveryProofBody
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if body.CommandID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "commandId is required")
		return
	}
	task, err := partnerdelivery.GetByOrderID(s.db, ownedOrder.ID)
	if err != nil {
		writePartnerDeliveryError(w, err)
		return
	}
	svc := partnerdelivery.NewService(s.db)
	updated, err := svc.SubmitProof(r.Context(), task.ID, body.ExpectedVersion, body.ProofMethod, body.ProofReference, actor.ID, actor.Role, partnerDeliveryCorrelationID(r, body.CorrelationID))
	if err != nil {
		writePartnerDeliveryError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"task": marshalPartnerDeliveryTask(updated)})
}

// POST /dsh/partner/orders/{orderId}/partner-delivery/exception
func (s *protectedStoreServer) handlePartnerDeliveryException(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", PartnerDeliveryPermissionManage, "operator")
	if !ok {
		return
	}
	orderID := r.PathValue("orderId")
	var body partnerDeliveryMutationBody
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if body.CommandID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "commandId is required")
		return
	}
	if body.Reason == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "reason is required")
		return
	}
	task, err := partnerdelivery.GetByOrderID(s.db, orderID)
	if err != nil {
		writePartnerDeliveryError(w, err)
		return
	}
	svc := partnerdelivery.NewService(s.db)
	updated, err := svc.RaiseException(r.Context(), task.ID, body.ExpectedVersion, body.Reason, actor.ID, actor.Role, partnerDeliveryCorrelationID(r, body.CorrelationID))
	if err != nil {
		writePartnerDeliveryError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"task": marshalPartnerDeliveryTask(updated)})
}

// GET /dsh/operator/partner-deliveries
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

// GET /dsh/operator/partner-deliveries/{taskId}
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

// GET /dsh/operator/partner-deliveries/order/{orderId}
// Lets the LiveOrders operator surface resolve a partner-delivery task's
// current version by orderId (the only key it holds), mirroring
// handleGetOperatorPickup's by-orderId lookup. Required before an operator
// can raise an exception, since that mutation is optimistic-concurrency
// gated on expectedVersion.
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

// GET /dsh/partner/orders/{orderId}/return-to-store
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

// POST /dsh/partner/orders/{orderId}/return-to-store/accept
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
