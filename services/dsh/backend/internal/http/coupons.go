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
	case errors.Is(err, coupons.ErrFundingPolicy):
		store.SendError(w, http.StatusBadRequest, "INVALID_FUNDING_POLICY", "coupon funding shares or sponsor are invalid")
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

func resolvedFundingCreate(source string, platformShare, partnerShare int, sponsorID, fundingPartnerID string) (string, int, int, *string) {
	source = strings.TrimSpace(source)
	if source == "" {
		source = "platform"
	}
	if platformShare == 0 && partnerShare == 0 {
		switch source {
		case "platform":
			platformShare = 10000
		case "partner":
			partnerShare = 10000
		}
	}
	if partnerShare == 0 && platformShare > 0 && platformShare < 10000 {
		partnerShare = 10000 - platformShare
	}
	if platformShare == 0 && partnerShare > 0 && partnerShare < 10000 {
		platformShare = 10000 - partnerShare
	}
	sponsor := couponStringPointer(sponsorID)
	if sponsor == nil {
		sponsor = couponStringPointer(fundingPartnerID)
	}
	return source, platformShare, partnerShare, sponsor
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
		FundingPartnerID         string   `json:"fundingPartnerId"`
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
	fundingSource, platformShare, partnerShare, sponsorID := resolvedFundingCreate(
		body.FundingSource, body.PlatformShareBps, body.PartnerShareBps, body.SponsorID, body.FundingPartnerID,
	)
	issued, err := coupons.CreateGoverned(r.Context(), s.db, coupons.GovernedCreateInput{
		CreateInput: coupons.CreateInput{
			NameAr: body.NameAr, Description: body.Description, Code: body.Code,
			StoreID: couponStringPointer(body.StoreID), DiscountType: body.DiscountType,
			DiscountPercent: body.DiscountPercent, FixedDiscountMinorUnits: body.FixedDiscountMinorUnits,
			MaxDiscountMinorUnits: body.MaxDiscountMinorUnits, MinSubtotalMinorUnits: body.MinSubtotalMinorUnits,
			GlobalUsageLimit: body.GlobalUsageLimit, PerClientUsageLimit: body.PerClientUsageLimit,
			EligibleFulfillmentModes: body.EligibleFulfillmentModes,
			StartsAt:                 startsAt, EndsAt: endsAt, ActorID: actor.ID,
		},
		FundingSource: fundingSource, PlatformShareBps: platformShare,
		PartnerShareBps: partnerShare, SponsorID: sponsorID,
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
	var sponsorID **string
	if body.SponsorID != nil {
		sponsorID = couponNullableStringUpdate(body.SponsorID)
	} else if body.FundingPartnerID != nil {
		sponsorID = couponNullableStringUpdate(body.FundingPartnerID)
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
		FundingSource: body.FundingSource, PlatformShareBps: body.PlatformShareBps,
		PartnerShareBps: body.PartnerShareBps, SponsorID: sponsorID,
	})
	if err != nil {
		writeCouponError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"coupon": updated})
}
