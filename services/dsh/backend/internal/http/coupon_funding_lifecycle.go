package http

import (
	"context"
	"fmt"
	"strings"

	"dsh-api/internal/coupons"
	"dsh-api/internal/promotionfundingoutbox"
	wltclient "dsh-api/internal/wlt"
)

func fundingCorrelation(correlationID, fallback string) string {
	if value := strings.TrimSpace(correlationID); value != "" {
		return value
	}
	return strings.TrimSpace(fallback)
}

func fundingOperatorContext(requested string, projection *coupons.FundingProjection) string {
	if value := strings.TrimSpace(requested); value != "" {
		return value
	}
	if projection == nil {
		return ""
	}
	return strings.TrimSpace(projection.OperatorContextID)
}

func (s *protectedStoreServer) enqueueCouponFundingRelease(
	ctx context.Context,
	projection *coupons.FundingProjection,
	operatorContextID string,
	reason string,
	correlationID string,
) error {
	if projection == nil || strings.TrimSpace(projection.WLTReservationID) == "" {
		return fmt.Errorf("coupon funding release requires a WLT reservation")
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if err := promotionfundingoutbox.Enqueue(tx, promotionfundingoutbox.EnqueueInput{
		EventType:          promotionfundingoutbox.EventRelease,
		OperatorContextID:  operatorContextID,
		CheckoutIntentID:   projection.CheckoutIntentID,
		CouponRedemptionID: projection.RedemptionID,
		WLTReservationID:   projection.WLTReservationID,
		Reason:             strings.TrimSpace(reason),
		IdempotencyKey:     "dsh-promotion-funding-release:" + projection.RedemptionID + ":" + strings.TrimSpace(reason),
		CorrelationID:      fundingCorrelation(correlationID, projection.CheckoutIntentID),
	}); err != nil {
		return err
	}
	return tx.Commit()
}

func (s *protectedStoreServer) enqueueCouponFundingReserveThenRelease(
	ctx context.Context,
	projection *coupons.FundingProjection,
	operatorContextID string,
	reason string,
	correlationID string,
) error {
	if projection == nil || strings.TrimSpace(projection.RedemptionID) == "" {
		return fmt.Errorf("coupon funding reserve reconciliation requires a redemption")
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if err := promotionfundingoutbox.Enqueue(tx, promotionfundingoutbox.EnqueueInput{
		EventType:          promotionfundingoutbox.EventReserveThenRelease,
		OperatorContextID:  operatorContextID,
		CheckoutIntentID:   projection.CheckoutIntentID,
		CouponRedemptionID: projection.RedemptionID,
		Reason:             strings.TrimSpace(reason),
		IdempotencyKey:     "dsh-promotion-funding-reserve-release:" + projection.RedemptionID,
		CorrelationID:      fundingCorrelation(correlationID, projection.CheckoutIntentID),
	}); err != nil {
		return err
	}
	return tx.Commit()
}

func (s *protectedStoreServer) reserveCouponFunding(
	ctx context.Context,
	operatorContextID string,
	checkoutIntentID string,
	correlationID string,
) (*coupons.FundingProjection, error) {
	projection, err := coupons.PrepareFundingForIntent(ctx, s.db, checkoutIntentID)
	if err != nil || projection == nil {
		return projection, err
	}
	operatorContextID = fundingOperatorContext(operatorContextID, projection)
	if operatorContextID == "" {
		return nil, fmt.Errorf("coupon funding OperatorContext is required")
	}
	if projection.Status == "reserved" && projection.WLTReservationID != "" {
		if projection.OperatorContextID != "" && projection.OperatorContextID != operatorContextID {
			return nil, fmt.Errorf("coupon funding OperatorContext mismatch")
		}
		return projection, nil
	}
	correlationID = fundingCorrelation(correlationID, checkoutIntentID)
	reservation, err := s.wlt.ReservePromotionFunding(ctx, wltclient.ReservePromotionFundingInput{
		OperatorContextID:        operatorContextID,
		ExternalReference:        "dsh-coupon-redemption:" + projection.RedemptionID,
		CheckoutIntentID:         projection.CheckoutIntentID,
		CouponRedemptionID:       projection.RedemptionID,
		CouponID:                 projection.CouponID,
		ClientID:                 projection.ClientActorID,
		PartnerID:                projection.PartnerID,
		PlatformFundedMinorUnits: projection.PlatformFundedMinorUnits,
		PartnerFundedMinorUnits:  projection.PartnerFundedMinorUnits,
		TotalDiscountMinorUnits:  projection.TotalDiscountMinorUnits,
		Currency:                 projection.Currency,
	}, "dsh-promotion-funding:"+projection.RedemptionID, correlationID)
	if err != nil {
		if markErr := coupons.MarkFundingFailed(ctx, s.db, projection.RedemptionID, "wlt_reserve_failed"); markErr != nil {
			return nil, fmt.Errorf("WLT promotion funding reserve failed: %v; marking DSH funding failed also failed: %w", err, markErr)
		}
		if queueErr := s.enqueueCouponFundingReserveThenRelease(ctx, projection, operatorContextID, "wlt_reserve_outcome_unknown", correlationID); queueErr != nil {
			return nil, fmt.Errorf("WLT promotion funding reserve failed: %v; durable reserve reconciliation enqueue failed: %w", err, queueErr)
		}
		return nil, fmt.Errorf("WLT promotion funding reserve failed; durable reserve reconciliation queued: %w", err)
	}
	if reservation.OperatorContextID != operatorContextID ||
		reservation.CheckoutIntentID != projection.CheckoutIntentID ||
		reservation.CouponRedemptionID != projection.RedemptionID ||
		reservation.CouponID != projection.CouponID ||
		reservation.ClientID != projection.ClientActorID ||
		reservation.TotalDiscountMinorUnits != projection.TotalDiscountMinorUnits ||
		reservation.PlatformFundedMinorUnits != projection.PlatformFundedMinorUnits ||
		reservation.PartnerFundedMinorUnits != projection.PartnerFundedMinorUnits ||
		reservation.Currency != projection.Currency {
		projection.WLTReservationID = reservation.ID
		releaseErr := error(nil)
		_, releaseErr = s.wlt.ReleasePromotionFunding(ctx, reservation.ID, wltclient.PromotionFundingTransitionInput{
			OperatorContextID: operatorContextID,
			Reason:            "dsh_reserve_response_mismatch",
		}, "dsh-promotion-funding-release:"+projection.RedemptionID+":mismatch", correlationID)
		if releaseErr != nil {
			releaseErr = s.enqueueCouponFundingRelease(ctx, projection, operatorContextID, "dsh_reserve_response_mismatch", correlationID)
		}
		if markErr := coupons.MarkFundingFailed(ctx, s.db, projection.RedemptionID, "wlt_reserve_mismatch"); markErr != nil {
			if releaseErr != nil {
				return nil, fmt.Errorf("WLT promotion funding response mismatch; release failed or could not be queued: %v; marking DSH funding failed also failed: %w", releaseErr, markErr)
			}
			return nil, fmt.Errorf("WLT promotion funding response mismatch; marking DSH funding failed also failed: %w", markErr)
		}
		if releaseErr != nil {
			return nil, fmt.Errorf("WLT promotion funding response mismatch; durable release could not be completed or queued: %w", releaseErr)
		}
		return nil, fmt.Errorf("WLT promotion funding response does not match DSH reservation")
	}
	if err := coupons.AttachWLTReservation(ctx, s.db, projection.RedemptionID, reservation.ID, operatorContextID); err != nil {
		projection.WLTReservationID = reservation.ID
		_, releaseErr := s.wlt.ReleasePromotionFunding(ctx, reservation.ID, wltclient.PromotionFundingTransitionInput{
			OperatorContextID: operatorContextID,
			Reason:            "dsh_projection_attach_failed",
		}, "dsh-promotion-funding-release:"+projection.RedemptionID+":attach", correlationID)
		if releaseErr != nil {
			releaseErr = s.enqueueCouponFundingRelease(ctx, projection, operatorContextID, "dsh_projection_attach_failed", correlationID)
		}
		if markErr := coupons.MarkFundingFailed(ctx, s.db, projection.RedemptionID, "dsh_projection_attach_failed"); markErr != nil {
			return nil, fmt.Errorf("attach WLT funding reservation failed: %v; marking DSH funding failed also failed: %w", err, markErr)
		}
		if releaseErr != nil {
			return nil, fmt.Errorf("attach WLT funding reservation failed; durable release could not be completed or queued: %w", releaseErr)
		}
		return nil, err
	}
	projection.OperatorContextID = operatorContextID
	projection.WLTReservationID = reservation.ID
	projection.Status = "reserved"
	return projection, nil
}

func (s *protectedStoreServer) releaseCouponFunding(
	ctx context.Context,
	operatorContextID string,
	checkoutIntentID string,
	reason string,
	correlationID string,
) error {
	projection, err := coupons.FundingByIntent(ctx, s.db, checkoutIntentID)
	if err != nil || projection == nil {
		return err
	}
	operatorContextID = fundingOperatorContext(operatorContextID, projection)
	if projection.WLTReservationID == "" || projection.Status == "released" || projection.Status == "reversed" {
		return nil
	}
	if operatorContextID == "" {
		return fmt.Errorf("coupon funding OperatorContext is missing")
	}
	if projection.Status == "committed" {
		return fmt.Errorf("committed coupon funding cannot be released")
	}
	correlationID = fundingCorrelation(correlationID, checkoutIntentID)
	reservation, err := s.wlt.ReleasePromotionFunding(ctx, projection.WLTReservationID, wltclient.PromotionFundingTransitionInput{
		OperatorContextID: operatorContextID,
		Reason:            strings.TrimSpace(reason),
	}, "dsh-promotion-funding-release:"+projection.RedemptionID+":"+strings.TrimSpace(reason), correlationID)
	if err != nil {
		if queueErr := s.enqueueCouponFundingRelease(ctx, projection, operatorContextID, reason, correlationID); queueErr != nil {
			return fmt.Errorf("WLT promotion funding release failed: %v; durable release enqueue failed: %w", err, queueErr)
		}
		return fmt.Errorf("WLT promotion funding release failed; durable release queued: %w", err)
	}
	if reservation.Status != "released" || reservation.OperatorContextID != operatorContextID {
		responseErr := fmt.Errorf("WLT promotion funding release response is invalid")
		if queueErr := s.enqueueCouponFundingRelease(ctx, projection, operatorContextID, reason, correlationID); queueErr != nil {
			return fmt.Errorf("%v; durable release enqueue failed: %w", responseErr, queueErr)
		}
		return fmt.Errorf("%v; durable release queued", responseErr)
	}
	if err := coupons.MarkFundingProjection(ctx, s.db, projection.WLTReservationID, "released"); err != nil {
		if queueErr := s.enqueueCouponFundingRelease(ctx, projection, operatorContextID, reason, correlationID); queueErr != nil {
			return fmt.Errorf("WLT promotion funding released but DSH projection update failed: %v; durable release enqueue failed: %w", err, queueErr)
		}
		return fmt.Errorf("WLT promotion funding released but DSH projection update failed; durable release queued: %w", err)
	}
	return nil
}

func (s *protectedStoreServer) commitCouponFunding(
	ctx context.Context,
	operatorContextID string,
	checkoutIntentID string,
	orderID string,
	correlationID string,
) error {
	projection, err := coupons.FundingByIntent(ctx, s.db, checkoutIntentID)
	if err != nil || projection == nil {
		return err
	}
	operatorContextID = fundingOperatorContext(operatorContextID, projection)
	if projection.WLTReservationID == "" || operatorContextID == "" {
		return fmt.Errorf("coupon funding reservation or OperatorContext is missing")
	}
	if projection.Status == "committed" {
		return nil
	}
	correlationID = fundingCorrelation(correlationID, orderID)
	reservation, err := s.wlt.CommitPromotionFunding(ctx, projection.WLTReservationID, wltclient.PromotionFundingTransitionInput{
		OperatorContextID: operatorContextID,
		OrderID:           orderID,
	}, "dsh-promotion-funding-commit:"+projection.RedemptionID, correlationID)
	if err != nil {
		return err
	}
	if reservation.Status != "committed" || reservation.OperatorContextID != operatorContextID || reservation.OrderID == nil || *reservation.OrderID != orderID {
		return fmt.Errorf("WLT promotion funding commit response is invalid")
	}
	return coupons.MarkFundingProjection(ctx, s.db, projection.WLTReservationID, "committed")
}

func (s *protectedStoreServer) reverseCouponFunding(
	ctx context.Context,
	operatorContextID string,
	checkoutIntentID string,
	orderID string,
	reason string,
	correlationID string,
) error {
	projection, err := coupons.FundingByIntent(ctx, s.db, checkoutIntentID)
	if err != nil || projection == nil {
		return err
	}
	operatorContextID = fundingOperatorContext(operatorContextID, projection)
	if projection.WLTReservationID == "" || projection.Status == "reversed" {
		return nil
	}
	if operatorContextID == "" {
		return fmt.Errorf("coupon funding OperatorContext is missing")
	}
	if projection.Status != "committed" {
		return fmt.Errorf("only committed coupon funding can be reversed")
	}
	correlationID = fundingCorrelation(correlationID, orderID)
	reservation, err := s.wlt.ReversePromotionFunding(ctx, projection.WLTReservationID, wltclient.PromotionFundingTransitionInput{
		OperatorContextID: operatorContextID,
		OrderID:           orderID,
		Reason:            strings.TrimSpace(reason),
	}, "dsh-promotion-funding-reverse:"+projection.RedemptionID, correlationID)
	if err != nil {
		return err
	}
	if reservation.Status != "reversed" || reservation.OperatorContextID != operatorContextID {
		return fmt.Errorf("WLT promotion funding reversal response is invalid")
	}
	return coupons.MarkFundingProjection(ctx, s.db, projection.WLTReservationID, "reversed")
}
