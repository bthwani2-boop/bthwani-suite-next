package http

import (
	"errors"
	"net/http"

	"dsh-api/internal/cart"
	"dsh-api/internal/checkout"
	"dsh-api/internal/coupons"
	"dsh-api/internal/store"
	"dsh-api/internal/wlt"
)

// POST /dsh/client/checkout-intents
func (s *protectedStoreServer) handleCreateCheckoutIntent(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	var body struct {
		CartID          string `json:"cartId"`
		StoreID         string `json:"storeId"`
		FulfillmentMode string `json:"fulfillmentMode"`
		PaymentMethod   string `json:"paymentMethod"`
		DeliveryAddress string `json:"deliveryAddress"`
		Note            string `json:"note"`
		CouponCode      string `json:"couponCode"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	if body.CartID == "" || body.StoreID == "" || actor.TenantID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "cartId, storeId and authenticated tenant are required")
		return
	}

	intentID, err := checkout.NewIntentID(s.db)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to allocate checkout intent")
		return
	}
	fulfillmentMode := body.FulfillmentMode
	if fulfillmentMode == "" {
		fulfillmentMode = string(checkout.ModeBthwaniDelivery)
	}

	tx, err := s.db.BeginTx(r.Context(), nil)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to begin checkout")
		return
	}
	defer tx.Rollback()

	snapshot, err := cart.ComputeCheckoutSnapshotForClientTx(r.Context(), tx, body.CartID, actor.ID, body.StoreID)
	if errors.Is(err, cart.ErrCartItemMissingPrice) {
		store.SendError(w, http.StatusConflict, "CART_ITEM_MISSING_PRICE", "one or more cart items are missing a price snapshot")
		return
	}
	if errors.Is(err, cart.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "CART_NOT_FOUND", "active cart does not belong to the authenticated client and store")
		return
	}
	if errors.Is(err, cart.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to compute cart snapshot")
		return
	}

	deliveryPolicy, err := checkout.ResolveDeliveryPricingTx(r.Context(), tx, body.StoreID, fulfillmentMode)
	if errors.Is(err, checkout.ErrDeliveryPricingUnavailable) {
		store.SendError(w, http.StatusConflict, "DELIVERY_PRICING_UNAVAILABLE", "no approved delivery pricing policy exists for this store and fulfillment mode")
		return
	}
	if errors.Is(err, checkout.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_FULFILLMENT_MODE", "fulfillment mode is invalid")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to resolve delivery pricing")
		return
	}
	if deliveryPolicy.Currency != snapshot.Currency {
		store.SendError(w, http.StatusConflict, "PRICING_CURRENCY_MISMATCH", "cart and delivery pricing currencies do not match")
		return
	}

	reservation, err := coupons.ReservePricedTx(r.Context(), tx, coupons.ReservePricedInput{
		Code: body.CouponCode, ClientActorID: actor.ID, CartID: body.CartID,
		CheckoutIntentID: intentID, StoreID: body.StoreID,
		FulfillmentMode:       fulfillmentMode,
		SubtotalMinorUnits:    snapshot.AmountMinorUnits,
		DeliveryFeeMinorUnits: deliveryPolicy.FeeMinorUnits,
		Currency:              snapshot.Currency,
	})
	if errors.Is(err, coupons.ErrUsageLimit) {
		store.SendError(w, http.StatusConflict, "COUPON_USAGE_LIMIT", "coupon usage limit has been reached")
		return
	}
	if errors.Is(err, coupons.ErrNotFound) || errors.Is(err, coupons.ErrInactive) || errors.Is(err, coupons.ErrNotEligible) {
		store.SendError(w, http.StatusUnprocessableEntity, "COUPON_INVALID_OR_INELIGIBLE", "coupon is invalid or not eligible for this checkout")
		return
	}
	if errors.Is(err, coupons.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_COUPON", "coupon code format is invalid")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to reserve coupon")
		return
	}

	pricing := checkout.PricingSnapshot{
		SubtotalMinorUnits:    snapshot.AmountMinorUnits,
		DeliveryFeeMinorUnits: deliveryPolicy.FeeMinorUnits,
		TotalMinorUnits:       snapshot.AmountMinorUnits + deliveryPolicy.FeeMinorUnits,
		Currency:              snapshot.Currency,
	}
	if reservation != nil {
		pricing.DiscountMinorUnits = reservation.DiscountMinorUnits
		pricing.TotalMinorUnits = reservation.TotalMinorUnits
		pricing.CouponID = reservation.CouponID
		pricing.CouponRedemptionID = reservation.ID
		pricing.CouponCodeLast4 = reservation.CouponCodeLast4
	}
	pricing.SnapshotHash = checkout.BuildPricingSnapshotHash(
		snapshot.SnapshotHash, pricing.CouponID, pricing.SubtotalMinorUnits,
		pricing.DeliveryFeeMinorUnits, pricing.DiscountMinorUnits, pricing.TotalMinorUnits,
	)

	intent, err := checkout.CreatePricedIntentTx(r.Context(), tx, checkout.CreateIntentInput{
		ID: intentID, TenantID: actor.TenantID, ClientID: actor.ID, CartID: body.CartID, StoreID: body.StoreID,
		FulfillmentMode: checkout.FulfillmentMode(fulfillmentMode),
		PaymentMethod:   checkout.PaymentMethod(body.PaymentMethod),
		DeliveryAddress: body.DeliveryAddress, Note: body.Note,
	}, pricing)
	if errors.Is(err, checkout.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create checkout intent")
		return
	}
	if err := tx.Commit(); err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to commit checkout intent")
		return
	}

	correlationID := fundingCorrelation(r.Header.Get("X-Correlation-ID"), intent.ID)
	var fundingProjection *coupons.FundingProjection
	if reservation != nil {
		fundingProjection, err = s.reserveCouponFunding(r.Context(), actor.TenantID, intent.ID, correlationID)
		if err != nil {
			_ = coupons.ReleaseByIntent(s.db, intent.ID, "wlt_funding_reserve_failed")
			failedIntent, markErr := checkout.MarkWltHandoffFailed(s.db, intent.ID, actor.TenantID, actor.ID)
			if markErr == nil {
				store.SendJSON(w, http.StatusServiceUnavailable, map[string]any{
					"intent": marshalIntentWithPricing(failedIntent, pricing),
					"error": map[string]any{
						"code":    "WLT_PROMOTION_FUNDING_UNAVAILABLE",
						"message": "promotion funding reservation is unavailable",
					},
				})
				return
			}
			store.SendError(w, http.StatusServiceUnavailable, "WLT_PROMOTION_FUNDING_UNAVAILABLE", "promotion funding reservation is unavailable")
			return
		}
	}

	paymentSession, err := s.wlt.CreatePaymentSession(r.Context(), wlt.CreatePaymentSessionInput{
		CheckoutIntentID: intent.ID, TenantID: actor.TenantID, ClientID: actor.ID,
		StoreID: intent.StoreID, PaymentMethod: string(intent.PaymentMethod),
		AmountMinorUnits: pricing.TotalMinorUnits, Currency: pricing.Currency,
		CartSnapshotHash: pricing.SnapshotHash,
		CorrelationID:    correlationID,
		IdempotencyKey:   "dsh-checkout-intent:" + intent.ID,
	})
	if err != nil {
		fundingReleaseFailed := false
		if fundingProjection != nil {
			if releaseErr := s.releaseCouponFunding(r.Context(), actor.TenantID, intent.ID, "payment_session_handoff_failed", correlationID); releaseErr != nil {
				fundingReleaseFailed = true
				_ = coupons.MarkFundingFailed(r.Context(), s.db, fundingProjection.RedemptionID, "wlt_release_after_payment_handoff_failed")
			}
		}
		_ = coupons.ReleaseByIntent(s.db, intent.ID, "wlt_handoff_failed")
		if failedIntent, markErr := checkout.MarkWltHandoffFailed(s.db, intent.ID, actor.TenantID, actor.ID); markErr == nil {
			code := "WLT_HANDOFF_UNAVAILABLE"
			message := "WLT payment-session handoff is unavailable"
			if fundingReleaseFailed {
				code = "WLT_HANDOFF_AND_FUNDING_COMPENSATION_FAILED"
				message = "payment handoff failed and promotion funding compensation requires reconciliation"
			}
			store.SendJSON(w, http.StatusServiceUnavailable, map[string]any{
				"intent": marshalIntentWithPricing(failedIntent, pricing),
				"error":  map[string]any{"code": code, "message": message},
			})
			return
		}
		store.SendError(w, http.StatusServiceUnavailable, "WLT_HANDOFF_UNAVAILABLE", "WLT payment-session handoff is unavailable")
		return
	}

	intent, err = checkout.AttachWltPaymentSession(s.db, intent.ID, actor.TenantID, actor.ID, paymentSession.ID)
	if err != nil {
		_ = s.wlt.ExpireSession(r.Context(), paymentSession.ID, correlationID)
		if fundingProjection != nil {
			if releaseErr := s.releaseCouponFunding(r.Context(), actor.TenantID, intent.ID, "payment_session_attach_failed", correlationID); releaseErr != nil {
				_ = coupons.MarkFundingFailed(r.Context(), s.db, fundingProjection.RedemptionID, "wlt_release_after_attach_failed")
			}
		}
		_ = coupons.ReleaseByIntent(s.db, intent.ID, "payment_session_attach_failed")
		_, _ = checkout.MarkWltHandoffFailed(s.db, intent.ID, actor.TenantID, actor.ID)
		if errors.Is(err, checkout.ErrInvalid) {
			store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if errors.Is(err, checkout.ErrConflict) {
			store.SendError(w, http.StatusConflict, "CONFLICT", "checkout intent is not ready for WLT handoff")
			return
		}
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to attach WLT payment session")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"intent": marshalIntentWithPricing(intent, pricing)})
}

func (s *protectedStoreServer) handleGetCheckoutIntent(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	intentID := r.PathValue("intentId")
	if intentID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "intentId is required")
		return
	}
	intent, err := checkout.GetIntent(s.db, intentID, actor.TenantID, actor.ID)
	if errors.Is(err, checkout.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "checkout intent not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get checkout intent")
		return
	}
	pricing, err := checkout.GetPricing(s.db, intent.ID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get checkout pricing")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"intent": marshalIntentWithPricing(intent, pricing)})
}

func (s *protectedStoreServer) handleCancelCheckoutIntent(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	intentID := r.PathValue("intentId")
	if intentID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "intentId is required")
		return
	}
	intent, err := checkout.CancelIntent(s.db, intentID, actor.TenantID, actor.ID)
	if errors.Is(err, checkout.ErrConflict) {
		store.SendError(w, http.StatusConflict, "CONFLICT", "intent not found or already closed")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to cancel checkout intent")
		return
	}
	correlationID := fundingCorrelation(r.Header.Get("X-Correlation-ID"), intent.ID)
	if err := s.releaseCouponFunding(r.Context(), actor.TenantID, intent.ID, "client_cancelled", correlationID); err != nil {
		store.SendError(w, http.StatusServiceUnavailable, "WLT_PROMOTION_FUNDING_RELEASE_FAILED", "checkout was cancelled but promotion funding release requires reconciliation")
		return
	}
	if err := coupons.ReleaseByIntent(s.db, intent.ID, "client_cancelled"); err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "checkout cancelled but coupon release failed")
		return
	}
	pricing, err := checkout.GetPricing(s.db, intent.ID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get checkout pricing")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"intent": marshalIntentWithPricing(intent, pricing)})
}

func (s *protectedStoreServer) handleOperatorCheckoutIntents(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionRead, "operator"); !ok {
		return
	}
	intents, err := checkout.ListOperatorIntents(s.db, r.URL.Query().Get("state"), 50)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list checkout intents")
		return
	}
	out := make([]map[string]any, 0, len(intents))
	for i := range intents {
		pricing, pricingErr := checkout.GetPricing(s.db, intents[i].ID)
		if pricingErr != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load checkout pricing")
			return
		}
		out = append(out, marshalIntentWithPricing(&intents[i], pricing))
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"intents": out})
}

func marshalIntent(i *checkout.Intent) map[string]any {
	return map[string]any{
		"id": i.ID, "tenantId": i.TenantID, "clientId": i.ClientID, "cartId": i.CartID, "storeId": i.StoreID,
		"fulfillmentMode": string(i.FulfillmentMode), "state": string(i.State),
		"paymentMethod": string(i.PaymentMethod), "wltPaymentSessionId": i.WltPaymentSessionID,
		"deliveryAddress": i.DeliveryAddress, "note": i.Note, "version": i.Version,
		"createdAt": i.CreatedAt, "updatedAt": i.UpdatedAt,
	}
}

func marshalIntentWithPricing(i *checkout.Intent, pricing checkout.PricingSnapshot) map[string]any {
	result := marshalIntent(i)
	result["subtotalMinorUnits"] = pricing.SubtotalMinorUnits
	result["deliveryFeeMinorUnits"] = pricing.DeliveryFeeMinorUnits
	result["discountMinorUnits"] = pricing.DiscountMinorUnits
	result["totalMinorUnits"] = pricing.TotalMinorUnits
	result["currency"] = pricing.Currency
	result["pricingSnapshotHash"] = pricing.SnapshotHash
	result["couponId"] = pricing.CouponID
	result["couponRedemptionId"] = pricing.CouponRedemptionID
	result["couponCodeLast4"] = pricing.CouponCodeLast4
	return result
}
