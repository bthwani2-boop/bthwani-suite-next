package http

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"dsh-api/internal/pickup"
	"dsh-api/internal/store"
)

const (
	PickupPermissionRead   = "pickup.read"
	PickupPermissionManage = "pickup.manage"
	PickupActionPermission = "pickup.act"
)

type pickupMutationBody struct {
	ExpectedVersion int    `json:"expectedVersion"`
	CommandID       string `json:"commandId"`
	CorrelationID   string `json:"correlationId"`
	Reason          string `json:"reason"`
}

type verifyPickupOtpBody struct {
	pickupMutationBody
	Code string `json:"code"`
}

type issuePickupOtpBody struct {
	pickupMutationBody
	ClientID string `json:"clientId"`
}

type extendPickupWindowBody struct {
	pickupMutationBody
	NewExpiry time.Time `json:"newExpiry"`
}

func writePickupError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, pickup.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "pickup session not found")
	case errors.Is(err, pickup.ErrVersionConflict):
		store.SendError(w, http.StatusConflict, "VERSION_CONFLICT", "pickup session version changed; reload before retrying")
	case errors.Is(err, pickup.ErrCancelled):
		store.SendError(w, http.StatusConflict, "PICKUP_CANCELLED", "pickup session was cancelled with the order")
	case errors.Is(err, pickup.ErrAlreadyUsed):
		store.SendError(w, http.StatusUnprocessableEntity, "PICKUP_CODE_ALREADY_USED", err.Error())
	case errors.Is(err, pickup.ErrExpired):
		store.SendError(w, http.StatusUnprocessableEntity, "PICKUP_CODE_EXPIRED", err.Error())
	case errors.Is(err, pickup.ErrAttemptsExceeded):
		store.SendError(w, http.StatusUnprocessableEntity, "PICKUP_CODE_ATTEMPTS_EXCEEDED", err.Error())
	case errors.Is(err, pickup.ErrInvalidCode):
		store.SendError(w, http.StatusUnprocessableEntity, "PICKUP_CODE_INVALID", err.Error())
	case errors.Is(err, pickup.ErrConflict):
		store.SendError(w, http.StatusUnprocessableEntity, "PICKUP_INVALID_TRANSITION", err.Error())
	case errors.Is(err, pickup.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "pickup action failed")
	}
}

func marshalPickupSession(s *pickup.PickupSession) map[string]any {
	return map[string]any{
		"id":                 s.ID,
		"orderId":            s.OrderID,
		"storeId":            s.StoreID,
		"clientId":           s.ClientID,
		"expiresAt":          s.ExpiresAt,
		"attemptCount":       s.AttemptCount,
		"maxAttempts":        s.MaxAttempts,
		"usedAt":             s.UsedAt,
		"verifiedByActorId":  s.VerifiedByActorID,
		"verificationMethod": s.VerificationMethod,
		"status":             s.Status,
		"cancelledAt":        s.CancelledAt,
		"cancellationReason": s.CancellationReason,
		"version":            s.Version,
		"createdAt":          s.CreatedAt,
		"updatedAt":          s.UpdatedAt,
	}
}

func (s *protectedStoreServer) handleGetPartnerPickupState(w http.ResponseWriter, r *http.Request) {
	_, ownedOrder, ok := s.partnerOrder(w, r)
	if !ok {
		return
	}
	if ownedOrder.FulfillmentMode != "pickup" {
		store.SendError(w, http.StatusUnprocessableEntity, "PICKUP_INVALID_TRANSITION", "order is not a pickup order")
		return
	}

	session, err := pickup.GetByOrderID(s.db, ownedOrder.ID)
	if errors.Is(err, pickup.ErrNotFound) {
		session = nil
		err = nil
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load pickup session")
		return
	}

	stage, err := pickup.ResolvePartnerStage(s.db, ownedOrder.ID, string(ownedOrder.Status), session)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to resolve pickup stage")
		return
	}

	var sessionPayload any
	if session != nil {
		sessionPayload = marshalPickupSession(session)
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"session": sessionPayload,
		"stage":   stage,
	})
}

func (s *protectedStoreServer) handlePickupMarkReady(w http.ResponseWriter, r *http.Request) {
	actor, ownedOrder, ok := s.partnerOrder(w, r)
	if !ok {
		return
	}
	var body pickupMutationBody
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if body.CommandID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "commandId is required")
		return
	}
	svc := pickup.NewService(s.db)
	if err := svc.MarkReady(r.Context(), ownedOrder.ID, actor.ID, actor.Role, operationalCorrelationID(r, body.CorrelationID)); err != nil {
		writePickupError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"orderId": ownedOrder.ID, "status": "ready_for_pickup"})
}

// handlePickupNotify issues a fresh OTP, delivers it through the authenticated
// client notification channel, then records the operational notification marker.
// The partner response never contains the plaintext OTP.
func (s *protectedStoreServer) handlePickupNotify(w http.ResponseWriter, r *http.Request) {
	actor, ownedOrder, ok := s.partnerOrder(w, r)
	if !ok {
		return
	}
	var body issuePickupOtpBody
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if body.CommandID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "commandId is required")
		return
	}
	// The client identity comes from the sovereign order. A body-supplied value
	// may only repeat it; it can never redirect an OTP to another client.
	if body.ClientID != "" && body.ClientID != ownedOrder.ClientID {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "clientId does not match the order")
		return
	}
	correlationID := operationalCorrelationID(r, body.CorrelationID)
	plainOtp, session, issued := s.issuePickupOtpInternal(
		w,
		r,
		ownedOrder.ID,
		ownedOrder.ClientID,
		actor.ID,
		actor.Role,
		correlationID,
	)
	if !issued {
		return
	}
	if err := pickup.DeliverOtpNotification(r.Context(), s.db, session, plainOtp); err != nil {
		store.SendError(w, http.StatusServiceUnavailable, "PICKUP_OTP_DELIVERY_FAILED", "pickup code could not be delivered; retry notification")
		return
	}

	svc := pickup.NewService(s.db)
	if err := svc.NotifyCustomer(r.Context(), ownedOrder.ID, actor.ID, actor.Role, correlationID); err != nil {
		writePickupError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"orderId": ownedOrder.ID, "notified": true, "session": marshalPickupSession(session)})
}

func (s *protectedStoreServer) handlePickupCustomerArrived(w http.ResponseWriter, r *http.Request) {
	actor, ownedOrder, ok := s.partnerOrder(w, r)
	if !ok {
		return
	}
	var body pickupMutationBody
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if body.CommandID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "commandId is required")
		return
	}
	svc := pickup.NewService(s.db)
	if err := svc.CustomerArrived(r.Context(), ownedOrder.ID, actor.ID, actor.Role, operationalCorrelationID(r, body.CorrelationID)); err != nil {
		writePickupError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"orderId": ownedOrder.ID, "customerArrived": true})
}

func (s *protectedStoreServer) issuePickupOtpInternal(w http.ResponseWriter, r *http.Request, orderID, clientID, actorID, actorRole, correlationID string) (string, *pickup.PickupSession, bool) {
	svc := pickup.NewService(s.db)
	plainOtp, session, err := svc.IssueOtp(r.Context(), orderID, clientID, actorID, actorRole, correlationID)
	if err != nil {
		writePickupError(w, err)
		return "", nil, false
	}
	return plainOtp, session, true
}

func (s *protectedStoreServer) handlePickupVerify(w http.ResponseWriter, r *http.Request) {
	actor, ownedOrder, ok := s.partnerOrder(w, r)
	if !ok {
		return
	}
	var body verifyPickupOtpBody
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if body.CommandID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "commandId is required")
		return
	}
	body.Code = strings.TrimSpace(body.Code)
	if body.Code == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "code is required")
		return
	}
	svc := pickup.NewService(s.db)
	session, err := svc.VerifyOtp(r.Context(), ownedOrder.ID, body.Code, actor.ID, actor.Role, operationalCorrelationID(r, body.CorrelationID))
	if err != nil {
		writePickupError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"session": marshalPickupSession(session)})
}

func (s *protectedStoreServer) handlePickupNoShow(w http.ResponseWriter, r *http.Request) {
	actor, ownedOrder, ok := s.partnerOrder(w, r)
	if !ok {
		return
	}
	var body pickupMutationBody
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if body.CommandID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "commandId is required")
		return
	}
	body.Reason = strings.TrimSpace(body.Reason)
	if body.Reason == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "no-show reason is required")
		return
	}
	svc := pickup.NewService(s.db)
	session, err := svc.NoShow(r.Context(), ownedOrder.ID, actor.ID, actor.Role, body.Reason, operationalCorrelationID(r, body.CorrelationID))
	if err != nil {
		writePickupError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"session": marshalPickupSession(session)})
}

func (s *protectedStoreServer) handleListOperatorPickups(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", PickupPermissionRead, "operator")
	if !ok {
		return
	}
	limit, offset := parseLimitOffset(r)
	sessions, err := pickup.List(s.db, pickup.ListFilter{
		StoreID: r.URL.Query().Get("storeId"),
		Status:  pickup.SessionStatus(r.URL.Query().Get("status")),
		Limit:   limit,
		Offset:  offset,
	})
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list pickup sessions")
		return
	}
	results := make([]map[string]any, 0, len(sessions))
	for i := range sessions {
		results = append(results, marshalPickupSession(&sessions[i]))
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"sessions": results})
}

func (s *protectedStoreServer) handleGetOperatorPickup(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", PickupPermissionRead, "operator")
	if !ok {
		return
	}
	session, err := pickup.GetByOrderID(s.db, r.PathValue("orderId"))
	if err != nil {
		writePickupError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"session": marshalPickupSession(session)})
}

func (s *protectedStoreServer) handleExtendPickupWindow(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", PickupPermissionManage, "operator")
	if !ok {
		return
	}
	orderID := r.PathValue("orderId")
	var body extendPickupWindowBody
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if body.CommandID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "commandId is required")
		return
	}
	body.Reason = strings.TrimSpace(body.Reason)
	if body.Reason == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "reason is required")
		return
	}
	if body.NewExpiry.IsZero() {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "newExpiry is required")
		return
	}
	svc := pickup.NewService(s.db)
	session, err := svc.ExtendWindow(r.Context(), orderID, body.NewExpiry, actor.ID, actor.Role, body.Reason, operationalCorrelationID(r, body.CorrelationID))
	if err != nil {
		writePickupError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"session": marshalPickupSession(session)})
}
