package http

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"

	"dsh-api/internal/store"
)

// POST /dsh/internal/wlt/refund-events
// WLT is the refund authority. DSH reverses operational commercial effects only
// after WLT reports a completed refund through the service-authenticated route.
func (s *protectedStoreServer) handleWltRefundEvent(w http.ResponseWriter, r *http.Request) {
	if !requireWltServiceCaller(w, r) {
		return
	}
	var body struct {
		OrderID        string `json:"orderId"`
		RefundReference string `json:"refundReference"`
		Status         string `json:"status"`
		Reason         string `json:"reason"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	body.OrderID = strings.TrimSpace(body.OrderID)
	body.RefundReference = strings.TrimSpace(body.RefundReference)
	body.Status = strings.TrimSpace(body.Status)
	if body.OrderID == "" || body.RefundReference == "" || body.Status != "completed" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "orderId, refundReference and completed status are required")
		return
	}

	var couponReversed, loyaltyQueued bool
	err := s.db.QueryRow(`
		SELECT coupon_reversed,loyalty_reversal_queued
		FROM dsh_apply_confirmed_refund_effects($1::uuid,$2,$3)`,
		body.OrderID, body.RefundReference, strings.TrimSpace(body.Reason),
	).Scan(&couponReversed, &loyaltyQueued)
	if errors.Is(err, sql.ErrNoRows) {
		store.SendError(w, http.StatusNotFound, "ORDER_NOT_FOUND", "order not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusConflict, "REFUND_EFFECT_CONFLICT", err.Error())
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"orderId": body.OrderID,
		"refundReference": body.RefundReference,
		"couponReversed": couponReversed,
		"loyaltyReversalQueued": loyaltyQueued,
	})
}
