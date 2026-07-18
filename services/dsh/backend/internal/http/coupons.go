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
	case errors.Is(err, coupons.ErrInvalid):
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "coupon input or funding policy is invalid")
	default:
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "coupon action failed")
	}
}

// GET /dsh/operator/marketing/coupons
func (s *protectedStoreServer) handleListCoupons(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requirePermission(w, r, "control-panel", MarketingPermissionRead, "operator"); !ok {
		return
	}
	items, err := coupons.List(s.db)
	if err != nil {
		writeCouponError(w, err)
		return
	}
	policies, err := coupons.ListFundingPolicies(r.Context(), s.db)
	if err != nil {
		writeCouponError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"coupons":         items,
		"fundingPolicies": policies,
	})
}

// POST /dsh/operator/marketing/coupons
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
		FundingSource            string   `json:"fundingSource"`
		PlatformShareBPS         int      `json:"platformShareBps"`
		FundingPartnerID         string   `json:"fundingPartnerId"`
		DiscountType             string   `json:"discountType"`
		DiscountPercent          float64  `json:"discountPercent"`
		FixedDiscountMinorUnits  int64    `json:"fixedDiscountMinorUnits"`
		MaxDiscountMinorUnits    int64    `json:"maxDiscountMinorUnits"`
		MinSubtotalMinorUnits    int64    `json:"minSubtotalMinorUnits"`
		GlobalUsageLimit         int      `json:"globalUsageLimit"`
		PerClientUsageLimit      int      `json:"perClientUsageLimit"`
		EligibleFulfillmentModes []string `json:"eligibleFulfillmentModes"`
		StartsAt                 string   `json:"startsAt"`
		EndsAt                   string   `json:"endsAt"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	var storeID *string
	if strings.TrimSpace(body.StoreID) != "" {
		value := strings.TrimSpace(body.StoreID)
		storeID = &value
	}
	startsAt, err := parseOptionalRFC3339(body.StartsAt)
	if err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "startsAt must be RFC3339")
		return
	}
	endsAt, err := parseOptionalRFC3339(body.EndsAt)
	if err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "endsAt must be RFC3339")
		return
	}
	issued, err := coupons.Create(s.db, coupons.CreateInput{
		NameAr: body.NameAr, Description: body.Description, Code: body.Code,
		StoreID: storeID, DiscountType: body.DiscountType,
		DiscountPercent: body.DiscountPercent,
		FixedDiscountMinorUnits: body.FixedDiscountMinorUnits,
		MaxDiscountMinorUnits: body.MaxDiscountMinorUnits,
		MinSubtotalMinorUnits: body.MinSubtotalMinorUnits,
		GlobalUsageLimit: body.GlobalUsageLimit,
		PerClientUsageLimit: body.PerClientUsageLimit,
		EligibleFulfillmentModes: body.EligibleFulfillmentModes,
		StartsAt: startsAt, EndsAt: endsAt, ActorID: actor.ID,
	})
	if err != nil {
		writeCouponError(w, err)
		return
	}

	fundingSource := strings.TrimSpace(body.FundingSource)
	if fundingSource == "" {
		fundingSource = "platform"
	}
	platformShareBPS := body.PlatformShareBPS
	if fundingSource == "platform" && platformShareBPS == 0 {
		platformShareBPS = 10000
	}
	var partnerID *string
	if strings.TrimSpace(body.FundingPartnerID) != "" {
		value := strings.TrimSpace(body.FundingPartnerID)
		partnerID = &value
	}
	policy, err := coupons.UpdateFundingPolicy(r.Context(), s.db, issued.Coupon.ID, coupons.UpdateFundingPolicyInput{
		FundingSource: fundingSource,
		PlatformShareBPS: platformShareBPS,
		FundingPartnerID: partnerID,
		ExpectedVersion: issued.Coupon.Version,
	})
	if err != nil {
		archived := "archived"
		_, _ = coupons.Update(s.db, issued.Coupon.ID, coupons.UpdateInput{
			Status: &archived,
			ExpectedVersion: issued.Coupon.Version,
			ActorID: actor.ID,
		})
		writeCouponError(w, err)
		return
	}
	current, err := coupons.Get(s.db, issued.Coupon.ID)
	if err != nil {
		writeCouponError(w, err)
		return
	}
	issued.Coupon = current
	store.SendJSON(w, http.StatusCreated, map[string]any{
		"issued": issued,
		"fundingPolicy": policy,
	})
}

// PATCH /dsh/operator/marketing/coupons/{couponId}
func (s *protectedStoreServer) handleUpdateCoupon(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", MarketingPermissionManage, "operator")
	if !ok {
		return
	}
	var body struct {
		NameAr                   *string   `json:"nameAr"`
		Description              *string   `json:"description"`
		StoreID                  *string   `json:"storeId"`
		FundingSource            *string   `json:"fundingSource"`
		PlatformShareBPS         *int      `json:"platformShareBps"`
		FundingPartnerID         *string   `json:"fundingPartnerId"`
		DiscountType             *string   `json:"discountType"`
		DiscountPercent          *float64  `json:"discountPercent"`
		FixedDiscountMinorUnits  *int64    `json:"fixedDiscountMinorUnits"`
		MaxDiscountMinorUnits    *int64    `json:"maxDiscountMinorUnits"`
		MinSubtotalMinorUnits    *int64    `json:"minSubtotalMinorUnits"`
		GlobalUsageLimit         *int      `json:"globalUsageLimit"`
		PerClientUsageLimit      *int      `json:"perClientUsageLimit"`
		EligibleFulfillmentModes *[]string `json:"eligibleFulfillmentModes"`
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
	commercialChanged := body.NameAr != nil || body.Description != nil || body.StoreID != nil ||
		body.DiscountType != nil || body.DiscountPercent != nil || body.FixedDiscountMinorUnits != nil ||
		body.MaxDiscountMinorUnits != nil || body.MinSubtotalMinorUnits != nil ||
		body.GlobalUsageLimit != nil || body.PerClientUsageLimit != nil ||
		body.EligibleFulfillmentModes != nil || body.StartsAt != nil || body.EndsAt != nil
	fundingChanged := body.FundingSource != nil || body.PlatformShareBPS != nil || body.FundingPartnerID != nil
	if fundingChanged && (commercialChanged || body.Status != nil) {
		store.SendError(w, http.StatusBadRequest, "MIXED_COUPON_UPDATE_FORBIDDEN", "update funding policy separately from coupon terms and status")
		return
	}
	if fundingChanged {
		currentPolicy, policyErr := coupons.GetFundingPolicy(r.Context(), s.db, current.ID)
		if policyErr != nil {
			writeCouponError(w, policyErr)
			return
		}
		source := currentPolicy.FundingSource
		shareBPS := currentPolicy.PlatformShareBPS
		partnerID := currentPolicy.FundingPartnerID
		if body.FundingSource != nil { source = strings.TrimSpace(*body.FundingSource) }
		if body.PlatformShareBPS != nil { shareBPS = *body.PlatformShareBPS }
		if body.FundingPartnerID != nil {
			value := strings.TrimSpace(*body.FundingPartnerID)
			if value == "" { partnerID = nil } else { partnerID = &value }
		}
		policy, policyErr := coupons.UpdateFundingPolicy(r.Context(), s.db, current.ID, coupons.UpdateFundingPolicyInput{
			FundingSource: source,
			PlatformShareBPS: shareBPS,
			FundingPartnerID: partnerID,
			ExpectedVersion: body.ExpectedVersion,
		})
		if policyErr != nil {
			writeCouponError(w, policyErr)
			return
		}
		updated, getErr := coupons.Get(s.db, current.ID)
		if getErr != nil {
			writeCouponError(w, getErr)
			return
		}
		store.SendJSON(w, http.StatusOK, map[string]any{"coupon": updated, "fundingPolicy": policy})
		return
	}
	if current.Status == "active" && commercialChanged {
		store.SendError(w, http.StatusConflict, "ACTIVE_COUPON_IMMUTABLE", "pause the coupon before changing commercial terms")
		return
	}
	if body.Status != nil && *body.Status == "active" && current.CreatedByActorID == actor.ID {
		store.SendError(w, http.StatusConflict, "SEPARATION_OF_DUTIES_REQUIRED", "coupon creator cannot approve the coupon")
		return
	}
	var storeID **string
	if body.StoreID != nil {
		var resolved *string
		if strings.TrimSpace(*body.StoreID) != "" {
			value := strings.TrimSpace(*body.StoreID)
			resolved = &value
		}
		storeID = &resolved
	}
	startsAt, err := parseOptionalRFC3339Pointer(body.StartsAt)
	if err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "startsAt must be RFC3339")
		return
	}
	endsAt, err := parseOptionalRFC3339Pointer(body.EndsAt)
	if err != nil {
		store.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", "endsAt must be RFC3339")
		return
	}
	updated, err := coupons.Update(s.db, current.ID, coupons.UpdateInput{
		NameAr: body.NameAr, Description: body.Description, StoreID: storeID,
		DiscountType: body.DiscountType, DiscountPercent: body.DiscountPercent,
		FixedDiscountMinorUnits: body.FixedDiscountMinorUnits,
		MaxDiscountMinorUnits: body.MaxDiscountMinorUnits,
		MinSubtotalMinorUnits: body.MinSubtotalMinorUnits,
		GlobalUsageLimit: body.GlobalUsageLimit, PerClientUsageLimit: body.PerClientUsageLimit,
		EligibleFulfillmentModes: body.EligibleFulfillmentModes,
		StartsAt: startsAt, EndsAt: endsAt, Status: body.Status,
		ExpectedVersion: body.ExpectedVersion, ActorID: actor.ID,
	})
	if err != nil {
		writeCouponError(w, err)
		return
	}
	policy, err := coupons.GetFundingPolicy(r.Context(), s.db, updated.ID)
	if err != nil {
		writeCouponError(w, err)
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"coupon": updated, "fundingPolicy": policy})
}

func parseOptionalRFC3339(value string) (*time.Time, error) {
	if strings.TrimSpace(value) == "" { return nil, nil }
	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil { return nil, err }
	parsed = parsed.UTC()
	return &parsed, nil
}

func parseOptionalRFC3339Pointer(value *string) (**time.Time, error) {
	if value == nil { return nil, nil }
	parsed, err := parseOptionalRFC3339(*value)
	if err != nil { return nil, err }
	return &parsed, nil
}
