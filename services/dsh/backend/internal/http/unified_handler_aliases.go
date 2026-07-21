package http

import (
	"net/http"

	"dsh-api/internal/analytics"
	"dsh-api/internal/clientaddress"
	"dsh-api/internal/store"
)

// Operational escalation and analytics aliases keep the unified route names
// mapped to governed implementations.
func (s *protectedStoreServer) handleResolveEscalation(w http.ResponseWriter, r *http.Request) {
	s.handleUpdateEscalation(w, r)
}

func (s *protectedStoreServer) handleGetOperationsAnalytics(w http.ResponseWriter, r *http.Request) {
	_, ok := s.requirePermission(w, r, "control-panel", AnalyticsPermissionRead, "operator")
	if !ok {
		return
	}
	period := r.URL.Query().Get("period")
	if period == "" {
		period = "today"
	}
	platform, err := analytics.GetPlatformKpis(s.db, period)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to compute operations analytics")
		return
	}
	integrity, err := clientaddress.DiagnoseIntegrity(r.Context(), s.db)
	if err != nil {
		store.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "failed to compute client address integrity diagnostics")
		return
	}
	store.SendJSON(w, http.StatusOK, map[string]any{
		"period":   period,
		"platform": platform,
		"clientAddressBook": map[string]any{
			"integrity": integrity,
			"operations": clientaddress.TelemetrySnapshot(),
		},
	})
}

func (s *protectedStoreServer) handleGetSupportAnalytics(w http.ResponseWriter, r *http.Request) {
	s.handleSupportAnalytics(w, r)
}

// Marketing aliases preserve the central marketing implementation while the
// router uses explicit surface-qualified names.
func (s *protectedStoreServer) handleArchiveCampaign(w http.ResponseWriter, r *http.Request) {
	s.handleDeleteCampaign(w, r)
}

func (s *protectedStoreServer) handleListMarketingTickers(w http.ResponseWriter, r *http.Request) {
	s.handleListTickers(w, r)
}

func (s *protectedStoreServer) handleCreateMarketingTicker(w http.ResponseWriter, r *http.Request) {
	s.handleCreateTicker(w, r)
}

func (s *protectedStoreServer) handleUpdateMarketingTicker(w http.ResponseWriter, r *http.Request) {
	s.handleUpdateTicker(w, r)
}

func (s *protectedStoreServer) handleDeleteMarketingTicker(w http.ResponseWriter, r *http.Request) {
	s.handleDeleteTicker(w, r)
}

func (s *protectedStoreServer) handleListPartnerSelfOffers(w http.ResponseWriter, r *http.Request) {
	s.handleListOwnPartnerOffers(w, r)
}

func (s *protectedStoreServer) handleListMarketingLoyaltyTiers(w http.ResponseWriter, r *http.Request) {
	s.handleListLoyaltyTiers(w, r)
}

func (s *protectedStoreServer) handleCreateMarketingLoyaltyTier(w http.ResponseWriter, r *http.Request) {
	s.handleCreateLoyaltyTier(w, r)
}

func (s *protectedStoreServer) handleUpdateMarketingLoyaltyTier(w http.ResponseWriter, r *http.Request) {
	s.handleUpdateLoyaltyTier(w, r)
}

func (s *protectedStoreServer) handleListMarketingSubscriptionPlans(w http.ResponseWriter, r *http.Request) {
	s.handleListSubscriptionPlans(w, r)
}

func (s *protectedStoreServer) handleCreateMarketingSubscriptionPlan(w http.ResponseWriter, r *http.Request) {
	s.handleCreateSubscriptionPlan(w, r)
}

func (s *protectedStoreServer) handleUpdateMarketingSubscriptionPlan(w http.ResponseWriter, r *http.Request) {
	s.handleUpdateSubscriptionPlan(w, r)
}

func (s *protectedStoreServer) handleCreateClientSubscriptionPurchase(w http.ResponseWriter, r *http.Request) {
	s.handleCreateSubscriptionPurchase(w, r)
}

func (s *protectedStoreServer) handleActivateClientSubscription(w http.ResponseWriter, r *http.Request) {
	s.handleActivateSubscriptionPurchase(w, r)
}

func (s *protectedStoreServer) handleClientBenefits(w http.ResponseWriter, r *http.Request) {
	s.handleGetClientBenefits(w, r)
}
