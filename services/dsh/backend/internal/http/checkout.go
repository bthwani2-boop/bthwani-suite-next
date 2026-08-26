package http

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"dsh-api/internal/cart"
	"dsh-api/internal/checkout"
	"dsh-api/internal/checkoutfinanceoutbox"
	"dsh-api/internal/clientaddress"
	"dsh-api/internal/coupons"
	"dsh-api/internal/store"
	"dsh-api/internal/wlt"
)

func (s *protectedStoreServer) evaluateCheckoutDependencies(
	r *http.Request,
	intent *checkout.Intent,
	addressID string,
	mode checkout.FulfillmentMode,
) (checkout.IntentDependencyValidation, string, string, error) {
	if mode != checkout.ModeBthwaniDelivery && mode != checkout.ModePartnerDelivery && mode != checkout.ModePickup {
		return checkout.IntentDependencyValidation{}, "", "", checkout.ErrInvalid
	}
	resolvedAddressID := strings.TrimSpace(addressID)
	if mode != checkout.ModePickup && resolvedAddressID == "" {
		if err := s.db.QueryRowContext(r.Context(), `
			SELECT COALESCE(delivery_address_id, '')
			FROM dsh_checkout_intents
			WHERE id=$1::uuid AND operator_context_id=$2 AND client_id=$3`,
			intent.ID, intent.OperatorContextID, intent.ClientID).Scan(&resolvedAddressID); err != nil {
			return checkout.IntentDependencyValidation{}, "", "", err
		}
	}

	var serviceAreaCode string
	var clientLat, clientLng *float64
	addressSnapshot := ""
	if mode != checkout.ModePickup {
		if resolvedAddressID == "" {
			return checkout.IntentDependencyValidation{
				CartReady:   false,
				CartCode:    "ADDRESS_REQUIRED",
				Serviceable: false,
			}, resolvedAddressID, addressSnapshot, nil
		}
		address, err := clientaddress.GetOwned(r.Context(), s.db, intent.ClientID, resolvedAddressID)
		if err != nil {
			return checkout.IntentDependencyValidation{}, "", "", err
		}
		serviceAreaCode = address.ServiceAreaCode
		clientLat = address.Latitude
		clientLng = address.Longitude
		addressSnapshot = address.CheckoutSnapshot()
	}

	cartValidation, err := cart.ValidateCart(r.Context(), s.db, intent.CartID)
	if err != nil {
		return checkout.IntentDependencyValidation{}, "", "", err
	}
	if len(cartValidation.Items) == 0 {
		cartValidation.Ready = false
		cartValidation.Code = "CART_EMPTY"
	}
	serviceability := cart.CheckGovernedServiceability(
		r.Context(), s.db, s.maps, intent.StoreID, serviceAreaCode, clientLat, clientLng,
		cart.FulfillmentMode(mode),
	)
	return checkout.IntentDependencyValidation{
		CartReady:          cartValidation.Ready,
		CartCode:           cartValidation.Code,
		Serviceable:        serviceability.Serviceable,
		ServiceabilityCode: serviceability.Code,
	}, resolvedAddressID, addressSnapshot, nil
}

// POST /dsh/client/checkout-intents
func (s *protectedStoreServer) handleCreateCheckoutIntent(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	var body struct {
		CartID              string `json:"cartId"`
		StoreID             string `json:"storeId"`
		ExpectedCartVersion int    `json:"expectedCartVersion"`
		FulfillmentMode     string `json:"fulfillmentMode"`
		PaymentMethod       string `json:"paymentMethod"`
		DeliveryAddressID   string `json:"deliveryAddressId"`
		Note                string `json:"note"`
		CouponCode          string `json:"couponCode"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}

	cartID := strings.TrimSpace(body.CartID)
	storeID := strings.TrimSpace(body.StoreID)
	idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
	if cartID == "" || storeID == "" || body.ExpectedCartVersion < 1 || actor.OperatorContextID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "cartId, storeId, expectedCartVersion and authenticated OperatorContext are required")
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
		paymentMethod != string(checkout.MethodMixed) {
		store.SendError(w, http.StatusBadRequest, "INVALID_PAYMENT_METHOD", "payment method is invalid")
		return
	}
	if (paymentMethod == string(checkout.MethodCOD) || paymentMethod == string(checkout.MethodMixed)) && fulfillmentMode != string(checkout.ModeBthwaniDelivery) {
		store.SendError(w, http.StatusUnprocessableEntity, "COD_REQUIRES_BTHWANI_DELIVERY", "cash on delivery is only available for BThwani delivery")
		return
	}

	var address *clientaddress.Address
	var serviceAreaCode string
	var clientLat, clientLng *float64
	deliveryAddressID := ""
	deliveryAddressSnapshot := ""

	if fulfillmentMode != string(checkout.ModePickup) {
		deliveryAddressID = strings.TrimSpace(body.DeliveryAddressID)
		if deliveryAddressID == "" {
			store.SendError(w, http.StatusBadRequest, "DELIVERY_ADDRESS_REQUIRED", "deliveryAddressId is required for delivery checkout")
			return
		}
		addr, err := clientaddress.GetOwned(r.Context(), s.db, actor.ID, deliveryAddressID)
		if errors.Is(err, clientaddress.ErrNotFound) {
			store.SendError(w, http.StatusNotFound, "ADDRESS_NOT_FOUND", "delivery address is not owned by the authenticated client")
			return
		}
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to resolve delivery address")
			return
		}
		address = addr
		serviceAreaCode = address.ServiceAreaCode
		clientLat = address.Latitude
		clientLng = address.Longitude
		deliveryAddressSnapshot = address.CheckoutSnapshot()
	}

	// Re-evaluate the canonical DSH operational decision immediately before the
	// OCC-locked cart snapshot. A cached or earlier successful serviceability
	// result cannot authorize checkout after a pause, capacity change, mode
	// disablement, or provider denial.
	serviceability := cart.CheckGovernedServiceability(
		r.Context(), s.db, s.maps, storeID, serviceAreaCode, clientLat, clientLng,
		cart.FulfillmentMode(fulfillmentMode),
	)
	if !serviceability.Serviceable {
		reasonCode := serviceability.Code
		if reasonCode == "" {
			reasonCode = "serviceability_unavailable"
		}
		store.SendError(w, http.StatusUnprocessableEntity, strings.ToUpper(reasonCode), fmt.Sprintf("checkout is unavailable: %s", reasonCode))
		return
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

	if err := checkout.LockCreateIdempotencyTx(r.Context(), tx, actor.OperatorContextID, actor.ID, idempotencyKey); err != nil {
		if errors.Is(err, checkout.ErrInvalid) {
			store.SendError(w, http.StatusBadRequest, "INVALID_IDEMPOTENCY_KEY", "checkout idempotency context is invalid")
			return
		}
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to lock checkout idempotency key")
		return
	}

	record, err := checkout.FindCreateIdempotencyTx(
		r.Context(), tx, actor.OperatorContextID, actor.ID, idempotencyKey, requestFingerprint,
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
		intent             *checkout.Intent
		pricing            checkout.PricingSnapshot
		checkoutQuoteInput *wlt.CalculatePricingQuoteRequest
		hasCouponFunding   bool
		responseStatus     = http.StatusCreated
	)

	if record != nil {
		if err := tx.Rollback(); err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to release checkout retry lock")
			return
		}
		intent, err = checkout.GetIntent(s.db, record.IntentID, actor.OperatorContextID, actor.ID)
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to recover idempotent checkout intent")
			return
		}
		pricing, err = checkout.GetPricing(s.db, intent.ID)
		if err != nil {
			store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to recover idempotent checkout pricing")
			return
		}
		if intent.State != checkout.StateDraft && intent.State != checkout.StateValidating && intent.State != checkout.StateReady && intent.State != checkout.StateBlocked {
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

		snapshot, snapshotErr := cart.ComputeCheckoutSnapshotTx(r.Context(), tx, actor.ID, cartID, storeID, body.ExpectedCartVersion)
		if errors.Is(snapshotErr, cart.ErrCartItemMissingPrice) {
			store.SendError(w, http.StatusConflict, "CART_ITEM_MISSING_PRICE", "one or more cart items are missing a price snapshot")
			return
		}
		if errors.Is(snapshotErr, cart.ErrNotFound) {
			store.SendError(w, http.StatusNotFound, "CART_NOT_FOUND", "active cart does not belong to the authenticated client and store")
			return
		}
		if errors.Is(snapshotErr, cart.ErrVersionConflict) {
			s.sendCheckoutCartVersionConflict(w, r, actor.ID, cartID, storeID, body.ExpectedCartVersion)
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
			SubtotalMinorUnits:    snapshot.SubtotalMinorUnits,
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
			SubtotalMinorUnits:    snapshot.SubtotalMinorUnits,
			DeliveryFeeMinorUnits: deliveryPolicy.FeeMinorUnits,
			TotalMinorUnits:       snapshot.SubtotalMinorUnits + deliveryPolicy.FeeMinorUnits,
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
		quoteLines := make([]wlt.QuotePricingInputLine, 0, len(snapshot.Lines))
		for _, line := range snapshot.Lines {
			quoteLines = append(quoteLines, wlt.QuotePricingInputLine{
				MasterProductID:     line.MasterProductID,
				Quantity:            line.Quantity,
				UnitPriceMinorUnits: line.UnitPriceMinorUnits,
			})
		}
		checkoutQuoteInput = &wlt.CalculatePricingQuoteRequest{
			CheckoutIntentID: intentID,
			CartSnapshotHash: snapshot.SnapshotHash,
			ClientID:         actor.ID,
			StoreID:          storeID,
			Currency:         snapshot.Currency,
			CartVersion:      snapshot.CartVersion,
			Lines:            quoteLines,
			PricingEvidence: wlt.PricingEvidence{
				Version:               snapshot.CartVersion,
				DeliveryFeeMinorUnits: pricing.DeliveryFeeMinorUnits,
				DiscountMinorUnits:    pricing.DiscountMinorUnits,
			},
		}

		intent, err = checkout.CreatePricedIntentWithAddressTx(r.Context(), tx, checkout.CreateIntentInput{
			ID: intentID, OperatorContextID: actor.OperatorContextID, ClientID: actor.ID, CartID: cartID, StoreID: storeID,
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
			r.Context(), tx, actor.OperatorContextID, actor.ID, idempotencyKey, requestFingerprint, intent.ID,
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
		fundingProjection, err = s.reserveCouponFunding(r.Context(), actor.OperatorContextID, intent.ID, correlationID)
		if err != nil {
			cleanupErr := coupons.ReleaseByIntent(s.db, intent.ID, "wlt_funding_reserve_failed")
			failedIntent, markErr := checkout.MarkHandoffBlocked(s.db, intent.ID, actor.OperatorContextID, actor.ID)
			if markErr == nil {
				if cleanupErr != nil {
					store.SendJSON(w, http.StatusServiceUnavailable, map[string]any{
						"intent": marshalIntentWithPricing(failedIntent, pricing),
						"error": map[string]any{
							"code":    "CHECKOUT_COMPENSATION_REQUIRED",
							"message": "promotion funding reservation failed and coupon compensation requires reconciliation",
						},
					})
					return
				}
				store.SendJSON(w, http.StatusServiceUnavailable, map[string]any{
					"intent": marshalIntentWithPricing(failedIntent, pricing),
					"error": map[string]any{
						"code":    "WLT_PROMOTION_FUNDING_UNAVAILABLE",
						"message": "promotion funding reservation is unavailable",
					},
				})
				return
			}
			if cleanupErr != nil {
				store.SendError(w, http.StatusServiceUnavailable, "CHECKOUT_COMPENSATION_REQUIRED", "promotion funding reservation failed and coupon compensation requires reconciliation")
				return
			}
			store.SendError(w, http.StatusServiceUnavailable, "WLT_PROMOTION_FUNDING_UNAVAILABLE", "promotion funding reservation is unavailable")
			return
		}
	}

	var canonicalQuote *wlt.WltPricingQuote
	if checkoutQuoteInput != nil {
		canonicalQuote, err = s.wlt.CalculateQuote(r.Context(), *checkoutQuoteInput)
		if err != nil {
			// Issuance is exactly once per checkout intent in WLT. A transport
			// failure is ambiguous, so read its canonical state before declaring
			// the handoff failed or compensating the coupon reservation.
			canonicalQuote, err = s.wlt.GetCheckoutQuote(r.Context(), intent.ID)
		}
	} else {
		canonicalQuote, err = s.wlt.GetCheckoutQuote(r.Context(), intent.ID)
	}
	if err != nil || !checkoutQuoteMatchesPricing(canonicalQuote, intent, pricing) {
		var compensationErr error
		if fundingProjection != nil {
			if releaseErr := s.releaseCouponFunding(r.Context(), actor.OperatorContextID, intent.ID, "pricing_quote_unavailable", correlationID); releaseErr != nil {
				compensationErr = errors.Join(compensationErr, releaseErr)
				if markErr := coupons.MarkFundingFailed(r.Context(), s.db, fundingProjection.RedemptionID, "wlt_release_after_pricing_quote_failure"); markErr != nil {
					compensationErr = errors.Join(compensationErr, markErr)
				}
			}
		}
		if releaseErr := coupons.ReleaseByIntent(s.db, intent.ID, "wlt_pricing_quote_unavailable"); releaseErr != nil {
			compensationErr = errors.Join(compensationErr, releaseErr)
		}
		failedIntent, markErr := checkout.MarkHandoffBlocked(s.db, intent.ID, actor.OperatorContextID, actor.ID)
		if markErr == nil {
			if compensationErr != nil {
				store.SendJSON(w, http.StatusServiceUnavailable, map[string]any{
					"intent": marshalIntentWithPricing(failedIntent, pricing),
					"error":  map[string]any{"code": "WLT_PRICING_QUOTE_AND_COMPENSATION_REQUIRED", "message": "canonical WLT pricing quote is unavailable and financial compensation requires reconciliation"},
				})
				return
			}
			store.SendJSON(w, http.StatusServiceUnavailable, map[string]any{
				"intent": marshalIntentWithPricing(failedIntent, pricing),
				"error":  map[string]any{"code": "WLT_PRICING_QUOTE_UNAVAILABLE", "message": "canonical WLT pricing quote is unavailable or does not match the frozen checkout"},
			})
			return
		}
		store.SendError(w, http.StatusServiceUnavailable, "WLT_PRICING_QUOTE_UNAVAILABLE", "canonical WLT pricing quote is unavailable")
		return
	}

	paymentSession, err := s.wlt.CreatePaymentSession(r.Context(), wlt.CreatePaymentSessionInput{
		CheckoutIntentID: intent.ID, ClientID: actor.ID,
		StoreID: intent.StoreID, PaymentMethod: string(intent.PaymentMethod),
		AmountMinorUnits: pricing.TotalMinorUnits, Currency: pricing.Currency,
		CartSnapshotHash: canonicalQuote.CartSnapshotHash,
		PricingQuoteID:   canonicalQuote.ID,
		CorrelationID:    correlationID,
		IdempotencyKey:   "dsh-checkout-intent:" + intent.ID,
	})
	if err != nil {
		if wlt.IsPaymentSessionOutcomeUnknown(err) {
			unknownIntent, markErr := checkout.MarkWltOutcomeUnknown(s.db, intent.ID, actor.OperatorContextID, actor.ID)
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
		var compensationErr error
		if fundingProjection != nil {
			if releaseErr := s.releaseCouponFunding(r.Context(), actor.OperatorContextID, intent.ID, "payment_session_handoff_failed", correlationID); releaseErr != nil {
				compensationErr = errors.Join(compensationErr, releaseErr)
				if markErr := coupons.MarkFundingFailed(r.Context(), s.db, fundingProjection.RedemptionID, "wlt_release_after_payment_handoff_failed"); markErr != nil {
					compensationErr = errors.Join(compensationErr, markErr)
				}
			}
		}
		if releaseErr := coupons.ReleaseByIntent(s.db, intent.ID, "wlt_handoff_failed"); releaseErr != nil {
			compensationErr = errors.Join(compensationErr, releaseErr)
		}
		if failedIntent, markErr := checkout.MarkHandoffBlocked(s.db, intent.ID, actor.OperatorContextID, actor.ID); markErr == nil {
			code := "WLT_HANDOFF_UNAVAILABLE"
			message := "WLT payment-session handoff is unavailable"
			if compensationErr != nil {
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

	intent, err = checkout.AttachWltPaymentSessionIdempotent(s.db, intent.ID, actor.OperatorContextID, actor.ID, paymentSession.ID)
	if err != nil {
		var compensationErr error
		if expireErr := s.wlt.ExpireSession(r.Context(), paymentSession.ID, correlationID); expireErr != nil {
			if queueErr := checkoutfinanceoutbox.EnqueuePaymentSessionExpiry(s.db, intent.ID, paymentSession.ID, actor.ID, "payment_session_attach_failed", correlationID); queueErr != nil {
				compensationErr = errors.Join(compensationErr, expireErr, queueErr)
			}
		}
		if fundingProjection != nil {
			if releaseErr := s.releaseCouponFunding(r.Context(), actor.OperatorContextID, intent.ID, "payment_session_attach_failed", correlationID); releaseErr != nil {
				compensationErr = errors.Join(compensationErr, releaseErr)
				if markErr := coupons.MarkFundingFailed(r.Context(), s.db, fundingProjection.RedemptionID, "wlt_release_after_attach_failed"); markErr != nil {
					compensationErr = errors.Join(compensationErr, markErr)
				}
			}
		}
		if releaseErr := coupons.ReleaseByIntent(s.db, intent.ID, "payment_session_attach_failed"); releaseErr != nil {
			compensationErr = errors.Join(compensationErr, releaseErr)
		}
		_, markErr := checkout.MarkWltHandoffFailed(s.db, intent.ID, actor.OperatorContextID, actor.ID)
		if markErr != nil {
			compensationErr = errors.Join(compensationErr, markErr)
		}
		if compensationErr != nil {
			store.SendError(w, http.StatusServiceUnavailable, "CHECKOUT_COMPENSATION_REQUIRED", "WLT payment-session attach failed and financial compensation requires reconciliation")
			return
		}
		if errors.Is(err, checkout.ErrInvalid) {
			store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		if errors.Is(err, checkout.ErrConflict) {
			store.SendError(w, http.StatusConflict, "CONFLICT", "checkout intent is not in confirming state for WLT handoff")
			return
		}
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to attach WLT payment session")
		return
	}
	store.SendJSON(w, responseStatus, map[string]any{"intent": marshalIntentWithPricing(intent, pricing)})
}

func (s *protectedStoreServer) sendCheckoutCartVersionConflict(
	w http.ResponseWriter,
	r *http.Request,
	clientID string,
	cartID string,
	storeID string,
	expectedVersion int,
) {
	current, err := cart.GetCart(r.Context(), s.db, s.wlt, clientID, storeID)
	if errors.Is(err, cart.ErrNotFound) {
		store.SendError(w, http.StatusConflict, "CART_VERSION_CONFLICT", "cart changed and is no longer active")
		return
	}
	if err != nil || current.ID != cartID {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "cart changed but canonical readback failed")
		return
	}
	w.Header().Set("ETag", fmt.Sprintf(`"%d"`, current.Version))
	store.SendJSON(w, http.StatusConflict, map[string]any{
		"code":                "CART_VERSION_CONFLICT",
		"message":             "cart changed; reload the current cart before checkout",
		"expectedCartVersion": expectedVersion,
		"currentCartVersion":  current.Version,
		"cart":                current,
	})
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
	intent, err := checkout.GetIntent(s.db, intentID, actor.OperatorContextID, actor.ID)
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
	intent, err := checkout.CancelIntent(s.db, intentID, actor.OperatorContextID, actor.ID)
	if errors.Is(err, checkout.ErrConflict) {
		store.SendError(w, http.StatusConflict, "CONFLICT", "intent not found or already closed")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to cancel checkout intent")
		return
	}
	correlationID := fundingCorrelation(r.Header.Get("X-Correlation-ID"), intent.ID)
	if err := s.releaseCouponFunding(r.Context(), actor.OperatorContextID, intent.ID, "client_cancelled", correlationID); err != nil {
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
	if _, ok := s.ActorFromContext(r.Context()); !ok {
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
	out := map[string]any{
		"id": i.ID, "operatorContextId": i.OperatorContextID, "clientId": i.ClientID, "cartId": i.CartID, "storeId": i.StoreID,
		"fulfillmentMode": string(i.FulfillmentMode), "state": string(i.State),
		"paymentMethod": string(i.PaymentMethod), "wltPaymentSessionId": i.WltPaymentSessionID,
		"deliveryAddress": i.DeliveryAddress, "note": i.Note, "version": i.Version,
		"createdAt": i.CreatedAt, "updatedAt": i.UpdatedAt,
		"previewHash":      i.PreviewHash,
		"validationIssues": i.ValidationIssues,
	}
	if i.ExpiresAt != nil {
		out["expiresAt"] = i.ExpiresAt
	} else {
		out["expiresAt"] = nil
	}
	return out
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
	// reconciliationRequired: intent is in confirming (awaiting WLT callback)
	result["reconciliationRequired"] = i.State == checkout.StateConfirming
	if i.State == checkout.StateConfirming {
		result["reconciliationAgeSeconds"] = int64(time.Since(i.UpdatedAt).Seconds())
	} else {
		result["reconciliationAgeSeconds"] = int64(0)
	}
	return result
}

func checkoutCreateFingerprint(parts ...string) string {
	digest := sha256.Sum256([]byte(strings.Join(parts, "\x1f")))
	return hex.EncodeToString(digest[:])
}

func checkoutQuoteMatchesPricing(quote *wlt.WltPricingQuote, intent *checkout.Intent, pricing checkout.PricingSnapshot) bool {
	if quote == nil || intent == nil || strings.TrimSpace(quote.ID) == "" || quote.ExpiresAt == nil || !quote.ExpiresAt.After(time.Now().UTC()) {
		return false
	}
	return quote.SubtotalMinorUnits == pricing.SubtotalMinorUnits &&
		quote.DeliveryFeeMinorUnits == pricing.DeliveryFeeMinorUnits &&
		quote.ServiceFeeMinorUnits == 0 && quote.TaxMinorUnits == 0 && quote.RoundingMinorUnits == 0 &&
		quote.DiscountMinorUnits == pricing.DiscountMinorUnits && quote.TotalMinorUnits == pricing.TotalMinorUnits &&
		quote.Currency == pricing.Currency
}

func (s *protectedStoreServer) handleReconcileCheckoutIntent(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.ActorFromContext(r.Context()); !ok {
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
	if intent.State != checkout.StateConfirming {
		store.SendError(w, http.StatusConflict, "RECONCILIATION_NOT_REQUIRED", "checkout intent is not in confirming state")
		return
	}
	pricing, err := checkout.GetPricing(s.db, intent.ID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load checkout pricing")
		return
	}
	correlationID := fundingCorrelation(r.Header.Get("X-Correlation-ID"), intent.ID)
	canonicalQuote, err := s.wlt.GetCheckoutQuote(r.Context(), intent.ID)
	if err != nil || !checkoutQuoteMatchesPricing(canonicalQuote, intent, pricing) {
		store.SendError(w, http.StatusServiceUnavailable, "WLT_PRICING_QUOTE_UNAVAILABLE", "canonical WLT pricing quote is unavailable or does not match the frozen checkout")
		return
	}
	session, err := s.wlt.CreatePaymentSession(r.Context(), wlt.CreatePaymentSessionInput{
		CheckoutIntentID: intent.ID,
		ClientID:         intent.ClientID,
		StoreID:          intent.StoreID,
		PaymentMethod:    string(intent.PaymentMethod),
		AmountMinorUnits: pricing.TotalMinorUnits,
		Currency:         pricing.Currency,
		CartSnapshotHash: canonicalQuote.CartSnapshotHash,
		PricingQuoteID:   canonicalQuote.ID,
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
		var compensationErr error
		if releaseErr := s.releaseCouponFunding(r.Context(), intent.OperatorContextID, intent.ID, "reconciliation_definitive_failure", correlationID); releaseErr != nil {
			compensationErr = errors.Join(compensationErr, releaseErr)
		}
		if releaseErr := coupons.ReleaseByIntent(s.db, intent.ID, "reconciliation_definitive_failure"); releaseErr != nil {
			compensationErr = errors.Join(compensationErr, releaseErr)
		}
		failed, markErr := checkout.MarkWltHandoffFailed(s.db, intent.ID, intent.OperatorContextID, intent.ClientID)
		if markErr == nil {
			if compensationErr != nil {
				store.SendJSON(w, http.StatusServiceUnavailable, map[string]any{
					"intent":                 marshalIntentWithPricing(failed, pricing),
					"reconciliationRequired": true,
					"error":                  map[string]any{"code": "WLT_HANDOFF_COMPENSATION_REQUIRED", "message": "WLT reconciliation failed and financial compensation requires reconciliation"},
				})
				return
			}
			store.SendJSON(w, http.StatusServiceUnavailable, map[string]any{
				"intent":                 marshalIntentWithPricing(failed, pricing),
				"reconciliationRequired": false,
			})
			return
		}
		store.SendError(w, http.StatusServiceUnavailable, "WLT_HANDOFF_UNAVAILABLE", "WLT reconciliation failed definitively")
		return
	}
	reconciled, err := checkout.AttachWltPaymentSessionIdempotent(s.db, intent.ID, intent.OperatorContextID, intent.ClientID, session.ID)
	if err != nil {
		store.SendError(w, http.StatusConflict, "RECONCILIATION_CONFLICT", "checkout state changed while reconciling")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"intent":                 marshalIntentWithPricing(reconciled, pricing),
		"reconciliationRequired": false,
	})
}

// POST /dsh/client/checkout-intents/{intentId}/validate
func (s *protectedStoreServer) handleValidateCheckoutIntent(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	intentID := r.PathValue("intentId")
	if intentID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "intentId is required")
		return
	}
	intent, err := checkout.GetIntent(s.db, intentID, actor.OperatorContextID, actor.ID)
	if errors.Is(err, checkout.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "checkout intent not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to resolve checkout intent")
		return
	}
	dependencies, _, _, err := s.evaluateCheckoutDependencies(r, intent, "", intent.FulfillmentMode)
	if errors.Is(err, clientaddress.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "ADDRESS_NOT_FOUND", "checkout address is no longer owned by the authenticated client")
		return
	}
	if errors.Is(err, checkout.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "checkout fulfillment mode is invalid")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to evaluate checkout dependencies")
		return
	}
	intent, err = checkout.ValidateIntent(s.db, intentID, actor.OperatorContextID, actor.ID, dependencies)
	if errors.Is(err, checkout.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "checkout intent not found")
		return
	}
	if errors.Is(err, checkout.ErrConflict) {
		store.SendError(w, http.StatusConflict, "CONFLICT", "checkout intent cannot be validated in its current state")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to persist checkout validation")
		return
	}
	pricing, err := checkout.GetPricing(s.db, intent.ID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get checkout pricing")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"intent": marshalIntentWithPricing(intent, pricing)})
}

// POST /dsh/client/checkout-intents/{intentId}/refresh
func (s *protectedStoreServer) handleRefreshCheckoutIntent(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	intentID := r.PathValue("intentId")
	if intentID == "" {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "intentId is required")
		return
	}
	intent, err := checkout.GetIntent(s.db, intentID, actor.OperatorContextID, actor.ID)
	if errors.Is(err, checkout.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "checkout intent not found")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to resolve checkout intent")
		return
	}
	var body struct {
		FulfillmentMode   string `json:"fulfillmentMode"`
		DeliveryAddressID string `json:"deliveryAddressId"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}

	addressID := strings.TrimSpace(body.DeliveryAddressID)
	mode := checkout.FulfillmentMode(strings.TrimSpace(body.FulfillmentMode))
	if mode == "" {
		mode = intent.FulfillmentMode
	}
	if mode != checkout.ModePickup && addressID == "" {
		store.SendError(w, http.StatusBadRequest, "DELIVERY_ADDRESS_REQUIRED", "deliveryAddressId is required for delivery refresh")
		return
	}

	dependencies, resolvedAddressID, addressSnapshot, err := s.evaluateCheckoutDependencies(r, intent, addressID, mode)
	if errors.Is(err, clientaddress.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "ADDRESS_NOT_FOUND", "delivery address is not owned by the authenticated client")
		return
	}
	if errors.Is(err, checkout.ErrInvalid) {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "checkout fulfillment mode is invalid")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to evaluate checkout dependencies")
		return
	}
	intent, err = checkout.RefreshIntent(s.db, checkout.RefreshIntentInput{
		IntentID: intentID, OperatorContextID: actor.OperatorContextID, ClientID: actor.ID,
		AddressID: resolvedAddressID, AddressSnapshot: addressSnapshot, Mode: mode,
		Dependencies: dependencies,
	})
	if errors.Is(err, checkout.ErrNotFound) {
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "checkout intent not found")
		return
	}
	if errors.Is(err, checkout.ErrConflict) {
		store.SendError(w, http.StatusConflict, "CONFLICT", "checkout intent cannot be refreshed in its current state")
		return
	}
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to persist checkout refresh")
		return
	}
	pricing, err := checkout.GetPricing(s.db, intent.ID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to get checkout pricing")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"intent": marshalIntentWithPricing(intent, pricing)})
}
