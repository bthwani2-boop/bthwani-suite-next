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
		store.SendError(w, http.StatusConflict, "COUPON_CONFLICT", "coupon state conflicts with this action")
	case errors.Is(err, coupons.ErrInactive):
		store.SendError(w, http.StatusConflict, "COUPON_INACTIVE", "coupon is inactive")
	case errors.Is(err, coupons.ErrNotEligible):
		store.SendError(w, http.StatusUnprocessableEntity, "COUPON_NOT_ELIGIBLE", "coupon is not eligible")
	case errors.Is(err, coupons.ErrUsageLimit):
		store.SendError(w, http.StatusConflict, "COUPON_USAGE_LIMIT", "coupon usage limit reached")
	case errors.Is(err, coupons.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "coupon input is invalid")
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

func (s *protectedStoreServer) handleListCoupons(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", MarketingPermissionRead, "operator"); !ok {
		return
	}
	items, err := coupons.List(s.db)
	if err != nil {
		writeCouponError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"coupons": items})
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
		StoreID                  string   `json:"storeId"`
		DiscountType             string   `json:"discountType"`
		DiscountPercent          float64  `json:"discountPercent"`
		FixedDiscountMinorUnits  int64    `json:"fixedDiscountMinorUnits"`
		MaxDiscountMinorUnits    int64    `json:"maxDiscountMinorUnits"`
		MinSubtotalMinorUnits    int64    `json:"minSubtotalMinorUnits"`
		GlobalUsageLimit         int      `json:"globalUsageLimit"`
		PerClientUsageLimit      int      `json:"perClientUsageLimit"`
		EligibleFulfillmentModes []string `json:"eligibleFulfillmentModes"`
		FundingSource            string   `json:"fundingSource"`
		PlatformShareBps         int      `json:"platformShareBps"`
		PartnerShareBps          int      `json:"partnerShareBps"`
		SponsorID                string   `json:"sponsorId"`
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
	issued, err := coupons.Create(s.db, coupons.CreateInput{
		NameAr: body.NameAr, Description: body.Description, Code: body.Code, StoreID: couponStringPointer(body.StoreID),
		DiscountType: body.DiscountType, DiscountPercent: body.DiscountPercent, FixedDiscountMinorUnits: body.FixedDiscountMinorUnits,
		MaxDiscountMinorUnits: body.MaxDiscountMinorUnits, MinSubtotalMinorUnits: body.MinSubtotalMinorUnits,
		GlobalUsageLimit: body.GlobalUsageLimit, PerClientUsageLimit: body.PerClientUsageLimit, EligibleFulfillmentModes: body.EligibleFulfillmentModes,
		FundingSource: body.FundingSource, PlatformShareBps: body.PlatformShareBps, PartnerShareBps: body.PartnerShareBps, SponsorID: couponStringPointer(body.SponsorID),
		StartsAt: startsAt, EndsAt: endsAt, ActorID: actor.ID,
	})
	if err != nil {
		writeCouponError(w, err)
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"issued": issued})
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
		PlatformShareBps         *int      `json:"platformShareBps"`
		PartnerShareBps          *int      `json:"partnerShareBps"`
		SponsorID                *string   `json:"sponsorId"`
		StartsAt                 *string   `json:"startsAt"`
		EndsAt                   *string   `json:"endsAt"`
		Status                   *string   `json:"status"`
		ExpectedVersion          int       `json:"expectedVersion"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	current, err := coupons.Get(s.db, r.PathValue("couponId"))
	if err != nil {
		writeCouponError(w, err)
		return
	}
	termsChanged := body.NameAr != nil || body.Description != nil || body.StoreID != nil || body.DiscountType != nil || body.DiscountPercent != nil || body.FixedDiscountMinorUnits != nil || body.MaxDiscountMinorUnits != nil || body.MinSubtotalMinorUnits != nil || body.GlobalUsageLimit != nil || body.PerClientUsageLimit != nil || body.EligibleFulfillmentModes != nil || body.FundingSource != nil || body.PlatformShareBps != nil || body.PartnerShareBps != nil || body.SponsorID != nil || body.StartsAt != nil || body.EndsAt != nil
	if current.Status == "active" && termsChanged {
		store.SendError(w, http.StatusConflict, "ACTIVE_COUPON_IMMUTABLE", "pause the active coupon before changing its terms")
		return
	}
	if body.Status != nil && *body.Status == "active" && current.CreatedByActorID == actor.ID {
		store.SendError(w, http.StatusConflict, "SEPARATION_OF_DUTIES_REQUIRED", "coupon creator cannot approve the same coupon")
		return
	}
	var storeID **string
	if body.StoreID != nil {
		value := couponStringPointer(*body.StoreID)
		storeID = &value
	}
	var sponsorID **string
	if body.SponsorID != nil {
		value := couponStringPointer(*body.SponsorID)
		sponsorID = &value
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
	updated, err := coupons.Update(s.db, current.ID, coupons.UpdateInput{
		NameAr: body.NameAr, Description: body.Description, StoreID: storeID, DiscountType: body.DiscountType, DiscountPercent: body.DiscountPercent,
		FixedDiscountMinorUnits: body.FixedDiscountMinorUnits, MaxDiscountMinorUnits: body.MaxDiscountMinorUnits, MinSubtotalMinorUnits: body.MinSubtotalMinorUnits,
		GlobalUsageLimit: body.GlobalUsageLimit, PerClientUsageLimit: body.PerClientUsageLimit, EligibleFulfillmentModes: body.EligibleFulfillmentModes,
		FundingSource: body.FundingSource, PlatformShareBps: body.PlatformShareBps, PartnerShareBps: body.PartnerShareBps, SponsorID: sponsorID,
		StartsAt: startsAt, EndsAt: endsAt, Status: body.Status, ExpectedVersion: body.ExpectedVersion, ActorID: actor.ID,
	})
	if err != nil {
		writeCouponError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"coupon": updated})
}
