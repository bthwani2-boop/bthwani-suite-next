package http

import (
	"errors"
	"net/http"
	"strings"

	"dsh-api/internal/marketing"
	"dsh-api/internal/store"
	wltclient "dsh-api/internal/wlt"
)

func writeCommercialProgramError(w http.ResponseWriter, err error, notFoundMessage string) {
	if errors.Is(err, marketing.ErrCommercialVersionConflict) {
		store.SendError(w, http.StatusConflict, "VERSION_CONFLICT", "commercial program version changed; reload before retrying")
		return
	}
	writeMarketingError(w, err, notFoundMessage)
}

func writeWLTCommercialError(w http.ResponseWriter, err error, operation string) {
	var httpErr *wltclient.CommercialHTTPError
	if errors.As(err, &httpErr) {
		switch httpErr.Status {
		case http.StatusBadRequest:
			store.SendError(w, http.StatusBadRequest, "WLT_INVALID_INPUT", httpErr.Message)
		case http.StatusNotFound:
			store.SendError(w, http.StatusConflict, "WLT_PRODUCT_NOT_FOUND", httpErr.Message)
		case http.StatusConflict:
			store.SendError(w, http.StatusConflict, httpErr.Code, httpErr.Message)
		case http.StatusForbidden:
			store.SendError(w, http.StatusServiceUnavailable, "WLT_MUTATION_NOT_ENABLED", httpErr.Message)
		default:
			store.SendError(w, http.StatusBadGateway, "WLT_COMMERCIAL_ERROR", httpErr.Message)
		}
		return
	}
	store.SendError(w, http.StatusBadGateway, "WLT_COMMERCIAL_UNAVAILABLE", operation+": "+err.Error())
}

func (s *protectedStoreServer) requireWLTCommercial(w http.ResponseWriter) bool {
	if s.wlt == nil || !s.wlt.Configured() {
		store.SendError(w, http.StatusServiceUnavailable, "WLT_NOT_CONFIGURED", "WLT commercial truth is required for this operation")
		return false
	}
	return true
}

func rejectActiveCommercialMutation(w http.ResponseWriter) {
	store.SendError(w, http.StatusConflict, "ACTIVE_PROGRAM_IMMUTABLE", "pause the active commercial program before changing its commercial terms")
}

func rejectCommercialSelfApproval(w http.ResponseWriter) {
	store.SendError(w, http.StatusConflict, "SEPARATION_OF_DUTIES_REQUIRED", "the actor who created the commercial program cannot approve or activate it")
}

func wltProductMatchesPlan(product *wltclient.CommercialProduct, plan marketing.SubscriptionPlan) bool {
	return product != nil &&
		product.Reference == plan.WLTProductReference &&
		product.DisplayName == plan.NameAr &&
		product.PriceMinorUnits == plan.PriceYer &&
		product.Currency == "YER" &&
		product.BillingCycle == plan.BillingCycle
}

func (s *protectedStoreServer) ensureWLTProduct(
	r *http.Request,
	plan marketing.SubscriptionPlan,
	actorID string,
) (*wltclient.CommercialProduct, error) {
	product, err := s.wlt.GetCommercialProduct(r.Context(), plan.WLTProductReference)
	if err != nil {
		var httpErr *wltclient.CommercialHTTPError
		if !errors.As(err, &httpErr) || httpErr.Status != http.StatusNotFound {
			return nil, err
		}
		creator := strings.TrimSpace(plan.CreatedByActorID)
		if creator == "" {
			creator = actorID
		}
		product, err = s.wlt.CreateCommercialProduct(r.Context(), wltclient.CreateCommercialProductInput{
			Reference:        plan.WLTProductReference,
			DisplayName:      plan.NameAr,
			PriceMinorUnits:  plan.PriceYer,
			Currency:         "YER",
			BillingCycle:     plan.BillingCycle,
			CreatedByActorID: creator,
		})
		if err != nil {
			return nil, err
		}
	}

	var update wltclient.UpdateCommercialProductInput
	update.ExpectedVersion = product.Version
	update.ActorID = actorID
	needsUpdate := false
	if product.DisplayName != plan.NameAr {
		value := plan.NameAr
		update.DisplayName = &value
		needsUpdate = true
	}
	if product.PriceMinorUnits != plan.PriceYer {
		value := plan.PriceYer
		update.PriceMinorUnits = &value
		needsUpdate = true
	}
	if product.Currency != "YER" {
		value := "YER"
		update.Currency = &value
		needsUpdate = true
	}
	if product.BillingCycle != plan.BillingCycle {
		value := plan.BillingCycle
		update.BillingCycle = &value
		needsUpdate = true
	}
	if product.Status != plan.Status {
		value := plan.Status
		update.Status = &value
		needsUpdate = true
	}
	if !needsUpdate {
		return product, nil
	}
	return s.wlt.UpdateCommercialProduct(r.Context(), plan.WLTProductReference, update)
}

// GET /dsh/operator/marketing/loyalty-tiers
func (s *protectedStoreServer) handleListLoyaltyTiers(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", MarketingPermissionRead, "operator")
	if !ok || !s.requireWLTCommercial(w) {
		return
	}
	tiers, err := marketing.ListLoyaltyTiers(s.db, false)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list loyalty tiers")
		return
	}
	wltSummary, err := s.wlt.GetCommercialSummary(r.Context())
	if err != nil {
		writeWLTCommercialError(w, err, "load WLT loyalty summary")
		return
	}
	summary := marketing.LoyaltyProgramSummary{
		ActiveTiers:           marketing.ActiveLoyaltyTierCount(tiers),
		TotalEnrolledClients:  wltSummary.LoyaltyAccounts,
		PointsIssuedThisMonth: wltSummary.PointsIssuedThisMonth,
		IsBackedByAPI:         true,
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
		NameAr:                   body.NameAr,
		NameEn:                   body.NameEn,
		MinPoints:                body.MinPoints,
		DiscountPercent:          body.DiscountPercent,
		FreeDeliveryThresholdYer: body.FreeDeliveryThresholdYer,
		Badge:                    body.Badge,
		ActorID:                  actor.ID,
		CorrelationID:            marketingCorrelationID(r),
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
		NameAr:                   body.NameAr,
		NameEn:                   body.NameEn,
		MinPoints:                body.MinPoints,
		DiscountPercent:          body.DiscountPercent,
		FreeDeliveryThresholdYer: body.FreeDeliveryThresholdYer,
		Badge:                    body.Badge,
		Status:                   body.Status,
		ExpectedVersion:          body.ExpectedVersion,
		ActorID:                  actor.ID,
		CorrelationID:            marketingCorrelationID(r),
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
	if !ok || !s.requireWLTCommercial(w) {
		return
	}
	plans, err := marketing.ListSubscriptionPlans(s.db, false)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to list subscription plans")
		return
	}
	wltSummary, err := s.wlt.GetCommercialSummary(r.Context())
	if err != nil {
		writeWLTCommercialError(w, err, "load WLT subscription summary")
		return
	}
	activePlans := marketing.ActiveSubscriptionPlanCount(plans)
	if wltSummary.ActiveProducts < activePlans {
		activePlans = wltSummary.ActiveProducts
	}
	summary := marketing.SubscriptionsSummary{
		ActivePlans:            activePlans,
		TotalActiveSubscribers: wltSummary.ActiveSubscriptions,
		MRR:                    wltSummary.MonthlyRecurringMinorUnits,
		IsBackedByAPI:          true,
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"plans": plans, "summary": summary})
}

// POST /dsh/operator/marketing/subscription-plans
func (s *protectedStoreServer) handleCreateSubscriptionPlan(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requirePermission(w, r, "control-panel", MarketingPermissionManage, "operator")
	if !ok || !s.requireWLTCommercial(w) {
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
	body.WLTProductReference = strings.TrimSpace(body.WLTProductReference)
	if body.WLTProductReference == "" {
		store.SendError(w, http.StatusBadRequest, "WLT_REFERENCE_REQUIRED", "a WLT product reference is required")
		return
	}
	if strings.TrimSpace(body.NameAr) == "" || body.PriceYer <= 0 ||
		(body.BillingCycle != "monthly" && body.BillingCycle != "quarterly" && body.BillingCycle != "annual") ||
		body.PointsMultiplier < 1 || body.OrderCap < 0 {
		store.SendError(w, http.StatusBadRequest, "INVALID_INPUT", "subscription plan terms are invalid")
		return
	}

	_, err := s.wlt.CreateCommercialProduct(r.Context(), wltclient.CreateCommercialProductInput{
		Reference:        body.WLTProductReference,
		DisplayName:      strings.TrimSpace(body.NameAr),
		PriceMinorUnits:  body.PriceYer,
		Currency:         "YER",
		BillingCycle:     body.BillingCycle,
		CreatedByActorID: actor.ID,
	})
	if err != nil {
		writeWLTCommercialError(w, err, "create WLT subscription product")
		return
	}

	plan, err := marketing.CreateSubscriptionPlan(s.db, marketing.CreateSubscriptionPlanInput{
		NameAr:              body.NameAr,
		NameEn:              body.NameEn,
		PriceYer:            body.PriceYer,
		BillingCycle:        body.BillingCycle,
		IncludeFreeDelivery: body.IncludeFreeDelivery,
		PointsMultiplier:    body.PointsMultiplier,
		OrderCap:            body.OrderCap,
		Badge:               body.Badge,
		WLTProductReference: body.WLTProductReference,
		ActorID:             actor.ID,
		CorrelationID:       marketingCorrelationID(r),
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
	if !ok || !s.requireWLTCommercial(w) {
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
	if body.WLTProductReference != nil && strings.TrimSpace(*body.WLTProductReference) != current.WLTProductReference {
		store.SendError(w, http.StatusConflict, "WLT_REFERENCE_IMMUTABLE", "create a new subscription plan to use a different WLT product reference")
		return
	}
	termsChanged := body.NameAr != nil || body.NameEn != nil || body.PriceYer != nil ||
		body.BillingCycle != nil || body.IncludeFreeDelivery != nil || body.PointsMultiplier != nil ||
		body.OrderCap != nil || body.Badge != nil
	if current.Status == "active" && termsChanged {
		rejectActiveCommercialMutation(w)
		return
	}
	if body.Status != nil && *body.Status == "active" && current.CreatedByActorID == actor.ID {
		rejectCommercialSelfApproval(w)
		return
	}

	desired := current
	if body.NameAr != nil {
		desired.NameAr = strings.TrimSpace(*body.NameAr)
	}
	if body.NameEn != nil {
		desired.NameEn = strings.TrimSpace(*body.NameEn)
	}
	if body.PriceYer != nil {
		desired.PriceYer = *body.PriceYer
	}
	if body.BillingCycle != nil {
		desired.BillingCycle = *body.BillingCycle
	}
	if body.IncludeFreeDelivery != nil {
		desired.IncludeFreeDelivery = *body.IncludeFreeDelivery
	}
	if body.PointsMultiplier != nil {
		desired.PointsMultiplier = *body.PointsMultiplier
	}
	if body.OrderCap != nil {
		desired.OrderCap = *body.OrderCap
	}
	if body.Badge != nil {
		desired.Badge = strings.TrimSpace(*body.Badge)
	}
	if body.Status != nil {
		desired.Status = *body.Status
	}
	if desired.WLTProductReference == "" {
		store.SendError(w, http.StatusConflict, "WLT_REFERENCE_REQUIRED", "subscription plan is not linked to WLT")
		return
	}

	if _, err := s.ensureWLTProduct(r, desired, actor.ID); err != nil {
		writeWLTCommercialError(w, err, "synchronize WLT subscription product")
		return
	}

	plan, err := marketing.UpdateSubscriptionPlan(s.db, r.PathValue("planId"), marketing.UpdateSubscriptionPlanInput{
		NameAr:              body.NameAr,
		NameEn:              body.NameEn,
		PriceYer:            body.PriceYer,
		BillingCycle:        body.BillingCycle,
		IncludeFreeDelivery: body.IncludeFreeDelivery,
		PointsMultiplier:    body.PointsMultiplier,
		OrderCap:            body.OrderCap,
		Badge:               body.Badge,
		Status:              body.Status,
		ExpectedVersion:     body.ExpectedVersion,
		ActorID:             actor.ID,
		CorrelationID:       marketingCorrelationID(r),
	})
	if err != nil {
		writeCommercialProgramError(w, err, "subscription plan not found")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{"plan": plan})
}

// GET /dsh/client/benefits
// DSH supplies marketing definitions and published offers. WLT supplies the
// authenticated client's points balance and paid subscription truth.
func (s *protectedStoreServer) handleGetClientBenefits(w http.ResponseWriter, r *http.Request) {
	actor, ok := s.requireActor(w, r, "client")
	if !ok || !s.requireWLTCommercial(w) {
		return
	}
	benefits, err := marketing.GetClientBenefitsCatalog(s.db)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to load DSH benefit definitions")
		return
	}
	truth, err := s.wlt.GetClientCommercialBenefits(r.Context(), actor.ID)
	if err != nil {
		writeWLTCommercialError(w, err, "load client benefit truth")
		return
	}

	verifiedPlans := make([]marketing.SubscriptionPlan, 0, len(benefits.AvailablePlans))
	for _, plan := range benefits.AvailablePlans {
		if plan.WLTProductReference == "" {
			continue
		}
		product, productErr := s.wlt.GetCommercialProduct(r.Context(), plan.WLTProductReference)
		if productErr != nil {
			var httpErr *wltclient.CommercialHTTPError
			if errors.As(productErr, &httpErr) && httpErr.Status == http.StatusNotFound {
				continue
			}
			writeWLTCommercialError(w, productErr, "verify client-visible WLT product")
			return
		}
		if product.Status == "active" && wltProductMatchesPlan(product, plan) {
			verifiedPlans = append(verifiedPlans, plan)
		}
	}
	benefits.AvailablePlans = verifiedPlans

	if truth.LoyaltyAccount != nil {
		account := &marketing.ClientLoyaltyAccount{
			PointsBalance:  truth.LoyaltyAccount.PointsBalance,
			LifetimePoints: truth.LoyaltyAccount.LifetimePoints,
		}
		if truth.LoyaltyAccount.TierReference != nil && strings.TrimSpace(*truth.LoyaltyAccount.TierReference) != "" {
			tier, tierErr := marketing.GetLoyaltyTier(s.db, *truth.LoyaltyAccount.TierReference)
			if tierErr != nil || tier.Status != "active" {
				store.SendError(w, http.StatusBadGateway, "BENEFIT_INTEGRITY_ERROR", "WLT loyalty tier reference is not an active DSH tier")
				return
			}
			account.Tier = &tier
		}
		benefits.LoyaltyAccount = account
	}

	if truth.ActiveSubscription != nil {
		plan, planErr := marketing.GetSubscriptionPlanByWLTReference(s.db, truth.ActiveSubscription.ProductReference)
		if planErr != nil {
			store.SendError(w, http.StatusBadGateway, "BENEFIT_INTEGRITY_ERROR", "WLT subscription is not linked to an active DSH plan")
			return
		}
		benefits.ActiveSubscription = &marketing.ClientSubscriptionEntitlement{
			ID:                       truth.ActiveSubscription.ID,
			Status:                   truth.ActiveSubscription.Status,
			WLTSubscriptionReference: truth.ActiveSubscription.ID,
			StartsAt:                 &truth.ActiveSubscription.StartsAt,
			EndsAt:                   truth.ActiveSubscription.EndsAt,
			Plan:                     plan,
		}
	}

	store.SendJSON(w, http.StatusOK, map[string]any{"benefits": benefits})
}
