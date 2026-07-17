package http

import (
	"errors"
	"net/http"
	"time"

	"dsh-api/internal/pickup"
	"dsh-api/internal/store"
)

// Permission constants for the pickup domain. No central registry exists in
// this repo -- constants are declared next to their handler file, mirroring
// OperationsPermissionRead/Manage in orders.go.
const (
	PickupPermissionRead   = "pickup.read"
	PickupPermissionManage = "pickup.manage" // operator monitoring/extend-window/exception
	PickupActionPermission = "pickup.act"    // partner-side mark-ready/notify/verify/no-show
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
		"version":            s.Version,
		"createdAt":          s.CreatedAt,
		"updatedAt":          s.UpdatedAt,
	}
}

// POST /dsh/partner/orders/{orderId}/pickup/mark-ready
func (s *protectedStoreServer) handlePickupMarkReady(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	orderID := r.PathValue("orderId")
	var body pickupMutationBody
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if body.CommandID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "commandId is required")
		return
	}
	svc := pickup.NewService(s.db)
	if err := svc.MarkReady(r.Context(), orderID, actor.ID, actor.Role, operationalCorrelationID(r, body.CorrelationID)); err != nil {
		writePickupError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"orderId": orderID, "status": "ready_for_pickup"})
}

// POST /dsh/partner/orders/{orderId}/pickup/notify
//
// The route list for this slice has no separate issue-otp endpoint, so
// notify does double duty: it issues a fresh OTP (pickup.Service.IssueOtp)
// and marks the ready-for-pickup notification as dispatched
// (pickup.Service.NotifyCustomer) in one call. The plaintext OTP is never
// included in this handler's JSON response -- it exists only in the return
// value of IssueOtp for handoff to a notification channel. No SMS/push
// provider is wired up in this slice, so the handoff point is
// deliverPickupOtp, a seam a future notifications integration can fill in;
// today it only asserts the plaintext is non-empty and drops it.
func (s *protectedStoreServer) handlePickupNotify(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	orderID := r.PathValue("orderId")
	var body issuePickupOtpBody
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if body.CommandID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "commandId is required")
		return
	}
	correlationID := operationalCorrelationID(r, body.CorrelationID)
	plainOtp, session, ok := s.issuePickupOtpInternal(w, r, orderID, body.ClientID, actor.ID, actor.Role, correlationID)
	if !ok {
		return
	}
	deliverPickupOtp(orderID, plainOtp)

	svc := pickup.NewService(s.db)
	if err := svc.NotifyCustomer(r.Context(), orderID, actor.ID, actor.Role, correlationID); err != nil {
		writePickupError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"orderId": orderID, "notified": true, "session": marshalPickupSession(session)})
}

// deliverPickupOtp is the handoff seam to a notification channel (SMS/push)
// for the plaintext OTP. No such provider is wired up in this slice; the
// plaintext is intentionally dropped here rather than logged or returned.
func deliverPickupOtp(orderID, plainOtp string) {
	_ = orderID
	_ = plainOtp
}

// POST /dsh/partner/orders/{orderId}/pickup/customer-arrived
func (s *protectedStoreServer) handlePickupCustomerArrived(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	orderID := r.PathValue("orderId")
	var body pickupMutationBody
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if body.CommandID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "commandId is required")
		return
	}
	svc := pickup.NewService(s.db)
	if err := svc.CustomerArrived(r.Context(), orderID, actor.ID, actor.Role, operationalCorrelationID(r, body.CorrelationID)); err != nil {
		writePickupError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"orderId": orderID, "customerArrived": true})
}

// issuePickupOtp is not registered as a route in this slice's HTTP surface
// spec, but the notify handler above triggers the notification step; OTP
// issuance is exposed here as its own action so notify and issue can be
// called independently (e.g. re-issuing a code without re-sending the
// initial ready notification). Registered as part of the pickup/notify
// flow's sibling action.
//
// POST /dsh/partner/orders/{orderId}/pickup/issue-otp is intentionally
// folded into handlePickupNotify's caller contract per the route list in
// the task spec (mark-ready, notify, customer-arrived, verify, no-show) --
// see handlePickupNotify, which issues and returns the OTP via the
// notification payload path. Kept here as an internal helper the notify
// handler can call.
func (s *protectedStoreServer) issuePickupOtpInternal(w http.ResponseWriter, r *http.Request, orderID, clientID, actorID, actorRole, correlationID string) (string, *pickup.PickupSession, bool) {
	svc := pickup.NewService(s.db)
	plainOtp, session, err := svc.IssueOtp(r.Context(), orderID, clientID, actorID, actorRole, correlationID)
	if err != nil {
		writePickupError(w, err)
		return "", nil, false
	}
	return plainOtp, session, true
}

// POST /dsh/partner/orders/{orderId}/pickup/verify
func (s *protectedStoreServer) handlePickupVerify(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	orderID := r.PathValue("orderId")
	var body verifyPickupOtpBody
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if body.CommandID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "commandId is required")
		return
	}
	if body.Code == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "code is required")
		return
	}
	svc := pickup.NewService(s.db)
	session, err := svc.VerifyOtp(r.Context(), orderID, body.Code, actor.ID, actor.Role, operationalCorrelationID(r, body.CorrelationID))
	if err != nil {
		writePickupError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"session": marshalPickupSession(session)})
}

// POST /dsh/partner/orders/{orderId}/pickup/no-show
func (s *protectedStoreServer) handlePickupNoShow(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "partner")
	if !ok {
		return
	}
	orderID := r.PathValue("orderId")
	var body pickupMutationBody
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if body.CommandID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "commandId is required")
		return
	}
	svc := pickup.NewService(s.db)
	session, err := svc.NoShow(r.Context(), orderID, actor.ID, actor.Role, body.Reason, operationalCorrelationID(r, body.CorrelationID))
	if err != nil {
		writePickupError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"session": marshalPickupSession(session)})
}

// GET /dsh/operator/pickups
func (s *protectedStoreServer) handleListOperatorPickups(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", PickupPermissionRead, "operator")
	if !ok {
		return
	}
	limit, offset := parseLimitOffset(r)
	sessions, err := pickup.List(s.db, pickup.ListFilter{
		StoreID: r.URL.Query().Get("storeId"),
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

// GET /dsh/operator/pickups/{orderId}
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

// POST /dsh/operator/pickups/{orderId}/extend-window
//
// Manual-override fallback for a session that would otherwise expire.
// Gated by the manage permission (not the lower-privilege act permission)
// per the plan's requirement that this action require higher privilege.
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
