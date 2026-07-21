package http

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"dsh-api/internal/coupons"
	"dsh-api/internal/store"
)

func writeCouponError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, coupons.ErrNotFound):
		store.SendError(w, http.StatusNotFound, "NOT_FOUND", "coupon not found")
	case errors.Is(err, coupons.ErrVersionConflict):
		store.SendError(w, http.StatusConflict, "VERSION_CONFLICT", "coupon changed; reload before retrying")
	case errors.Is(err, coupons.ErrConflict):
		store.SendError(w, http.StatusConflict, "COUPON_CONFLICT", "coupon state or approval conflicts with this action")
	case errors.Is(err, coupons.ErrInactive):
		store.SendError(w, http.StatusConflict, "COUPON_INACTIVE", "coupon is inactive")
	case errors.Is(err, coupons.ErrNotEligible):
		store.SendError(w, http.StatusUnprocessableEntity, "COUPON_NOT_ELIGIBLE", "coupon is not eligible")
	case errors.Is(err, coupons.ErrUsageLimit):
		store.SendError(w, http.StatusConflict, "COUPON_USAGE_LIMIT", "coupon usage limit reached")
	case errors.Is(err, coupons.ErrFundingPolicy), errors.Is(err, coupons.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "coupon input or funding policy is invalid")
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "coupon action failed")
	}
}

func couponStringPointer(value string) *string {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	return &value
}

func couponOptionalString(value *string) *string {
	if value == nil {
		return nil
	}
	return couponStringPointer(*value)
}

func couponNullableStringUpdate(value *string) **string {
	if value == nil {
		return nil
	}
	normalized := couponStringPointer(*value)
	return &normalized
}

func couponTime(value string) (*time.Time, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil, nil
	}
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return nil, coupons.ErrInvalid
	}
	return &parsed, nil
}

func couponFundingPolicy(coupon coupons.GovernedCoupon) coupons.FundingPolicy {
	return coupons.FundingPolicy{
		CouponID: coupon.ID, FundingSource: coupon.FundingSource,
		PlatformShareBPS: coupon.PlatformShareBPS, FundingPartnerID: coupon.FundingPartnerID,
		Version: coupon.Version, UpdatedAt: coupon.UpdatedAt,
	}
}

func (s *protectedStoreServer) handleListCoupons(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", MarketingPermissionRead, "operator"); !ok {
		return
	}
	items, err := coupons.ListGoverned(s.db)
	if err != nil {
		writeCouponError(w, err)
		return
	}
	fundingPolicies := make(map[string]coupons.FundingPolicy, len(items))
	for _, item := range items {
		fundingPolicies[item.ID] = couponFundingPolicy(item)
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"coupons": items, "fundingPolicies": fundingPolicies,
	})
}

func (s *protectedStoreServer) handleCreateCoupon(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", MarketingPermissionManage, "operator")
	if !ok {
		return
	}
	var body struct {
		NameAr                   string   `json:"nameAr"`
		Description              string   `json:"description"`
		Code                     string   `json:"code"`
		StoreID                  *string  `json:"storeId"`
		DiscountType             string   `json:"discountType"`
		DiscountPercent          float64  `json:"discountPercent"`
		FixedDiscountMinorUnits  int64    `json:"fixedDiscountMinorUnits"`
		MaxDiscountMinorUnits    int64    `json:"maxDiscountMinorUnits"`
		MinSubtotalMinorUnits    int64    `json:"minSubtotalMinorUnits"`
		GlobalUsageLimit         int      `json:"globalUsageLimit"`
		PerClientUsageLimit      int      `json:"perClientUsageLimit"`
		EligibleFulfillmentModes []string `json:"eligibleFulfillmentModes"`
		FundingSource            string   `json:"fundingSource"`
		PlatformShareBPS         int      `json:"platformShareBps"`
		FundingPartnerID         *string  `json:"fundingPartnerId"`
		StartsAt                 string   `json:"startsAt"`
		EndsAt                   string   `json:"endsAt"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	startsAt, err := couponTime(body.StartsAt)
	if err != nil {
		writeCouponError(w, err)
		return
	}
	endsAt, err := couponTime(body.EndsAt)
	if err != nil {
		writeCouponError(w, err)
		return
	}
	issued, err := coupons.CreateGoverned(r.Context(), s.db, coupons.GovernedCreateInput{
		CreateInput: coupons.CreateInput{
			NameAr: body.NameAr, Description: body.Description, Code: body.Code,
			StoreID: couponOptionalString(body.StoreID), DiscountType: body.DiscountType,
			DiscountPercent: body.DiscountPercent, FixedDiscountMinorUnits: body.FixedDiscountMinorUnits,
			MaxDiscountMinorUnits: body.MaxDiscountMinorUnits, MinSubtotalMinorUnits: body.MinSubtotalMinorUnits,
			GlobalUsageLimit: body.GlobalUsageLimit, PerClientUsageLimit: body.PerClientUsageLimit,
			EligibleFulfillmentModes: body.EligibleFulfillmentModes,
			StartsAt:                 startsAt, EndsAt: endsAt, ActorID: actor.ID,
		},
		FundingSource: body.FundingSource, PlatformShareBPS: body.PlatformShareBPS,
		FundingPartnerID: couponOptionalString(body.FundingPartnerID),
	})
	if err != nil {
		writeCouponError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{
		"issued": issued, "fundingPolicy": couponFundingPolicy(issued.Coupon),
	})
}

func (s *protectedStoreServer) handleUpdateCoupon(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", MarketingPermissionManage, "operator")
	if !ok {
		return
	}
	var body struct {
		NameAr                   *string   `json:"nameAr"`
		Description              *string   `json:"description"`
		StoreID                  *string   `json:"storeId"`
		DiscountType             *string   `json:"discountType"`
		DiscountPercent          *float64  `json:"discountPercent"`
		FixedDiscountMinorUnits  *int64    `json:"fixedDiscountMinorUnits"`
		MaxDiscountMinorUnits    *int64    `json:"maxDiscountMinorUnits"`
		MinSubtotalMinorUnits    *int64    `json:"minSubtotalMinorUnits"`
		GlobalUsageLimit         *int      `json:"globalUsageLimit"`
		PerClientUsageLimit      *int      `json:"perClientUsageLimit"`
		EligibleFulfillmentModes *[]string `json:"eligibleFulfillmentModes"`
		FundingSource            *string   `json:"fundingSource"`
		PlatformShareBPS         *int      `json:"platformShareBps"`
		FundingPartnerID         *string   `json:"fundingPartnerId"`
		StartsAt                 *string   `json:"startsAt"`
		EndsAt                   *string   `json:"endsAt"`
		Status                   *string   `json:"status"`
		ExpectedVersion          int       `json:"expectedVersion"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	current, err := coupons.GetGoverned(s.db, r.PathValue("couponId"))
	if err != nil {
		writeCouponError(w, err)
		return
	}
	var startsAt **time.Time
	if body.StartsAt != nil {
		value, parseErr := couponTime(*body.StartsAt)
		if parseErr != nil {
			writeCouponError(w, parseErr)
			return
		}
		startsAt = &value
	}
	var endsAt **time.Time
	if body.EndsAt != nil {
		value, parseErr := couponTime(*body.EndsAt)
		if parseErr != nil {
			writeCouponError(w, parseErr)
			return
		}
		endsAt = &value
	}
	updated, err := coupons.UpdateGoverned(r.Context(), s.db, current.ID, coupons.GovernedUpdateInput{
		UpdateInput: coupons.UpdateInput{
			NameAr: body.NameAr, Description: body.Description, StoreID: couponNullableStringUpdate(body.StoreID),
			DiscountType: body.DiscountType, DiscountPercent: body.DiscountPercent,
			FixedDiscountMinorUnits: body.FixedDiscountMinorUnits, MaxDiscountMinorUnits: body.MaxDiscountMinorUnits,
			MinSubtotalMinorUnits: body.MinSubtotalMinorUnits, GlobalUsageLimit: body.GlobalUsageLimit,
			PerClientUsageLimit: body.PerClientUsageLimit, EligibleFulfillmentModes: body.EligibleFulfillmentModes,
			StartsAt: startsAt, EndsAt: endsAt, Status: body.Status,
			ExpectedVersion: body.ExpectedVersion, ActorID: actor.ID,
		},
		FundingSource: body.FundingSource, PlatformShareBPS: body.PlatformShareBPS,
		FundingPartnerID: couponNullableStringUpdate(body.FundingPartnerID),
	})
	if err != nil {
		writeCouponError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"coupon": updated, "fundingPolicy": couponFundingPolicy(updated),
	})
}
