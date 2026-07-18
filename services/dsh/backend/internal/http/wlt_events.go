package http

import (
	"encoding/json"
	"errors"
	"net/http"

	"dsh-api/internal/checkout"
	"dsh-api/internal/coupons"
	"dsh-api/internal/specialrequests"
	"dsh-api/internal/store"
)

// POST /dsh/internal/wlt/payment-session-events
//
// Called by WLT — the sole owner of payment authorization/capture truth — to
// report a terminal payment-session outcome for a checkout intent. This is
// what lets non-COD checkout intents (wallet, mixed, official_wallet) leave
// payment_pending; COD does not use this event because WLT never captures
// funds up front for it.
func (s *protectedStoreServer) handleWltPaymentSessionEvent(w http.ResponseWriter, r *http.Request) {
	if !requireWltServiceCaller(w, r) {
		return
	}
	var body struct {
		CheckoutIntentID string `json:"checkoutIntentId"`
		SpecialRequestID string `json:"specialRequestId"`
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
	if body.PaymentSessionID == "" || body.Status == "" || (body.CheckoutIntentID == "" && body.SpecialRequestID == "") || (body.CheckoutIntentID != "" && body.SpecialRequestID != "") {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "exactly one of checkoutIntentId or specialRequestId, plus paymentSessionId and status, are required")
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

	intent, err := checkout.ApplyWltPaymentEvent(s.db, body.CheckoutIntentID, body.PaymentSessionID, body.Status)
	if errors.Is(err, checkout.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "checkout intent not found")
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
	if err := coupons.ApplyPaymentOutcome(s.db, body.CheckoutIntentID, body.Status); err != nil {
		store.SendError(w, http.StatusInternalServerError, "COUPON_RECONCILIATION_FAILED", "payment state changed but coupon reconciliation failed")
		return
	}
	pricing, err := checkout.GetPricing(s.db, intent.ID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load checkout pricing")
		return
	}

	store.SendJSON(w, http.StatusOK, map[string]any{"intent": marshalIntentWithPricing(intent, pricing)})
}

// requireWltServiceCaller enforces that only the WLT service — never an
// end-user actor — may report payment-session outcomes back to DSH.
func requireWltServiceCaller(w http.ResponseWriter, r *http.Request) bool {
	return store.RequireServiceCaller(w, r, "DSH_WLT_SERVICE_TOKEN", "wlt")
}
