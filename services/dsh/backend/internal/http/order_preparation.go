package http

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"dsh-api/internal/orders"
	"dsh-api/internal/store"
)

func (s *protectedStoreServer) handleGetStorePreparationPolicy(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	storeID := strings.TrimSpace(r.PathValue("storeId"))
	canAccess, err := store.ActorCanAccessStore(r.Context(), s.db, actor, storeID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to authorize store preparation policy")
		return
	}
	if !canAccess {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "actor cannot access this store")
		return
	}
	policy, err := orders.GetStorePreparationPolicy(s.db, storeID)
	if errors.Is(err, orders.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "store preparation policy not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load store preparation policy")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"policy": policy})
}

func (s *protectedStoreServer) handleUpdateStorePreparationPolicy(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	storeID := strings.TrimSpace(r.PathValue("storeId"))
	canAccess, err := store.ActorCanAccessStore(r.Context(), s.db, actor, storeID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to authorize store preparation policy")
		return
	}
	if !canAccess {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "actor cannot access this store")
		return
	}
	var body struct {
		ExpectedVersion           int    `json:"expectedVersion"`
		DefaultPreparationMinutes int    `json:"defaultPreparationMinutes"`
		WarningBeforeMinutes      int    `json:"warningBeforeMinutes"`
		Reason                    string `json:"reason"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	if correlationID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "X-Correlation-ID is required")
		return
	}
	policy, err := orders.UpdateStorePreparationPolicy(s.db, orders.UpdateStorePreparationPolicyInput{
		StoreID:                   storeID,
		ActorID:                   actor.ID,
		ExpectedVersion:           body.ExpectedVersion,
		DefaultPreparationMinutes: body.DefaultPreparationMinutes,
		WarningBeforeMinutes:      body.WarningBeforeMinutes,
		Reason:                    body.Reason,
		CorrelationID:             correlationID,
	})
	if errors.Is(err, orders.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid store preparation policy")
		return
	}
	if errors.Is(err, orders.ErrConflict) {
		store.SendError(w, http.StatusConflict, "VERSION_CONFLICT", "store preparation policy version changed")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to update store preparation policy")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"policy": policy})
}

func (s *protectedStoreServer) handleRevisePreparationEstimate(w http.ResponseWriter, r *http.Request) {
	actor, ownedOrder, ok := s.partnerOrder(w, r)
	if !ok {
		return
	}
	var body struct {
		RemainingMinutes int    `json:"remainingMinutes"`
		Reason           string `json:"reason"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	if correlationID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "X-Correlation-ID is required")
		return
	}
	timing, err := orders.RevisePreparationEstimate(s.db, orders.RevisePreparationEstimateInput{
		OrderID:          ownedOrder.ID,
		StoreID:          ownedOrder.StoreID,
		ActorID:          actor.ID,
		RemainingMinutes: body.RemainingMinutes,
		Reason:           body.Reason,
		CorrelationID:    correlationID,
	})
	if errors.Is(err, orders.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "remainingMinutes, reason and correlation id are required")
		return
	}
	if errors.Is(err, orders.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "order not found")
		return
	}
	if errors.Is(err, orders.ErrConflict) {
		store.SendError(w, http.StatusConflict, "CONFLICT", "preparation estimate cannot be revised in current state")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to revise preparation estimate")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"preparation": timing})
}

func (s *protectedStoreServer) handleGetOrderPreparation(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client", "partner", "captain", "operator")
	if !ok {
		return
	}
	orderID := strings.TrimSpace(r.PathValue("orderId"))
	if orderID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "orderId is required")
		return
	}

	switch actor.Role {
	case "client":
		if _, err := orders.GetClientOrder(s.db, orderID, actor.TenantID, actor.ID); errors.Is(err, orders.ErrNotFound) {
			store.SendError(w, http.StatusNotFound, "NOT_FOUND", "order not found")
			return
		} else if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to authorize order")
			return
		}
	case "partner":
		if _, ownedOrder, exists := s.partnerOrder(w, r); !exists || ownedOrder.ID != orderID {
			return
		}
	case "captain":
		allowed, err := captainCanReadOrderPreparation(r.Context(), s.db, orderID, actor.TenantID, actor.ID)
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to authorize captain order")
			return
		}
		if !allowed {
			store.SendError(w, http.StatusNotFound, "NOT_FOUND", "order not found")
			return
		}
	case "operator":
		if _, permitted := s.requirePermission(
			w,
			r,
			"control-panel",
			OperationsPermissionRead,
			"operator",
		); !permitted {
			return
		}
	}

	timing, err := orders.GetPreparationTiming(s.db, orderID, time.Now())
	if errors.Is(err, orders.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "order not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load order preparation timing")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"preparation": timing})
}
