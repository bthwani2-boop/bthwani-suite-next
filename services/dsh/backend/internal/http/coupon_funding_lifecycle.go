package http

import (
	"context"
	"fmt"
	"strings"

	"dsh-api/internal/coupons"
	wltclient "dsh-api/internal/wlt"
)

func fundingCorrelation(correlationID, fallback string) string {
	if value := strings.TrimSpace(correlationID); value != "" {
		return value
	}
	return strings.TrimSpace(fallback)
}

func (s *protectedStoreServer) reserveCouponFunding(
	ctx context.Context,
	tenantID string,
	checkoutIntentID string,
	correlationID string,
) (*coupons.FundingProjection, error) {
	projection, err := coupons.PrepareFundingForIntent(ctx, s.db, checkoutIntentID)
	if err != nil || projection == nil {
		return projection, err
	}
	if projection.Status == "reserved" && projection.WLTReservationID != "" {
		return projection, nil
	}
	correlationID = fundingCorrelation(correlationID, checkoutIntentID)
	reservation, err := s.wlt.ReservePromotionFunding(ctx, wltclient.ReservePromotionFundingInput{
		TenantID:                 tenantID,
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
		_ = coupons.MarkFundingFailed(ctx, s.db, projection.RedemptionID, "wlt_reserve_failed")
		return nil, err
	}
	if reservation.CheckoutIntentID != projection.CheckoutIntentID ||
		reservation.CouponRedemptionID != projection.RedemptionID ||
		reservation.CouponID != projection.CouponID ||
		reservation.ClientID != projection.ClientActorID ||
		reservation.TotalDiscountMinorUnits != projection.TotalDiscountMinorUnits ||
		reservation.PlatformFundedMinorUnits != projection.PlatformFundedMinorUnits ||
		reservation.PartnerFundedMinorUnits != projection.PartnerFundedMinorUnits ||
		reservation.Currency != projection.Currency {
		_ = coupons.MarkFundingFailed(ctx, s.db, projection.RedemptionID, "wlt_reserve_mismatch")
		return nil, fmt.Errorf("WLT promotion funding response does not match DSH reservation")
	}
	if err := coupons.AttachWLTReservation(ctx, s.db, projection.RedemptionID, reservation.ID); err != nil {
		_, _ = s.wlt.ReleasePromotionFunding(ctx, reservation.ID, wltclient.PromotionFundingTransitionInput{
			TenantID: tenantID,
			Reason:   "dsh_projection_attach_failed",
		}, "dsh-promotion-funding-release:"+projection.RedemptionID+":attach", correlationID)
		_ = coupons.MarkFundingFailed(ctx, s.db, projection.RedemptionID, "dsh_projection_attach_failed")
		return nil, err
	}
	projection.WLTReservationID = reservation.ID
	projection.Status = "reserved"
	return projection, nil
}

func (s *protectedStoreServer) releaseCouponFunding(
	ctx context.Context,
	tenantID string,
	checkoutIntentID string,
	reason string,
	correlationID string,
) error {
	projection, err := coupons.FundingByIntent(ctx, s.db, checkoutIntentID)
	if err != nil || projection == nil {
		return err
	}
	if projection.WLTReservationID == "" || projection.Status == "released" || projection.Status == "reversed" {
		return nil
	}
	if projection.Status == "committed" {
		return fmt.Errorf("committed coupon funding cannot be released")
	}
	correlationID = fundingCorrelation(correlationID, checkoutIntentID)
	reservation, err := s.wlt.ReleasePromotionFunding(ctx, projection.WLTReservationID, wltclient.PromotionFundingTransitionInput{
		TenantID: tenantID,
		Reason:   strings.TrimSpace(reason),
	}, "dsh-promotion-funding-release:"+projection.RedemptionID+":"+strings.TrimSpace(reason), correlationID)
	if err != nil {
		return err
	}
	if reservation.Status != "released" {
		return fmt.Errorf("WLT promotion funding release returned %s", reservation.Status)
	}
	return coupons.MarkFundingProjection(ctx, s.db, projection.WLTReservationID, "released")
}

func (s *protectedStoreServer) commitCouponFunding(
	ctx context.Context,
	tenantID string,
	checkoutIntentID string,
	orderID string,
	correlationID string,
) error {
	projection, err := coupons.FundingByIntent(ctx, s.db, checkoutIntentID)
	if err != nil || projection == nil {
		return err
	}
	if projection.WLTReservationID == "" {
		return fmt.Errorf("coupon funding reservation is missing")
	}
	if projection.Status == "committed" {
		return nil
	}
	correlationID = fundingCorrelation(correlationID, orderID)
	reservation, err := s.wlt.CommitPromotionFunding(ctx, projection.WLTReservationID, wltclient.PromotionFundingTransitionInput{
		TenantID: tenantID,
		OrderID:  orderID,
	}, "dsh-promotion-funding-commit:"+projection.RedemptionID, correlationID)
	if err != nil {
		return err
	}
	if reservation.Status != "committed" || reservation.OrderID == nil || *reservation.OrderID != orderID {
		return fmt.Errorf("WLT promotion funding commit response is invalid")
	}
	return coupons.MarkFundingProjection(ctx, s.db, projection.WLTReservationID, "committed")
}

func (s *protectedStoreServer) reverseCouponFunding(
	ctx context.Context,
	tenantID string,
	checkoutIntentID string,
	orderID string,
	reason string,
	correlationID string,
) error {
	projection, err := coupons.FundingByIntent(ctx, s.db, checkoutIntentID)
	if err != nil || projection == nil {
		return err
	}
	if projection.WLTReservationID == "" || projection.Status == "reversed" {
		return nil
	}
	if projection.Status != "committed" {
		return fmt.Errorf("only committed coupon funding can be reversed")
	}
	correlationID = fundingCorrelation(correlationID, orderID)
	reservation, err := s.wlt.ReversePromotionFunding(ctx, projection.WLTReservationID, wltclient.PromotionFundingTransitionInput{
		TenantID: tenantID,
		OrderID:  orderID,
		Reason:   strings.TrimSpace(reason),
	}, "dsh-promotion-funding-reverse:"+projection.RedemptionID, correlationID)
	if err != nil {
		return err
	}
	if reservation.Status != "reversed" {
		return fmt.Errorf("WLT promotion funding reversal returned %s", reservation.Status)
	}
	return coupons.MarkFundingProjection(ctx, s.db, projection.WLTReservationID, "reversed")
}
