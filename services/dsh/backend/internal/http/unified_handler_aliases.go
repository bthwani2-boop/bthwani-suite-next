package http

import "net/http"

// Operational escalation and analytics aliases keep the unified route names
// mapped to the existing governed implementations.
func (s *protectedStoreServer) handleResolveEscalation(w http.ResponseWriter, r *http.Request) {
	s.handleUpdateEscalation(w, r)
}

func (s *protectedStoreServer) handleGetOperationsAnalytics(w http.ResponseWriter, r *http.Request) {
	s.handlePlatformKpis(w, r)
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
	s.handlePurchaseSubscription(w, r)
}

func (s *protectedStoreServer) handleActivateClientSubscription(w http.ResponseWriter, r *http.Request) {
	s.handleActivateSubscription(w, r)
}

func (s *protectedStoreServer) handleClientBenefits(w http.ResponseWriter, r *http.Request) {
	s.handleGetClientBenefits(w, r)
}
