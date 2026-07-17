package http

import (
	"errors"
	"net/http"
	"strings"

	"dsh-api/internal/marketing"
	"dsh-api/internal/store"
)

func writeCommercialProgramError(w http.ResponseWriter, err error, notFoundMessage string) {
	if errors.Is(err, marketing.ErrCommercialVersionConflict) {
		store.SendError(w, http.StatusConflict, "VERSION_CONFLICT", "commercial program version changed; reload before retrying")
		return
	}
	writeMarketingError(w, err, notFoundMessage)
}

func rejectActiveCommercialMutation(w http.ResponseWriter) {
	store.SendError(w, http.StatusConflict, "ACTIVE_PROGRAM_IMMUTABLE", "pause the active commercial program before changing its commercial terms")
}

func rejectCommercialSelfApproval(w http.ResponseWriter) {
	store.SendError(w, http.StatusConflict, "SEPARATION_OF_DUTIES_REQUIRED", "the actor who created the commercial program cannot approve or activate it")
}

// GET /dsh/operator/marketing/loyalty-tiers
func (s *protectedStoreServer) handleListLoyaltyTiers(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", MarketingPermissionRead, "operator")
	if !ok {
		return
	}
	tiers, err := marketing.ListLoyaltyTiers(s.db, false)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list loyalty tiers")
		return
	}
	summary, err := marketing.LoyaltySummary(s.db)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load loyalty summary")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"tiers": tiers, "summary": summary})
}

// POST /dsh/operator/marketing/loyalty-tiers
func (s *protectedStoreServer) handleCreateLoyaltyTier(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", MarketingPermissionManage, "operator")
	if !ok {
		return
	}
	var body struct {
		NameAr                   string  `json:"nameAr"`
		NameEn                   string  `json:"nameEn"`
		MinPoints                int64   `json:"minPoints"`
		DiscountPercent          float64 `json:"discountPercent"`
		FreeDeliveryThresholdYer int64   `json:"freeDeliveryThreshold"`
		Badge                    string  `json:"badge"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	tier, err := marketing.CreateLoyaltyTier(s.db, marketing.CreateLoyaltyTierInput{
		NameAr: body.NameAr,
		NameEn: body.NameEn,
		MinPoints: body.MinPoints,
		DiscountPercent: body.DiscountPercent,
		FreeDeliveryThresholdYer: body.FreeDeliveryThresholdYer,
		Badge: body.Badge,
		ActorID: actor.ID,
		CorrelationID: marketingCorrelationID(r),
	})
	if err != nil {
		writeCommercialProgramError(w, err, "loyalty tier not found")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"tier": tier})
}

// PATCH /dsh/operator/marketing/loyalty-tiers/{tierId}
func (s *protectedStoreServer) handleUpdateLoyaltyTier(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", MarketingPermissionManage, "operator")
	if !ok {
		return
	}
	var body struct {
		NameAr                   *string  `json:"nameAr"`
		NameEn                   *string  `json:"nameEn"`
		MinPoints                *int64   `json:"minPoints"`
		DiscountPercent          *float64 `json:"discountPercent"`
		FreeDeliveryThresholdYer *int64   `json:"freeDeliveryThreshold"`
		Badge                    *string  `json:"badge"`
		Status                   *string  `json:"status"`
		ExpectedVersion          int      `json:"expectedVersion"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}

	current, err := marketing.GetLoyaltyTier(s.db, r.PathValue("tierId"))
	if err != nil {
		writeCommercialProgramError(w, err, "loyalty tier not found")
		return
	}
	termsChanged := body.NameAr != nil || body.NameEn != nil || body.MinPoints != nil ||
		body.DiscountPercent != nil || body.FreeDeliveryThresholdYer != nil || body.Badge != nil
	if current.Status == "active" && termsChanged {
		rejectActiveCommercialMutation(w)
		return
	}
	if body.Status != nil && *body.Status == "active" && current.CreatedByActorID == actor.ID {
		rejectCommercialSelfApproval(w)
		return
	}

	tier, err := marketing.UpdateLoyaltyTier(s.db, r.PathValue("tierId"), marketing.UpdateLoyaltyTierInput{
		NameAr: body.NameAr,
		NameEn: body.NameEn,
		MinPoints: body.MinPoints,
		DiscountPercent: body.DiscountPercent,
		FreeDeliveryThresholdYer: body.FreeDeliveryThresholdYer,
		Badge: body.Badge,
		Status: body.Status,
		ExpectedVersion: body.ExpectedVersion,
		ActorID: actor.ID,
		CorrelationID: marketingCorrelationID(r),
	})
	if err != nil {
		writeCommercialProgramError(w, err, "loyalty tier not found")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"tier": tier})
}

// GET /dsh/operator/marketing/subscription-plans
func (s *protectedStoreServer) handleListSubscriptionPlans(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", MarketingPermissionRead, "operator")
	if !ok {
		return
	}
	plans, err := marketing.ListSubscriptionPlans(s.db, false)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list subscription plans")
		return
	}
	summary, err := marketing.SubscriptionSummary(s.db)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load subscription summary")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"plans": plans, "summary": summary})
}

// POST /dsh/operator/marketing/subscription-plans
func (s *protectedStoreServer) handleCreateSubscriptionPlan(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", MarketingPermissionManage, "operator")
	if !ok {
		return
	}
	var body struct {
		NameAr              string  `json:"nameAr"`
		NameEn              string  `json:"nameEn"`
		PriceYer            int64   `json:"priceYer"`
		BillingCycle        string  `json:"billingCycle"`
		IncludeFreeDelivery bool    `json:"includeFreeDelivery"`
		PointsMultiplier    float64 `json:"pointsMultiplier"`
		OrderCap            int     `json:"orderCap"`
		Badge               string  `json:"badge"`
		WLTProductReference string  `json:"wltProductReference"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}
	plan, err := marketing.CreateSubscriptionPlan(s.db, marketing.CreateSubscriptionPlanInput{
		NameAr: body.NameAr,
		NameEn: body.NameEn,
		PriceYer: body.PriceYer,
		BillingCycle: body.BillingCycle,
		IncludeFreeDelivery: body.IncludeFreeDelivery,
		PointsMultiplier: body.PointsMultiplier,
		OrderCap: body.OrderCap,
		Badge: body.Badge,
		WLTProductReference: body.WLTProductReference,
		ActorID: actor.ID,
		CorrelationID: marketingCorrelationID(r),
	})
	if err != nil {
		writeCommercialProgramError(w, err, "subscription plan not found")
		return
	}
	store.SendJSON(w, http.StatusCreated, map[string]any{"plan": plan})
}

// PATCH /dsh/operator/marketing/subscription-plans/{planId}
func (s *protectedStoreServer) handleUpdateSubscriptionPlan(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", MarketingPermissionManage, "operator")
	if !ok {
		return
	}
	var body struct {
		NameAr              *string  `json:"nameAr"`
		NameEn              *string  `json:"nameEn"`
		PriceYer            *int64   `json:"priceYer"`
		BillingCycle        *string  `json:"billingCycle"`
		IncludeFreeDelivery *bool    `json:"includeFreeDelivery"`
		PointsMultiplier    *float64 `json:"pointsMultiplier"`
		OrderCap            *int     `json:"orderCap"`
		Badge               *string  `json:"badge"`
		Status              *string  `json:"status"`
		WLTProductReference *string  `json:"wltProductReference"`
		ExpectedVersion     int      `json:"expectedVersion"`
	}
	if !decodeProtectedJSON(w, r, &body) {
		return
	}

	current, err := marketing.GetSubscriptionPlan(s.db, r.PathValue("planId"))
	if err != nil {
		writeCommercialProgramError(w, err, "subscription plan not found")
		return
	}
	termsChanged := body.NameAr != nil || body.NameEn != nil || body.PriceYer != nil ||
		body.BillingCycle != nil || body.IncludeFreeDelivery != nil || body.PointsMultiplier != nil ||
		body.OrderCap != nil || body.Badge != nil || body.WLTProductReference != nil
	if current.Status == "active" && termsChanged {
		rejectActiveCommercialMutation(w)
		return
	}
	if body.Status != nil && *body.Status == "active" {
		if current.CreatedByActorID == actor.ID {
			rejectCommercialSelfApproval(w)
			return
		}
		effectiveWLTReference := strings.TrimSpace(current.WLTProductReference)
		if body.WLTProductReference != nil {
			effectiveWLTReference = strings.TrimSpace(*body.WLTProductReference)
		}
		if effectiveWLTReference == "" {
			store.SendError(w, http.StatusConflict, "WLT_REFERENCE_REQUIRED", "a verified WLT product reference is required before activating a subscription plan")
			return
		}
	}

	plan, err := marketing.UpdateSubscriptionPlan(s.db, r.PathValue("planId"), marketing.UpdateSubscriptionPlanInput{
		NameAr: body.NameAr,
		NameEn: body.NameEn,
		PriceYer: body.PriceYer,
		BillingCycle: body.BillingCycle,
		IncludeFreeDelivery: body.IncludeFreeDelivery,
		PointsMultiplier: body.PointsMultiplier,
		OrderCap: body.OrderCap,
		Badge: body.Badge,
		Status: body.Status,
		WLTProductReference: body.WLTProductReference,
		ExpectedVersion: body.ExpectedVersion,
		ActorID: actor.ID,
		CorrelationID: marketingCorrelationID(r),
	})
	if err != nil {
		writeCommercialProgramError(w, err, "subscription plan not found")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"plan": plan})
}

// GET /dsh/client/benefits
// Only active loyalty tiers, active subscription plans and currently published
// partner offers are returned. Draft/review/paused content is never client-visible.
func (s *protectedStoreServer) handleGetClientBenefits(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok {
		return
	}
	benefits, err := marketing.GetClientBenefits(s.db, actor.ID)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load client benefits")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"benefits": benefits})
}
