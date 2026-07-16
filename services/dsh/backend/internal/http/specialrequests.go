package http

import (
	"errors"
	"net/http"
	"strconv"

	"dsh-api/internal/specialrequests"
	"dsh-api/internal/store"
)

func parseLimitOffset(r *http.Request) (int, int) {
	limit := 50
	offset := 0
	if l := r.URL.Query().Get("limit"); l != "" {
		if v, err := strconv.Atoi(l); err == nil && v > 0 {
			limit = v
		}
	}
	if o := r.URL.Query().Get("offset"); o != "" {
		if v, err := strconv.Atoi(o); err == nil && v >= 0 {
			offset = v
		}
	}
	return limit, offset
}

func marshalSpecialRequest(req *specialrequests.SpecialRequest) map[string]any {
	return map[string]any{
		"id":                       req.ID,
		"clientId":                 req.ClientID,
		"requestType":              req.RequestType,
		"status":                   req.Status,
		"customerNotes":            req.CustomerNotes,
		"currency":                 req.Currency,
		"estimatedAmountReference": req.EstimatedAmountReference,
		"productUrl":               req.ProductUrl,
		"quantity":                 req.Quantity,
		"size":                     req.Size,
		"color":                    req.Color,
		"variantNotes":             req.VariantNotes,
		"deliveryAddressReference": req.DeliveryAddressReference,
		"pickupAddressReference":   req.PickupAddressReference,
		"dropoffAddressReference":  req.DropoffAddressReference,
		"itemType":                 req.ItemType,
		"scheduleMode":             req.ScheduleMode,
		"scheduledAt":              req.ScheduledAt,
		"handlingRequirements":     req.HandlingRequirements,
		"assignedOperatorId":       req.AssignedOperatorID,
		"dispatchAssignmentId":     req.DispatchAssignmentID,
		"rejectionReason":          req.RejectionReason,
		"createdAt":                req.CreatedAt,
		"updatedAt":                req.UpdatedAt,
		"completedAt":              req.CompletedAt,
		"cancelledAt":              req.CancelledAt,
	}
}

// POST /dsh/client/special-requests
func (s *protectedStoreServer) handleCreateSpecialRequest(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	var body specialrequests.CreateInput
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	body.ClientID = actor.ID

	repo := specialrequests.NewPostgresRepository(s.db)
	req, err := repo.Create(r.Context(), body)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create special request")
		return
	}
	store.SendJSON(w, http.StatusOK, marshalSpecialRequest(req))
}

// GET /dsh/client/special-requests
func (s *protectedStoreServer) handleListClientSpecialRequests(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	limit, offset := parseLimitOffset(r)
	repo := specialrequests.NewPostgresRepository(s.db)
	reqs, total, err := repo.ListByClient(r.Context(), actor.ID, limit, offset)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list special requests")
		return
	}
	var results []map[string]any
	for _, req := range reqs {
		results = append(results, marshalSpecialRequest(&req))
	}
	if results == nil {
		results = make([]map[string]any, 0)
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"requests": results,
		"total":    total,
	})
}

// GET /dsh/client/special-requests/{requestId}
func (s *protectedStoreServer) handleGetClientSpecialRequest(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	reqID := r.PathValue("requestId")
	repo := specialrequests.NewPostgresRepository(s.db)
	req, err := repo.Get(r.Context(), reqID)
	if errors.Is(err, specialrequests.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "special request not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get special request")
		return
	}
	if req.ClientID != actor.ID {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "special request not found")
		return
	}
	store.SendJSON(w, http.StatusOK, marshalSpecialRequest(req))
}

// POST /dsh/client/special-requests/{requestId}/cancel
func (s *protectedStoreServer) handleCancelClientSpecialRequest(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	reqID := r.PathValue("requestId")
	repo := specialrequests.NewPostgresRepository(s.db)
	req, err := repo.Get(r.Context(), reqID)
	if err != nil {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "special request not found")
		return
	}
	if req.ClientID != actor.ID {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "special request not found")
		return
	}
	status := specialrequests.StatusCancelled
	updated, err := repo.Update(r.Context(), reqID, specialrequests.UpdateInput{Status: &status})
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to cancel request")
		return
	}
	store.SendJSON(w, http.StatusOK, marshalSpecialRequest(updated))
}

// GET /dsh/operator/special-requests
func (s *protectedStoreServer) handleListOperatorSpecialRequests(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", SupportPermissionRead, "operator")
	if !ok {
		return
	}
	limit, offset := parseLimitOffset(r)
	var reqType *string
	if rt := r.URL.Query().Get("requestType"); rt != "" {
		reqType = &rt
	}
	var status *string
	if st := r.URL.Query().Get("status"); st != "" {
		status = &st
	}
	repo := specialrequests.NewPostgresRepository(s.db)
	reqs, total, err := repo.ListForOperator(r.Context(), reqType, status, limit, offset)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list requests")
		return
	}
	var results []map[string]any
	for _, req := range reqs {
		results = append(results, marshalSpecialRequest(&req))
	}
	if results == nil {
		results = make([]map[string]any, 0)
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"requests": results,
		"total":    total,
	})
}

// GET /dsh/operator/special-requests/{requestId}
func (s *protectedStoreServer) handleGetOperatorSpecialRequest(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", SupportPermissionRead, "operator")
	if !ok {
		return
	}
	reqID := r.PathValue("requestId")
	repo := specialrequests.NewPostgresRepository(s.db)
	req, err := repo.Get(r.Context(), reqID)
	if err != nil {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "special request not found")
		return
	}
	store.SendJSON(w, http.StatusOK, marshalSpecialRequest(req))
}

// PATCH /dsh/operator/special-requests/{requestId}
func (s *protectedStoreServer) handleUpdateOperatorSpecialRequest(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", SupportPermissionManage, "operator")
	if !ok {
		return
	}
	reqID := r.PathValue("requestId")
	var body specialrequests.UpdateInput
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	repo := specialrequests.NewPostgresRepository(s.db)
	updated, err := repo.Update(r.Context(), reqID, body)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to update request")
		return
	}
	store.SendJSON(w, http.StatusOK, marshalSpecialRequest(updated))
}
