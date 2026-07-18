package http

import (
	"errors"
	"net/http"
	"strings"

	"dsh-api/internal/checkout"
	"dsh-api/internal/store"
)

func writeDeliveryPricingError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, checkout.ErrDeliveryPricingNotFound):
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "delivery pricing policy not found")
	case errors.Is(err, checkout.ErrDeliveryPricingVersionConflict):
		store.SendError(w, http.StatusConflict, "VERSION_CONFLICT", "delivery pricing changed; reload before retrying")
	case errors.Is(err, checkout.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "delivery pricing input is invalid")
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "delivery pricing action failed")
	}
}

func decodeDeliveryPricingMutation(w http.ResponseWriter, r *http.Request) (struct {
	FeeMinorUnits  int64  `json:"feeMinorUnits"`
	Currency       string `json:"currency"`
	Status         string `json:"status"`
	ExpectedVersion int   `json:"expectedVersion"`
	Reason          string `json:"reason"`
}, bool) {
	var body struct {
		FeeMinorUnits  int64  `json:"feeMinorUnits"`
		Currency       string `json:"currency"`
		Status         string `json:"status"`
		ExpectedVersion int   `json:"expectedVersion"`
		Reason          string `json:"reason"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return body, false
	}
	body.Reason = strings.TrimSpace(body.Reason)
	if body.Reason == "" {
		store.SendError(w, http.StatusBadRequest, "REASON_REQUIRED", "a reason is required for delivery pricing changes")
		return body, false
	}
	return body, true
}

// GET /dsh/operator/stores/{storeId}/delivery-pricing
func (s *protectedStoreServer) handleOperatorListDeliveryPricing(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", "operations.read", "operator"); !ok {
		return
	}
	items, err := checkout.ListDeliveryPricing(s.db, r.PathValue("storeId"))
	if err != nil {
		writeDeliveryPricingError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"pricing": items})
}

// PUT /dsh/operator/stores/{storeId}/delivery-pricing/{fulfillmentMode}
func (s *protectedStoreServer) handleOperatorUpsertDeliveryPricing(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", "operations.manage", "operator")
	if !ok {
		return
	}
	body, ok := decodeDeliveryPricingMutation(w, r)
	if !ok {
		return
	}
	record, err := checkout.UpsertDeliveryPricing(r.Context(), s.db, r.PathValue("storeId"), r.PathValue("fulfillmentMode"), checkout.UpsertDeliveryPricingInput{
		FeeMinorUnits: body.FeeMinorUnits,
		Currency: body.Currency,
		Status: body.Status,
		PricingSource: "control_panel",
		ExpectedVersion: body.ExpectedVersion,
		ActorID: actor.ID,
		ActorSurface: "control-panel",
		Reason: body.Reason,
		CorrelationID: r.Header.Get("X-Correlation-ID"),
	})
	if err != nil {
		writeDeliveryPricingError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"pricing": record})
}

// GET /dsh/partner/stores/{storeId}/delivery-pricing
func (s *protectedStoreServer) handlePartnerListDeliveryPricing(w http.ResponseWriter, r *http.Request) {
	_, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	if r.PathValue("storeId") != storeID {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "store not found")
		return
	}
	items, err := checkout.ListDeliveryPricing(s.db, storeID)
	if err != nil {
		writeDeliveryPricingError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"pricing": items})
}

// PUT /dsh/partner/stores/{storeId}/delivery-pricing/partner_delivery
func (s *protectedStoreServer) handlePartnerUpsertDeliveryPricing(w http.ResponseWriter, r *http.Request) {
	actor, storeID, ok := s.partnerStore(w, r)
	if !ok {
		return
	}
	if r.PathValue("storeId") != storeID || r.PathValue("fulfillmentMode") != "partner_delivery" {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "store delivery pricing policy not found")
		return
	}
	body, ok := decodeDeliveryPricingMutation(w, r)
	if !ok {
		return
	}
	if body.Status == "archived" {
		store.SendError(w, http.StatusForbidden, "FORBIDDEN", "partner cannot archive the store delivery pricing policy")
		return
	}
	record, err := checkout.UpsertDeliveryPricing(r.Context(), s.db, storeID, "partner_delivery", checkout.UpsertDeliveryPricingInput{
		FeeMinorUnits: body.FeeMinorUnits,
		Currency: body.Currency,
		Status: body.Status,
		PricingSource: "partner_store",
		ExpectedVersion: body.ExpectedVersion,
		ActorID: actor.ID,
		ActorSurface: "app-partner",
		Reason: body.Reason,
		CorrelationID: r.Header.Get("X-Correlation-ID"),
	})
	if err != nil {
		writeDeliveryPricingError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"pricing": record})
}
