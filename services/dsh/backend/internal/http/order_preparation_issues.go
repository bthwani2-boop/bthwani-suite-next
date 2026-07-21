package http

import (
	"errors"
	"net/http"
	"strings"

	"dsh-api/internal/orders"
	"dsh-api/internal/store"
)

func (s *protectedStoreServer) authorizePreparationIssueRead(
	w http.ResponseWriter,
	r *http.Request,
) (string, bool) {
	actor, ok := s.requireActor(w, r, "client", "partner", "operator")
	if !ok {
		return "", false
	}
	orderID := strings.TrimSpace(r.PathValue("orderId"))
	if orderID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "orderId is required")
		return "", false
	}
	switch actor.Role {
	case "client":
		if _, err := orders.GetClientOrder(s.db, orderID, actor.TenantID, actor.ID); errors.Is(err, orders.ErrNotFound) {
			store.SendError(w, http.StatusNotFound, "NOT_FOUND", "order not found")
			return "", false
		} else if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to authorize order")
			return "", false
		}
	case "partner":
		if _, ownedOrder, exists := s.partnerOrder(w, r); !exists || ownedOrder.ID != orderID {
			return "", false
		}
	case "operator":
		if _, permitted := s.requirePermission(
			w,
			r,
			"control-panel",
			OperationsPermissionRead,
			"operator",
		); !permitted {
			return "", false
		}
	}
	return orderID, true
}

func (s *protectedStoreServer) handleListPreparationIssues(w http.ResponseWriter, r *http.Request) {
	orderID, ok := s.authorizePreparationIssueRead(w, r)
	if !ok {
		return
	}
	issues, err := orders.ListPreparationIssues(s.db, orderID)
	if errors.Is(err, orders.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "orderId is required")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load preparation issues")
		return
	}
	openCount := 0
	for _, issue := range issues {
		if issue.Status == orders.PreparationIssueOpen {
			openCount++
		}
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"issues":    issues,
		"openCount": openCount,
	})
}

func (s *protectedStoreServer) handleCreatePreparationIssue(w http.ResponseWriter, r *http.Request) {
	actor, ownedOrder, ok := s.partnerOrder(w, r)
	if !ok {
		return
	}
	var body struct {
		OrderItemID            string                      `json:"orderItemId"`
		Kind                   orders.PreparationIssueKind `json:"kind"`
		AffectedQuantity       int                         `json:"affectedQuantity"`
		Note                   string                      `json:"note"`
		ReplacementProductID   string                      `json:"replacementProductId"`
		ReplacementProductName string                      `json:"replacementProductName"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	body.OrderItemID = strings.TrimSpace(body.OrderItemID)
	if body.Kind != orders.PreparationIssueOther && body.OrderItemID == "" {
		store.SendError(
			w,
			http.StatusBadRequest,
			"INVALID_REQUEST",
			"orderItemId is required for item preparation issues",
		)
		return
	}
	correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	if correlationID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "X-Correlation-ID is required")
		return
	}
	issue, err := orders.CreatePreparationIssue(s.db, orders.CreatePreparationIssueInput{
		OrderID:                ownedOrder.ID,
		StoreID:                ownedOrder.StoreID,
		OrderItemID:            body.OrderItemID,
		ActorID:                actor.ID,
		Kind:                   body.Kind,
		AffectedQuantity:       body.AffectedQuantity,
		Note:                   body.Note,
		ReplacementProductID:   body.ReplacementProductID,
		ReplacementProductName: body.ReplacementProductName,
		CorrelationID:          correlationID,
	})
	if errors.Is(err, orders.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	if errors.Is(err, orders.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "order or order item not found")
		return
	}
	if errors.Is(err, orders.ErrConflict) {
		store.SendError(w, http.StatusConflict, "CONFLICT", err.Error())
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to open preparation issue")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"issue": issue})
}

func (s *protectedStoreServer) handleResolvePreparationIssue(w http.ResponseWriter, r *http.Request) {
	actor, ownedOrder, ok := s.partnerOrder(w, r)
	if !ok {
		return
	}
	issueID := strings.TrimSpace(r.PathValue("issueId"))
	if issueID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "issueId is required")
		return
	}
	var body struct {
		ExpectedVersion int    `json:"expectedVersion"`
		ResolutionNote  string `json:"resolutionNote"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	correlationID := strings.TrimSpace(r.Header.Get("X-Correlation-ID"))
	if correlationID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "X-Correlation-ID is required")
		return
	}
	issue, err := orders.ResolvePreparationIssue(s.db, orders.ResolvePreparationIssueInput{
		IssueID:         issueID,
		OrderID:         ownedOrder.ID,
		StoreID:         ownedOrder.StoreID,
		ActorID:         actor.ID,
		ExpectedVersion: body.ExpectedVersion,
		ResolutionNote:  body.ResolutionNote,
		CorrelationID:   correlationID,
	})
	if errors.Is(err, orders.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	if errors.Is(err, orders.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "preparation issue not found")
		return
	}
	if errors.Is(err, orders.ErrConflict) {
		store.SendError(w, http.StatusConflict, "VERSION_CONFLICT", "preparation issue changed or was already resolved")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to resolve preparation issue")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"issue": issue})
}
