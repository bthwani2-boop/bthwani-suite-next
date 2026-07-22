package coupons

import (
	"database/sql"
	"strings"

	wltclient "dsh-api/internal/wlt"
)

// FundingLifecycleDiagnostic is a read-only control-plane projection. DSH state
// is operational truth; WLT state is financial truth. No mutation credential or
// idempotency key is exposed.
type FundingLifecycleDiagnostic struct {
	RedemptionID             string `json:"redemptionId"`
	CouponID                 string `json:"couponId"`
	CheckoutIntentID         string `json:"checkoutIntentId"`
	TenantID                 string `json:"tenantId"`
	PartnerID                string `json:"partnerId,omitempty"`
	PlatformFundedMinorUnits int64  `json:"platformFundedMinorUnits"`
	PartnerFundedMinorUnits  int64  `json:"partnerFundedMinorUnits"`
	TotalDiscountMinorUnits  int64  `json:"totalDiscountMinorUnits"`
	Currency                 string `json:"currency"`
	DSHStatus                string `json:"dshStatus"`
	WLTReservationID         string `json:"wltReservationId,omitempty"`
	WLTStatus                string `json:"wltStatus,omitempty"`
	FailureCode              string `json:"failureCode,omitempty"`
	FundingUpdatedAt         string `json:"fundingUpdatedAt,omitempty"`
	LatestOutboxType         string `json:"latestOutboxType,omitempty"`
	LatestOutboxStatus       string `json:"latestOutboxStatus,omitempty"`
	LatestOutboxAttempts     int    `json:"latestOutboxAttempts"`
	LatestOutboxError        string `json:"latestOutboxError,omitempty"`
	LatestOutboxUpdatedAt    string `json:"latestOutboxUpdatedAt,omitempty"`
	ReconciliationStatus     string `json:"reconciliationStatus"`
	ReconciliationMessage    string `json:"reconciliationMessage,omitempty"`
}

func ListFundingLifecycleDiagnostics(db *sql.DB, limit int) ([]FundingLifecycleDiagnostic, error) {
	if db == nil {
		return nil, ErrInvalid
	}
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	rows, err := db.Query(`
		SELECT r.id::TEXT,r.coupon_id::TEXT,r.checkout_intent_id::TEXT,
		       COALESCE(r.funding_tenant_id,''),COALESCE(r.funding_partner_id,''),
		       r.platform_funded_minor_units,r.partner_funded_minor_units,
		       r.discount_minor_units,r.currency,r.funding_status,
		       COALESCE(r.wlt_funding_reservation_id,''),r.funding_failure_code,
		       COALESCE(r.funding_updated_at::TEXT,''),
		       COALESCE(outbox.event_type,''),COALESCE(outbox.status,''),
		       COALESCE(outbox.attempt_count,0),COALESCE(outbox.last_error,''),
		       COALESCE(outbox.updated_at::TEXT,'')
		FROM dsh_coupon_redemptions r
		LEFT JOIN LATERAL (
			SELECT event_type,status,attempt_count,last_error,updated_at
			FROM dsh_promotion_funding_outbox event
			WHERE event.coupon_redemption_id=r.id
			ORDER BY event.created_at DESC
			LIMIT 1
		) outbox ON TRUE
		WHERE r.funding_status <> 'not_required'
		ORDER BY r.funding_updated_at DESC NULLS LAST,r.created_at DESC
		LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := make([]FundingLifecycleDiagnostic, 0)
	for rows.Next() {
		var item FundingLifecycleDiagnostic
		if err := rows.Scan(
			&item.RedemptionID,
			&item.CouponID,
			&item.CheckoutIntentID,
			&item.TenantID,
			&item.PartnerID,
			&item.PlatformFundedMinorUnits,
			&item.PartnerFundedMinorUnits,
			&item.TotalDiscountMinorUnits,
			&item.Currency,
			&item.DSHStatus,
			&item.WLTReservationID,
			&item.FailureCode,
			&item.FundingUpdatedAt,
			&item.LatestOutboxType,
			&item.LatestOutboxStatus,
			&item.LatestOutboxAttempts,
			&item.LatestOutboxError,
			&item.LatestOutboxUpdatedAt,
		); err != nil {
			return nil, err
		}
		item.ReconciliationStatus = "not_checked"
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

// ReconcileFundingLifecycle compares the DSH operational projection with the
// sovereign WLT reservation returned through the authenticated service client.
func ReconcileFundingLifecycle(item *FundingLifecycleDiagnostic, reservation *wltclient.PromotionFundingReservation, readErr error) {
	if item == nil {
		return
	}
	if item.WLTReservationID == "" || item.TenantID == "" {
		if item.DSHStatus == "pending" || item.DSHStatus == "failed" {
			item.ReconciliationStatus = "incomplete"
			item.ReconciliationMessage = "DSH has no attached WLT reservation"
			return
		}
		item.ReconciliationStatus = "mismatch"
		item.ReconciliationMessage = "terminal DSH funding state is missing WLT identity"
		return
	}
	if readErr != nil || reservation == nil {
		item.ReconciliationStatus = "wlt_unavailable"
		item.ReconciliationMessage = "WLT readback failed"
		return
	}
	item.WLTStatus = strings.TrimSpace(reservation.Status)
	identityMatches := reservation.ID == item.WLTReservationID &&
		reservation.TenantID == item.TenantID &&
		reservation.CouponRedemptionID == item.RedemptionID &&
		reservation.CouponID == item.CouponID &&
		reservation.CheckoutIntentID == item.CheckoutIntentID
	amountsMatch := reservation.PlatformFundedMinorUnits == item.PlatformFundedMinorUnits &&
		reservation.PartnerFundedMinorUnits == item.PartnerFundedMinorUnits &&
		reservation.TotalDiscountMinorUnits == item.TotalDiscountMinorUnits &&
		reservation.Currency == item.Currency
	if !identityMatches || !amountsMatch || reservation.Status != item.DSHStatus {
		item.ReconciliationStatus = "mismatch"
		item.ReconciliationMessage = "DSH projection differs from sovereign WLT state"
		return
	}
	item.ReconciliationStatus = "reconciled"
	item.ReconciliationMessage = "DSH and WLT funding states match"
}
