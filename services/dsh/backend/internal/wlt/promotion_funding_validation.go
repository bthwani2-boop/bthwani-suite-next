package wlt

import (
	"fmt"
	"strings"
)

func validatePromotionFundingReserveResponse(
	reservation *PromotionFundingReservation,
	input ReservePromotionFundingInput,
) error {
	return validatePromotionFundingReserveResponseStatuses(reservation, input, "reserved")
}

func validatePromotionFundingReserveResponseStatuses(
	reservation *PromotionFundingReservation,
	input ReservePromotionFundingInput,
	allowedStatuses ...string,
) error {
	if reservation == nil || strings.TrimSpace(reservation.ID) == "" {
		return fmt.Errorf("WLT promotion funding response is missing reservation id")
	}
	partnerID := ""
	if reservation.PartnerID != nil {
		partnerID = strings.TrimSpace(*reservation.PartnerID)
	}
	expectedCurrency := strings.ToUpper(strings.TrimSpace(input.Currency))
	if expectedCurrency == "" {
		expectedCurrency = "YER"
	}
	statusAllowed := false
	for _, allowedStatus := range allowedStatuses {
		if reservation.Status == allowedStatus {
			statusAllowed = true
			break
		}
	}
	if reservation.OperatorContextID != strings.TrimSpace(input.OperatorContextID) ||
		reservation.ExternalReference != strings.TrimSpace(input.ExternalReference) ||
		reservation.CheckoutIntentID != strings.TrimSpace(input.CheckoutIntentID) ||
		reservation.CouponRedemptionID != strings.TrimSpace(input.CouponRedemptionID) ||
		reservation.CouponID != strings.TrimSpace(input.CouponID) ||
		reservation.ClientID != strings.TrimSpace(input.ClientID) ||
		partnerID != strings.TrimSpace(input.PartnerID) ||
		reservation.PlatformFundedMinorUnits != input.PlatformFundedMinorUnits ||
		reservation.PartnerFundedMinorUnits != input.PartnerFundedMinorUnits ||
		reservation.TotalDiscountMinorUnits != input.TotalDiscountMinorUnits ||
		reservation.Currency != expectedCurrency ||
		!statusAllowed {
		return fmt.Errorf("WLT promotion funding reserve response does not match the governed DSH request")
	}
	return nil
}

func validatePromotionFundingTransitionResponse(
	reservation *PromotionFundingReservation,
	reservationID string,
	action string,
	input PromotionFundingTransitionInput,
) error {
	if reservation == nil || reservation.ID != strings.TrimSpace(reservationID) {
		return fmt.Errorf("WLT promotion funding transition returned a different reservation")
	}
	if reservation.OperatorContextID != strings.TrimSpace(input.OperatorContextID) {
		return fmt.Errorf("WLT promotion funding transition returned a different OperatorContext")
	}
	expectedStatus := map[string]string{
		"commit":  "committed",
		"release": "released",
		"reverse": "reversed",
	}[action]
	if expectedStatus == "" || reservation.Status != expectedStatus {
		return fmt.Errorf("WLT promotion funding transition returned an unexpected state")
	}
	if action == "commit" || action == "reverse" {
		if reservation.OrderID == nil || *reservation.OrderID != strings.TrimSpace(input.OrderID) {
			return fmt.Errorf("WLT promotion funding transition returned a different order")
		}
	}
	return nil
}
