package http

import (
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"dsh-api/internal/checkout"
	"dsh-api/internal/coupons"
	"dsh-api/internal/specialrequests"
	"dsh-api/internal/store"
)

// POST /dsh/internal/wlt/payment-session-events
// WLT is the payment and refund authority. Every event is tenant-scoped before
// DSH changes checkout, order, coupon, loyalty, or promotion-funding state.
func (s *protectedStoreServer) handleWltPaymentSessionEvent(w http.ResponseWriter, r *http.Request) {
	if !requireWltServiceCaller(w, r) {
		return
	}
	var body struct {
		EventID          string `json:"eventId"`
		CorrelationID    string `json:"correlationId"`
		CheckoutIntentID string `json:"checkoutIntentId"`
		SpecialRequestID string `json:"specialRequestId"`
		OrderID          string `json:"orderId"`
		RefundReference  string `json:"refundReference"`
		Reason           string `json:"reason"`
		TenantID         string `json:"tenantId"`
		PaymentSessionID string `json:"paymentSessionId"`
		Status           string `json:"status"`
	}
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&body); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
		return
	}
	body.EventID = strings.TrimSpace(body.EventID)
	body.CorrelationID = strings.TrimSpace(body.CorrelationID)
	body.TenantID = strings.TrimSpace(body.TenantID)
	body.CheckoutIntentID = strings.TrimSpace(body.CheckoutIntentID)
	body.SpecialRequestID = strings.TrimSpace(body.SpecialRequestID)
	body.PaymentSessionID = strings.TrimSpace(body.PaymentSessionID)
	body.Status = strings.TrimSpace(body.Status)
	if body.TenantID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "tenantId is required")
		return
	}
	if body.Status == "refunded" {
		handleConfirmedRefundEffect(
			w,
			s,
			body.TenantID,
			strings.TrimSpace(body.OrderID),
			strings.TrimSpace(body.RefundReference),
			strings.TrimSpace(body.Reason),
		)
		return
	}
	if body.PaymentSessionID == "" || body.Status == "" ||
		(body.CheckoutIntentID == "" && body.SpecialRequestID == "") ||
		(body.CheckoutIntentID != "" && body.SpecialRequestID != "") {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "tenantId, exactly one payment source, paymentSessionId and status are required")
		return
	}

	if body.SpecialRequestID != "" {
		req, err := specialrequests.ApplyWltPaymentEvent(s.db, body.TenantID, body.SpecialRequestID, body.PaymentSessionID, body.Status)
		if errors.Is(err, specialrequests.ErrNotFound) {
			store.SendError(w, http.StatusNotFound, "NOT_FOUND", "special request not found")
			return
		}
		if errors.Is(err, specialrequests.ErrPaymentSessionMismatch) {
			store.SendError(w, http.StatusConflict, "PAYMENT_SESSION_MISMATCH", "paymentSessionId does not match special request")
			return
		}
		if errors.Is(err, specialrequests.ErrInvalid) {
			store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if errors.Is(err, specialrequests.ErrConflict) || errors.Is(err, specialrequests.ErrVersionConflict) {
			store.SendError(w, http.StatusConflict, "CONFLICT", err.Error())
			return
		}
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to apply WLT payment event")
			return
		}
		store.SendJSON(w, http.StatusOK, map[string]any{"specialRequest": marshalSpecialRequest(req)})
		return
	}

	// Checkout projection, coupon projection and durable event receipt are one
	// PostgreSQL transaction. No response can expose a partially applied event.
	tx, err := s.db.BeginTx(r.Context(), nil)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to begin WLT event transaction")
		return
	}
	defer tx.Rollback()

	intent, err := checkout.ApplyWltPaymentEventTx(
		r.Context(),
		tx,
		body.TenantID,
		body.CheckoutIntentID,
		body.PaymentSessionID,
		body.Status,
	)
	if errors.Is(err, checkout.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "checkout intent not found in tenant")
		return
	}
	if errors.Is(err, checkout.ErrPaymentSessionMismatch) {
		store.SendError(w, http.StatusConflict, "PAYMENT_SESSION_MISMATCH", "paymentSessionId does not match checkout intent")
		return
	}
	if errors.Is(err, checkout.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	if errors.Is(err, checkout.ErrConflict) {
		store.SendError(w, http.StatusConflict, "CONFLICT", err.Error())
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to apply WLT payment event")
		return
	}

	eventEnvelope := checkout.WltPaymentEventEnvelope{
		EventID:          body.EventID,
		TenantID:         body.TenantID,
		CheckoutIntentID: body.CheckoutIntentID,
		PaymentSessionID: body.PaymentSessionID,
		Status:           body.Status,
		CorrelationID:    body.CorrelationID,
	}
	eventKey, replayed, err := checkout.BeginWltPaymentEventTx(r.Context(), tx, eventEnvelope)
	if errors.Is(err, checkout.ErrWltEventReplayConflict) {
		store.SendError(w, http.StatusConflict, "WLT_EVENT_REPLAY_CONFLICT", "eventId was already used for a different WLT payment event")
		return
	}
	if errors.Is(err, checkout.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to register WLT payment event")
		return
	}
	if err := coupons.ApplyPaymentOutcomeTx(r.Context(), tx, body.CheckoutIntentID, body.Status); err != nil {
		store.SendError(w, http.StatusInternalServerError, "COUPON_RECONCILIATION_FAILED", "WLT event was not applied because coupon reconciliation failed")
		return
	}
	if err := checkout.MarkWltPaymentEventAppliedTx(r.Context(), tx, eventKey, eventEnvelope); err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to finalize WLT payment event receipt")
		return
	}
	if err := tx.Commit(); err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to commit WLT payment event")
		return
	}

	pricing, err := checkout.GetPricing(s.db, intent.ID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load checkout pricing")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"intent":         marshalIntentWithPricing(intent, pricing),
		"eventReference": eventKey,
		"replayed":       replayed,
	})
}

func handleConfirmedRefundEffect(w http.ResponseWriter, s *protectedStoreServer, tenantID, orderID, refundReference, reason string) {
	if tenantID == "" || orderID == "" || refundReference == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "tenantId, orderId and refundReference are required for refunded status")
		return
	}
	var exists bool
	if err := s.db.QueryRow(`SELECT EXISTS(
		SELECT 1 FROM dsh_orders WHERE id=$1::uuid AND tenant_id=$2
	)`, orderID, tenantID).Scan(&exists); err != nil {
		store.SendError(w, http.StatusInternalServerError, "DB_ERROR", "failed to verify refund order tenant")
		return
	}
	if !exists {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "order not found in tenant")
		return
	}

	var couponReversed, loyaltyQueued, fundingQueued bool
	err := s.db.QueryRow(`
		SELECT coupon_reversed,loyalty_reversal_queued,funding_reversal_queued
		FROM dsh_apply_confirmed_refund_effects($1::uuid,$2,$3)`,
		orderID, refundReference, reason,
	).Scan(&couponReversed, &loyaltyQueued, &fundingQueued)
	if errors.Is(err, sql.ErrNoRows) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "refund effect target not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusConflict, "REFUND_EFFECT_CONFLICT", err.Error())
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"orderId":               orderID,
		"refundReference":       refundReference,
		"couponReversed":        couponReversed,
		"loyaltyReversalQueued": loyaltyQueued,
		"fundingReversalQueued": fundingQueued,
	})
}

func requireWltServiceCaller(w http.ResponseWriter, r *http.Request) bool {
	return store.RequireServiceCaller(w, r, "DSH_WLT_SERVICE_TOKEN", "wlt")
}
