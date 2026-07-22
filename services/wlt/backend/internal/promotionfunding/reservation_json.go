package promotionfunding

import "encoding/json"

// MarshalJSON exposes only the governed promotion-funding contract. Internal
// idempotency keys, correlation identifiers, reasons, and processing timestamps
// remain WLT-owned audit data and are never returned to DSH or control-panel
// consumers.
func (reservation Reservation) MarshalJSON() ([]byte, error) {
	type governedReservation struct {
		ID                       string  `json:"id"`
		TenantID                 string  `json:"tenantId"`
		ExternalReference        string  `json:"externalReference"`
		CheckoutIntentID         string  `json:"checkoutIntentId"`
		CouponRedemptionID       string  `json:"couponRedemptionId"`
		CouponID                 string  `json:"couponId"`
		ClientID                 string  `json:"clientId"`
		PartnerID                *string `json:"partnerId,omitempty"`
		PlatformFundedMinorUnits int64   `json:"platformFundedMinorUnits"`
		PartnerFundedMinorUnits  int64   `json:"partnerFundedMinorUnits"`
		TotalDiscountMinorUnits  int64   `json:"totalDiscountMinorUnits"`
		Currency                 string  `json:"currency"`
		Status                   string  `json:"status"`
		OrderID                  *string `json:"orderId,omitempty"`
		CreatedAt                string  `json:"createdAt"`
		UpdatedAt                string  `json:"updatedAt"`
	}

	return json.Marshal(governedReservation{
		ID:                       reservation.ID,
		TenantID:                 reservation.TenantID,
		ExternalReference:        reservation.ExternalReference,
		CheckoutIntentID:         reservation.CheckoutIntentID,
		CouponRedemptionID:       reservation.CouponRedemptionID,
		CouponID:                 reservation.CouponID,
		ClientID:                 reservation.ClientID,
		PartnerID:                reservation.PartnerID,
		PlatformFundedMinorUnits: reservation.PlatformFundedMinorUnits,
		PartnerFundedMinorUnits:  reservation.PartnerFundedMinorUnits,
		TotalDiscountMinorUnits:  reservation.TotalDiscountMinorUnits,
		Currency:                 reservation.Currency,
		Status:                   reservation.Status,
		OrderID:                  reservation.OrderID,
		CreatedAt:                reservation.CreatedAt,
		UpdatedAt:                reservation.UpdatedAt,
	})
}
