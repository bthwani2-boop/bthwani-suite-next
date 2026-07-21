package http

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"net/http"
	"strings"

	"dsh-api/internal/cart"
	"dsh-api/internal/checkout"
	"dsh-api/internal/clientaddress"
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
		CartID            string `json:"cartId"`
		StoreID           string `json:"storeId"`
		FulfillmentMode   string `json:"fulfillmentMode"`
		PaymentMethod     string `json:"paymentMethod"`
		DeliveryAddressID string `json:"deliveryAddressId"`
		Note              string `json:"note"`
		CouponCode        string `json:"couponCode"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}

	cartID := strings.TrimSpace(body.CartID)
	storeID := strings.TrimSpace(body.StoreID)
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if cartID == "" || storeID == "" || actor.TenantID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "cartId, storeId and authenticated tenant are required")
		return
	}
	if len(idempotencyKey) < 16 || len(idempotencyKey) > 200 {
		store.SendError(w, http.StatusBadRequest, "IDEMPOTENCY_KEY_REQUIRED", "Idempotency-Key must contain between 16 and 200 characters")
		return
	}

	fulfillmentMode := strings.TrimSpace(body.FulfillmentMode)
	if fulfillmentMode == "" {
		fulfillmentMode = string(checkout.ModeBthwaniDelivery)
	}
	if fulfillmentMode != string(checkout.ModeBthwaniDelivery) &&
		fulfillmentMode != string(checkout.ModePartnerDelivery) &&
		fulfillmentMode != string(checkout.ModePickup) {
		store.SendError(w, http.StatusBadRequest, "INVALID_FULFILLMENT_MODE", "fulfillment mode is invalid")
		return
	}

	paymentMethod := strings.TrimSpace(body.PaymentMethod)
	if paymentMethod == "" {
		paymentMethod = string(checkout.MethodCOD)
	}
	if paymentMethod != string(checkout.MethodCOD) &&
		paymentMethod != string(checkout.MethodWallet) &&
		paymentMethod != string(checkout.MethodMixed) &&
		paymentMethod != string(checkout.MethodOfficialWallet) {
		store.SendError(w, http.StatusBadRequest, "INVALID_PAYMENT_METHOD", "payment method is invalid")
		return
	}

	deliveryAddressID := ""
	deliveryAddressSnapshot := ""
	if fulfillmentMode != string(checkout.ModePickup) {
		deliveryAddressID = strings.TrimSpace(body.DeliveryAddressID)
		if deliveryAddressID == "" {
			store.SendError(w, http.StatusBadRequest, "DELIVERY_ADDRESS_REQUIRED", "deliveryAddressId is required for delivery checkout")
			return
		}
		address, err := clientaddress.GetOwned(r.Context(), s.db, actor.ID, deliveryAddressID)
		if errors.Is(err, clientaddress.ErrNotFound) {
			store.SendError(w, http.StatusNotFound, "ADDRESS_NOT_FOUND", "delivery address is not owned by the authenticated client")
			return
		}
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to resolve delivery address")
			return
		}
		serviceability := cart.CheckServiceability(
			r.Context(), s.db, storeID, address.ServiceAreaCode, address.Latitude, address.Longitude,
		)
		if !serviceability.Serviceable {
			store.SendError(w, http.StatusUnprocessableEntity, "OUT_OF_AREA", serviceability.Reason)
			return
		}
		deliveryAddressSnapshot = address.CheckoutSnapshot()
	}

	note := strings.TrimSpace(body.Note)
	couponCode := strings.TrimSpace(body.CouponCode)
	requestFingerprint := checkoutCreateFingerprint(
		cartID,
		storeID,
		fulfillmentMode,
		paymentMethod,
		deliveryAddressID,
		note,
		strings.ToUpper(couponCode),
	)

	tx, err := s.db.BeginTx(r.Context(), nil)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to begin checkout")
		return
	}
	defer tx.Rollback()

	if err := checkout.LockCreateIdempotencyTx(r.Context(), tx, actor.TenantID, actor.ID, idempotencyKey); err != nil {
		if errors.Is(err, checkout.ErrInvalid) {
			store.SendError(w, http.StatusBadRequest, "INVALID_IDEMPOTENCY_KEY", "checkout idempotency context is invalid")
			return
		}
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to lock checkout idempotency key")
		return
	}

	record, err := checkout.FindCreateIdempotencyTx(
		r.Context(), tx, actor.TenantID, actor.ID, idempotencyKey, requestFingerprint,
	)
	if errors.Is(err, checkout.ErrIdempotencyConflict) {
		store.SendError(w, http.StatusConflict, "IDEMPOTENCY_KEY_REUSED", "Idempotency-Key was already used for a different checkout request")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to inspect checkout idempotency state")
		return
	}

	var (
		intent           *checkout.Intent
		pricing          checkout.PricingSnapshot
		hasCouponFunding bool
		responseStatus   = http.StatusCreated
	)

	if record != nil {
		if err := tx.Rollback(); err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to release checkout retry lock")
			return
		}
		intent, err = checkout.GetIntent(s.db, record.IntentID, actor.TenantID, actor.ID)
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to recover idempotent checkout intent")
			return
		}
		pricing, err = checkout.GetPricing(s.db, intent.ID)
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to recover idempotent checkout pricing")
			return
		}
		if intent.State != checkout.StatePending && intent.State != checkout.StateWltOutcomeUnknown {
			store.SendJSON(w, http.StatusOK, map[string]any{"intent": marshalIntentWithPricing(intent, pricing)})
			return
		}
		hasCouponFunding = pricing.CouponRedemptionID != ""
		responseStatus = http.StatusOK
	} else {
		intentID, allocationErr := checkout.NewIntentID(s.db)
		if allocationErr != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to allocate checkout intent")
			return
		}

		snapshot, snapshotErr := cart.ComputeCheckoutSnapshotForClientTx(r.Context(), tx, cartID, actor.ID, storeID)
		if errors.Is(snapshotErr, cart.ErrCartItemMissingPrice) {
			store.SendError(w, http.StatusConflict, "CART_ITEM_MISSING_PRICE", "one or more cart items are missing a price snapshot")
			return
		}
		if errors.Is(snapshotErr, cart.ErrNotFound) {
			store.SendError(w, http.StatusNotFound, "CART_NOT_FOUND", "active cart does not belong to the authenticated client and store")
			return
		}
		if errors.Is(snapshotErr, cart.ErrInvalid) {
			store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", snapshotErr.Error())
			return
		}
		if snapshotErr != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to compute cart snapshot")
			return
		}

		deliveryPolicy, pricingErr := checkout.ResolveDeliveryPricingTx(r.Context(), tx, storeID, fulfillmentMode)
		if errors.Is(pricingErr, checkout.ErrDeliveryPricingUnavailable) {
			store.SendError(w, http.StatusConflict, "DELIVERY_PRICING_UNAVAILABLE", "no approved delivery pricing policy exists for this store and fulfillment mode")
			return
		}
		if errors.Is(pricingErr, checkout.ErrInvalid) {
			store.SendError(w, http.StatusBadRequest, "INVALID_FULFILLMENT_MODE", "fulfillment mode is invalid")
			return
		}
		if pricingErr != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to resolve delivery pricing")
			return
		}
		if deliveryPolicy.Currency != snapshot.Currency {
			store.SendError(w, http.StatusConflict, "PRICING_CURRENCY_MISMATCH", "cart and delivery pricing currencies do not match")
			return
		}

		reservation, reservationErr := coupons.ReservePricedTx(r.Context(), tx, coupons.ReservePricedInput{
			Code: couponCode, ClientActorID: actor.ID, CartID: cartID,
			CheckoutIntentID: intentID, StoreID: storeID,
			FulfillmentMode:       fulfillmentMode,
			SubtotalMinorUnits:    snapshot.AmountMinorUnits,
			DeliveryFeeMinorUnits: deliveryPolicy.FeeMinorUnits,
			Currency:              snapshot.Currency,
		})
		if errors.Is(reservationErr, coupons.ErrUsageLimit) {
			store.SendError(w, http.StatusConflict, "COUPON_USAGE_LIMIT", "coupon usage limit has been reached")
			return
		}
		if errors.Is(reservationErr, coupons.ErrNotFound) || errors.Is(reservationErr, coupons.ErrInactive) || errors.Is(reservationErr, coupons.ErrNotEligible) {
			store.SendError(w, http.StatusUnprocessableEntity, "COUPON_INVALID_OR_INELIGIBLE", "coupon is invalid or not eligible for this checkout")
			return
		}
		if errors.Is(reservationErr, coupons.ErrInvalid) {
			store.SendError(w, http.StatusBadRequest, "INVALID_COUPON", "coupon code format is invalid")
			return
		}
		if reservationErr != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to reserve coupon")
			return
		}

		pricing = checkout.PricingSnapshot{
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

		intent, err = checkout.CreatePricedIntentWithAddressTx(r.Context(), tx, checkout.CreateIntentInput{
			ID: intentID, TenantID: actor.TenantID, ClientID: actor.ID, CartID: cartID, StoreID: storeID,
			FulfillmentMode: checkout.FulfillmentMode(fulfillmentMode),
			PaymentMethod:   checkout.PaymentMethod(paymentMethod),
			DeliveryAddress: deliveryAddressSnapshot, Note: note,
		}, pricing, deliveryAddressID)
		if errors.Is(err, checkout.ErrInvalid) {
			store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to create checkout intent")
			return
		}
		if err := checkout.BindCreateIdempotencyTx(
			r.Context(), tx, actor.TenantID, actor.ID, idempotencyKey, requestFingerprint, intent.ID,
		); err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to bind checkout idempotency state")
			return
		}
		if err := tx.Commit(); err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to commit checkout intent")
			return
		}
		hasCouponFunding = reservation != nil
	}

	correlationID := fundingCorrelation(r.Header.Get("X-Correlation-ID"), intent.ID)
	var fundingProjection *coupons.FundingProjection
	if hasCouponFunding {
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
		if wlt.IsPaymentSessionOutcomeUnknown(err) {
			unknownIntent, markErr := checkout.MarkWltOutcomeUnknown(s.db, intent.ID, actor.TenantID, actor.ID)
			if markErr != nil {
				store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to mark unknown WLT outcome")
				return
			}
			store.SendJSON(w, http.StatusAccepted, map[string]any{
				"intent":                 marshalIntentWithPricing(unknownIntent, pricing),
				"reconciliationRequired": true,
				"error": map[string]any{
					"code":    "WLT_OUTCOME_UNKNOWN",
					"message": "WLT may have accepted the idempotent request; retry or operator reconciliation is required",
				},
			})
			return
		}
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

	intent, err = checkout.AttachWltPaymentSessionIdempotent(s.db, intent.ID, actor.TenantID, actor.ID, paymentSession.ID)
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
	store.SendJSON(w, responseStatus, map[string]any{"intent": marshalIntentWithPricing(intent, pricing)})
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

func checkoutCreateFingerprint(parts ...string) string {
	digest := sha256.Sum256([]byte(strings.Join(parts, "\x1f")))
	return hex.EncodeToString(digest[:])
}

func (s *protectedStoreServer) handleReconcileCheckoutIntent(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", OperationsPermissionManage, "operator"); !ok {
		return
	}
	intent, err := checkout.GetIntentForOperator(s.db, r.PathValue("intentId"))
	if errors.Is(err, checkout.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "checkout intent not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid checkout intent")
		return
	}
	if intent.State != checkout.StateWltOutcomeUnknown {
		store.SendError(w, http.StatusConflict, "RECONCILIATION_NOT_REQUIRED", "checkout intent is not waiting for WLT reconciliation")
		return
	}
	pricing, err := checkout.GetPricing(s.db, intent.ID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load checkout pricing")
		return
	}
	correlationID := fundingCorrelation(r.Header.Get("X-Correlation-ID"), intent.ID)
	session, err := s.wlt.CreatePaymentSession(r.Context(), wlt.CreatePaymentSessionInput{
		CheckoutIntentID: intent.ID,
		TenantID:         intent.TenantID,
		ClientID:         intent.ClientID,
		StoreID:          intent.StoreID,
		PaymentMethod:    string(intent.PaymentMethod),
		AmountMinorUnits: pricing.TotalMinorUnits,
		Currency:         pricing.Currency,
		CartSnapshotHash: pricing.SnapshotHash,
		CorrelationID:    correlationID,
		IdempotencyKey:   "dsh-checkout-intent:" + intent.ID,
	})
	if err != nil {
		if wlt.IsPaymentSessionOutcomeUnknown(err) {
			store.SendJSON(w, http.StatusAccepted, map[string]any{
				"intent":                 marshalIntentWithPricing(intent, pricing),
				"reconciliationRequired": true,
			})
			return
		}
		_ = s.releaseCouponFunding(r.Context(), intent.TenantID, intent.ID, "reconciliation_definitive_failure", correlationID)
		_ = coupons.ReleaseByIntent(s.db, intent.ID, "reconciliation_definitive_failure")
		failed, markErr := checkout.MarkWltHandoffFailed(s.db, intent.ID, intent.TenantID, intent.ClientID)
		if markErr == nil {
			store.SendJSON(w, http.StatusServiceUnavailable, map[string]any{
				"intent":                 marshalIntentWithPricing(failed, pricing),
				"reconciliationRequired": false,
			})
			return
		}
		store.SendError(w, http.StatusServiceUnavailable, "WLT_HANDOFF_UNAVAILABLE", "WLT reconciliation failed definitively")
		return
	}
	reconciled, err := checkout.AttachWltPaymentSessionIdempotent(s.db, intent.ID, intent.TenantID, intent.ClientID, session.ID)
	if err != nil {
		store.SendError(w, http.StatusConflict, "RECONCILIATION_CONFLICT", "checkout state changed while reconciling")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"intent":                 marshalIntentWithPricing(reconciled, pricing),
		"reconciliationRequired": false,
	})
}
