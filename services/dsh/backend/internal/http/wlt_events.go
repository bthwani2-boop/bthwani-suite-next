package http

import (
	"encoding/json"
	"errors"
	"net/http"

	"dsh-api/internal/checkout"
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
		PaymentSessionID string `json:"paymentSessionId"`
		Status           string `json:"status"`
	}
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&body); err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "request body is invalid")
		return
	}
	if body.CheckoutIntentID == "" || body.PaymentSessionID == "" || body.Status == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "checkoutIntentId, paymentSessionId, and status are required")
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

	store.SendJSON(w, http.StatusOK, map[string]any{"intent": marshalIntent(intent)})
}

// requireWltServiceCaller enforces that only the WLT service — never an
// end-user actor — may report payment-session outcomes back to DSH.
func requireWltServiceCaller(w http.ResponseWriter, r *http.Request) bool {
	return store.RequireServiceCaller(w, r, "DSH_WLT_SERVICE_TOKEN", "wlt")
}
